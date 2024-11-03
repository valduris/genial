use std::fs::File;
use std::io::{BufWriter, Write};
use std::fs::OpenOptions;
use std::io::prelude::*;
use std::fmt;
use std::{time::Duration};
use std::collections::HashMap;
use dotenv::dotenv;
use actix_web::{http::header, Responder, web, App, HttpServer, get, delete, patch, post, HttpResponse, http::header::ContentType};
use actix_web::{error::ResponseError, http::StatusCode};
use actix_web::rt::time::interval;
use self::broadcast::Broadcaster;
use self::types::{BoardSize};
use actix_web_lab::extract::Path;
use std::sync::Arc;
use std::env;
use std::ops::Deref;
use actix_cors::Cors;
use sqlx::postgres::{PgPoolOptions, PgQueryResult};
use sqlx::{Error, FromRow, Pool, Postgres, Row};
use serde_json::json;
use serde::{Deserialize, Serialize};
use sqlx::types::JsonValue;
use uuid::Uuid;

mod broadcast;
mod types;

pub struct AppState {
    broadcaster: Arc<Broadcaster>,
    postgres_pool: Pool<Postgres>,
}

// 'created', // 'started', // 'finished', // 'cancelled'
pub async fn sse_connect_client(state: web::Data<AppState>, Path(uuid): Path<String>) -> impl Responder {
    state.broadcaster.new_client(uuid).await
}

// pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
#[derive(sqlx::FromRow, Debug, Serialize)]
struct ApiGame {
    uuid: String,
    name: String,
    boardSize: i32,
    playerCount: i32,
    showProgress: bool,
    status: String,
    players: Vec<serde_json::Value>,
}

pub async fn api_get_games(state: web::Data<AppState>) -> impl Responder {
    let query = r#"
        SELECT
            g.name, g.uuid, g.board_size AS "boardSize", g.player_count AS "playerCount", g.status,
            g.show_progress AS "showProgress", COALESCE(array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) FILTER (WHERE p.id IS NOT NULL), '{}') players
        FROM game g
        LEFT JOIN player p ON g.uuid = p.game_uuid
        GROUP BY g.id;
    "#;
    let rows: Vec<ApiGame> = sqlx::query_as(query).fetch_all(&state.postgres_pool).await.unwrap();
    return HttpResponse::Ok().json(json!(rows));
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiLobbyGameSchema {
    pub gameUuid: String,
}

pub async fn api_get_lobby_game(body: web::Json<ApiLobbyGameSchema>, state: web::Data<AppState>) -> impl Responder {
    let rows: Vec<ApiGame> = sqlx::query_as(r#"
        select json_build_object(uuid, players) as game
        from (
            select g.uuid as uuid, array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) players
            from game g
            join player p on g.uuid = p.game_uuid
            where g.uuid = $1
            group by g.uuid
        ) players;
    "#).bind(body.gameUuid.clone()).fetch_all(&state.postgres_pool).await.unwrap();

    return HttpResponse::Ok().json(json!(rows));
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateGameSchema {
    pub name: String,
    pub boardSize: i32,
    pub playerCount: i32,
    pub showProgress: bool,
}

async fn api_game_create(body: web::Json<CreateGameSchema>, data: web::Data<AppState>) -> impl Responder {
    let uuid = Uuid::new_v4();
    let query_result  = sqlx::query(
        r#"INSERT INTO game (uuid, name, board_size, player_count, show_progress) VALUES ($1, $2, $3, $4, $5)"#,
    )
        .bind(uuid)
        .bind(body.name.to_string())
        .bind(body.boardSize.clone())
        .bind(body.playerCount)
        .bind(body.showProgress)
        .execute(&data.postgres_pool)
        .await;

    data.broadcaster.broadcast(json!({ "type": "game_created" }).to_string().as_str()).await;

    match query_result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({"status": "success","data": serde_json::json!({
                "name": body.name,
                "boardSize": body.boardSize,
                "playerCount": body.playerCount,
                "uuid": uuid,
                "showProgress": body.showProgress
            })}));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({"status": "error","message": format!("{:?}", e)}));
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiPlayerRegisterSchema {
    pub name: String,
    pub email: String,
    pub password: String,
}

async fn api_player_register(body: web::Json<ApiPlayerRegisterSchema>, data: web::Data<AppState>) -> impl Responder {
    let uuid = Uuid::new_v4();
    let query = r#"INSERT INTO player (uuid, name, email, password) VALUES ($1, $2, $3, $4)"#;
    let result  = sqlx::query(query)
        .bind(uuid).bind(body.name.clone()).bind(body.email.clone()).bind(body.password.clone())
        .execute(&data.postgres_pool)
        .await;

    return handle_postgres_query_result(result);
}

fn handle_postgres_query_result(result: Result<PgQueryResult, Error>) -> HttpResponse {
    match result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({ "status": "success" }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({ "status": "error","message": format!("{:?}", e)}));
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiPlayerReadySchema {
    pub playerUuid: String,
    pub ready: bool,
}

async fn api_lobby_player_ready(body: web::Json<ApiPlayerReadySchema>, data: web::Data<AppState>) -> impl Responder {
    let query = r#"UPDATE player SET ready = $1 WHERE uuid = $2"#;
    let result  = sqlx::query(query)
        .bind(body.ready)
        .bind(body.playerUuid.clone())
        .execute(&data.postgres_pool)
        .await;

    let row: ApiLobbyGame = sqlx::query_as(r#"
        SELECT g.uuid AS game_uuid, COALESCE(array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) FILTER (WHERE p.id IS NOT NULL), '{}') AS players
        FROM game g
        LEFT JOIN player p ON g.uuid = p.game_uuid
        GROUP BY g.uuid
    "#).fetch_one(&data.postgres_pool).await.unwrap();

    data.broadcaster.broadcast(json!({ "type": "player_joined", "value": row }).to_string().as_str()).await;

    return handle_postgres_query_result(result);
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GameJoinSchema {
    pub gameUuid: String,
    pub playerUuid: String,
}

#[derive(sqlx::FromRow, Debug, Serialize)]
struct ApiLobbyGame {
    players: Vec<serde_json::Value>,
    #[serde(rename(serialize = "gameUuid"))]
    game_uuid: String,
}

async fn api_lobby_game_join(body: web::Json<GameJoinSchema>, data: web::Data<AppState>) -> impl Responder {
    let result  = sqlx::query(r#"INSERT INTO player (uuid, game_uuid) VALUES ($1, $2) ON CONFLICT (uuid) DO UPDATE SET game_uuid = $2"#)
        .bind(body.playerUuid.clone())
        .bind(body.gameUuid.clone())
        .execute(&data.postgres_pool)
        .await;

    let row: Vec<ApiLobbyGame> = sqlx::query_as(r#"
        SELECT g.uuid AS game_uuid, COALESCE(array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) FILTER (WHERE p.id IS NOT NULL), '{}') AS players
        FROM game g
        LEFT JOIN player p on g.uuid = p.game_uuid
        GROUP BY g.uuid
    "#).bind(body.gameUuid.clone()).fetch_all(&data.postgres_pool).await.unwrap();

    // println!("{:?}", row);

    data.broadcaster.broadcast(json!({ "type": "player_joined", "value": row }).to_string().as_str()).await;

    return handle_postgres_query_result(result);
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GameLeaveSchema {
    pub playerUuid: String,
    pub gameUuid: String,
}

async fn api_lobby_game_leave(body: web::Json<GameLeaveSchema>, data: web::Data<AppState>) -> impl Responder {
    let query_result = sqlx::query(r#"UPDATE player SET game_uuid = NULL, ready = FALSE WHERE uuid = $1"#)
        .bind(body.playerUuid.clone())
        .execute(&data.postgres_pool)
        .await;

    let row: ApiLobbyGame = sqlx::query_as(r#"
        select uuid as game_uuid, players
        from (
            select g.uuid as uuid, array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) players
            from game g
            join player p on g.uuid = p.game_uuid
            where g.uuid = $1
            group by g.uuid
        ) players;
    "#).bind(body.gameUuid.clone()).fetch_one(&data.postgres_pool).await.unwrap();

    data.broadcaster.broadcast(json!({ "type": "player_left", "value": row }).to_string().as_str()).await;

    return handle_postgres_query_result(query_result);
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GamePlaceHexySchema {
    pub playerUuid: String,
    pub hexyPairIndex: u8,
}

pub fn error_log(s: String) {
    let mut file = OpenOptions::new().create_new(true).write(true).append(true).open("./error.log").unwrap();

    if let Err(e) = writeln!(file, "{}", s) {
        eprintln!("Couldn't write to file: {}", e);
    }
}

// https://github.com/laurentpayot/minidenticons

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    let broadcaster = Broadcaster::create();
    let db_connection_str = env::var("DATABASE_URL").expect("$DATABASE_URL is not set");
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&db_connection_str)
        .await
        .expect("can't connect to database");


    let bs: Option<BoardSize> = BoardSize::new(78);
    // let mut conn = pool.acquire().await.expect("Could not acquire connection pool");

    // actix_web::rt::spawn(async move {
    //     let mut interval = interval(Duration::from_secs(2));

        // loop {
        //     interval.tick().await;
            // &broadcaster.broadcast("data: mydata!!!").await;
        // }
    // });

    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_methods(vec!["GET", "POST", "PATCH", "DELETE"])
            .allowed_headers(vec![
                header::CONTENT_TYPE,
                header::AUTHORIZATION,
                header::ACCEPT,
            ]);
        App::new()
            // .app_data(web::Data::new(AppState { db: pool.clone() }))
            .app_data(web::Data::new(AppState {
                broadcaster: Arc::clone(&broadcaster),
                postgres_pool: pool.clone(),
            }))
            .wrap(cors)
            .route("/events/{uuid}", web::get().to(sse_connect_client))
            .route("/api/games", web::get().to(api_get_games))
            .route("/api/game", web::post().to(api_game_create))
            .route("/api/game/join", web::post().to(api_lobby_game_join))
            .route("/api/game/leave", web::post().to(api_lobby_game_leave))
            .route("/api/lobby_game", web::post().to(api_get_lobby_game))
            .route("/api/player/register", web::post().to(api_player_register))
            // .route("/api/player/placeHexy", web::post().to(api_player))
            .route("/api/game/ready", web::post().to(api_lobby_player_ready))
    })
    .bind(format!("{}:{}", "127.0.0.1", "8080"))?
    .run()
    .await
}
