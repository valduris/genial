use std::{time::Duration};
use dotenv::dotenv;
use actix_web::{http::header, Responder, web, App, HttpServer, delete, get, patch, post, HttpResponse, http::header::ContentType};
mod broadcast;
use actix_web::rt::time::interval;
// use tower_http::cors::{Any, CorsLayer};
use self::broadcast::Broadcaster;
use actix_web_lab::extract::Path;
use std::sync::Arc;
use std::env;
use std::ops::Deref;
use actix_cors::Cors;
use sqlx::postgres::{PgPoolOptions};
use sqlx::{FromRow, Pool, Postgres, Row};
use serde_json::json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub struct AppState {
    broadcaster: Arc<Broadcaster>,
    postgres_pool: Pool<Postgres>,
}

// 'created',
// 'started',
// 'finished',
// 'cancelled'

pub async fn sse_connect_client(state: web::Data<AppState>, Path(()): Path<()>) -> impl Responder {
    state.broadcaster.new_client().await
    // state.postgres_pool.broadcast(&msg).await;
    // let res = format!("dataq2 {}", _uuid.as_str());
    // let res2 = format!("hello {}", "world!").to_string();
    // println!("{}", uuid);
    // HttpResponse::Ok()
    //     .insert_header(("Content-Type", "text/event-stream"))
    //     .insert_header(("Cache-Control", "no-cache"))
    //     .insert_header(("Connection", "keep-alive"))
    //     .body("data: 123daataatatatat!\n")
}

#[get("/events")]
async fn event_stream(broadcaster: web::Data<Broadcaster>) -> impl Responder {
    broadcaster.new_client().await
}

// #[serde(rename = "updatedAt")]
// pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
#[derive(sqlx::FromRow, Debug, Serialize)]
struct ApiGame {
    uuid: String,
    name: String,
    boardSize: i32,
    playerCount: i32,
    showProgress: bool,
    status: String,
    players: Vec<String>,
}

pub async fn api_get_games(state: web::Data<AppState>) -> impl Responder {
    let query = r#"
        select
            g.name, g.uuid, g.board_size as "boardSize", g.player_count as "playerCount", g.status,
            g.show_progress as "showProgress", array_remove(array_agg(p.name), NULL) as players
        from game g
        left join player p on g.uuid = p.game_uuid
        group by g.id;
    "#;
    let rows: Vec<ApiGame> = sqlx::query_as(query).fetch_all(&state.postgres_pool).await.unwrap();
    // println!("{}", json!(rows));
    return HttpResponse::Ok().json(json!(rows));
}

#[derive(sqlx::FromRow, Debug, Serialize)]
struct ApiLobbyGame {
    uuid: String,
    name: String,
    boardSize: i32,
    playerCount: i32,
    showProgress: bool,
    status: String,
    players: Vec<ApiLobbyGamePlayer>,
}

#[derive(sqlx::FromRow, Debug, Serialize)]
struct ApiLobbyGamePlayer {
    name: String,
    id: i32,
    ready: bool,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiLobbyGameSchema {
    pub gameUuid: String,
}

pub async fn api_get_lobby_game(body: web::Json<ApiLobbyGameSchema>, state: web::Data<AppState>) -> impl Responder {
    let query = r#"
        select json_object_agg(uuid, players) game
        from (
            select g.uuid, json_build_object('ready', p.ready, 'uuid', p.uuid, 'name', p.name) players
            from game g
            join player p on g.uuid = p.game_uuid
            where g.uuid = $1
            group by g.uuid, p.ready, p.uuid, p.name
        ) players;
    "#;
    let rows: Vec<ApiGame> = sqlx::query_as(query).bind(body.gameUuid.clone()).fetch_all(&state.postgres_pool).await.unwrap();
    let message = json!(rows);
    // println!("{}", json!(rows));
    state.broadcaster.broadcast(message.as_str().unwrap()).await;
    return HttpResponse::Ok().json(message);
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateGameSchema {
    pub name: String,
    pub boardSize: i32,
    pub playerCount: i32,
    pub public: bool,
    pub showProgress: bool,
}

async fn api_game_create(body: web::Json<CreateGameSchema>, data: web::Data<AppState>) -> impl Responder {
    let uuid = Uuid::new_v4();
    let query_result  = sqlx::query(
        r#"INSERT INTO game (uuid, name, board_size, player_count, public, show_progress) VALUES ($1, $2, $3, $4, $5, $6)"#,
    )
        .bind(uuid)
        .bind(body.name.to_string())
        .bind(body.boardSize.clone())
        .bind(body.playerCount)
        .bind(body.public)
        .bind(body.showProgress)
        .execute(&data.postgres_pool)
        .await;

    data.broadcaster.broadcast("data: {\"type\": \"game_created\"}c").await;

    match query_result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({"status": "success","data": serde_json::json!({
                "note": "game",
                "name": body.name,
                "boardSize": body.boardSize,
                "playerCount": body.playerCount,
                "public": body.public,
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

    match result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({ "status": "success" }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({"status": "error","message": format!("{:?}", e)}));
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiPlayerReadySchema {
    pub playerUuid: String,
    pub ready: bool,
}

async fn api_player_ready_schema(body: web::Json<ApiPlayerRegisterSchema>, data: web::Data<AppState>) -> impl Responder {
    let uuid = Uuid::new_v4();
    let query = r#"UPDATE player SET ready = $1"#;
    let result  = sqlx::query(query)
        .bind(uuid).bind(body.name.clone()).bind(body.email.clone()).bind(body.password.clone())
        .execute(&data.postgres_pool)
        .await;

    match result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({ "status": "success" }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({"status": "error","message": format!("{:?}", e)}));
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GameJoinSchema {
    pub gameUuid: String,
    pub playerUuid: String,
}

async fn api_game_join(body: web::Json<GameJoinSchema>, data: web::Data<AppState>) -> impl Responder {
    println!("{}", body.playerUuid.clone());
    let query_result  = sqlx::query(r#"UPDATE player SET game_uuid = $1 WHERE uuid = $2"#)
        .bind(body.gameUuid.clone())
        .bind(body.playerUuid.clone())
        .execute(&data.postgres_pool)
        .await;

    data.broadcaster.broadcast("data: {\"type\": \"player_joined_game\"}\n").await;

    match query_result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({ "status": "success" }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({"status": "error","message": format!("{:?}", e)}));
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GameLeaveSchema {
    pub playerUuid: String,
}

async fn api_game_leave(body: web::Json<GameLeaveSchema>, data: web::Data<AppState>) -> impl Responder {
    println!("{}", body.playerUuid.clone());
    let query_result  = sqlx::query(r#"UPDATE player SET game_uuid = NULL WHERE uuid = $1"#)
        .bind(body.playerUuid.clone())
        .execute(&data.postgres_pool)
        .await;

    data.broadcaster.broadcast("{\"type\": \"player_left_game\"}").await;

    match query_result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({ "status": "success" }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({"status": "error","message": format!("{:?}", e)}));
        }
    }
}

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
            .route("/events", web::get().to(sse_connect_client))
            .route("/api/games", web::get().to(api_get_games))
            .route("/api/game", web::post().to(api_game_create))
            .route("/api/game/join", web::post().to(api_game_join))
            .route("/api/game/leave", web::post().to(api_game_leave))
            .route("/api/lobby_game", web::post().to(api_get_lobby_game))
            .route("/api/player/register", web::post().to(api_player_register))
            .route("/api/player/placeHexy", web::post().to(api_player_register))
    })
    .bind(format!("{}:{}", "127.0.0.1", "8080"))?
    .run()
    .await
}
