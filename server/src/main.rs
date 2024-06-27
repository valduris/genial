use std::{time::Duration};
use dotenv::dotenv;
use actix_web::{http::header, Responder, web, App, HttpServer, delete, get, patch, post, HttpResponse, http::header::ContentType};
mod broadcast;
// use tower_http::cors::{Any, CorsLayer};
use self::broadcast::Broadcaster;
use actix_web_lab::extract::Path;
use std::sync::Arc;
use std::env;
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

pub async fn sse_connect_client(state: web::Data<AppState>, Path((_uuid,)): Path<(String,)>) -> impl Responder {
    state.broadcaster.new_client().await;
    // state.postgres_pool.broadcast(&msg).await;
    HttpResponse::Ok()
        .insert_header(("Content-Type", "text/event-stream"))
        .insert_header(("Cache-Control", "no-cache"))
        .body("data")
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

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateGameSchema {
    pub name: String,
    pub board_size: i32,
    pub player_count: i32,
    pub public: bool,
    pub show_progress: bool,
}

async fn api_game_create(body: web::Json<CreateGameSchema>, data: web::Data<AppState>) -> impl Responder {
    let uuid = Uuid::new_v4();
    let query_result  = sqlx::query(
        r#"INSERT INTO game (uuid, name, board_size, player_count, public, show_progress) VALUES ($1, $2, $3, $4, $5, $6)"#,
    )
        .bind(uuid)
        .bind(body.name.to_string())
        .bind(body.board_size.clone())
        .bind(body.player_count)
        .bind(body.public)
        .bind(body.show_progress)
        .execute(&data.postgres_pool)
        .await;

    data.broadcaster.broadcast("{\"type\": \"game_created\"}");

    match query_result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({"status": "success","data": serde_json::json!({
                "note": "game",
                "name": body.name,
                "boardSize": body.board_size,
                "playerCount": body.player_count,
                "public": body.public,
                "uuid": uuid,
                "showProgress": body.show_progress
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

    data.broadcaster.broadcast("{\"type\": \"player_joined_game\"}");

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
            .route("/api/game/join", web::post().to(api_game_join))
            .route("/api/player/register", web::post().to(api_player_register))
    })
    .bind(format!("{}:{}", "127.0.0.1", "8080"))?
    .run()
    .await
}
