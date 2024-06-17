use std::{time::Duration};
use dotenv::dotenv;
use actix_web::{http::header, Responder, web, App, HttpServer, delete, get, patch, post, HttpResponse};
mod broadcast;
// use tower_http::cors::{Any, CorsLayer};
use self::broadcast::Broadcaster;
use actix_web_lab::extract::Path;
use std::sync::Arc;
use std::env;
use actix_cors::Cors;
use sqlx::postgres::{PgPoolOptions};
use sqlx::{FromRow, Pool, Postgres};
use serde_json::json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize, Debug)]
pub struct FilterOptions {
    pub page: Option<usize>,
    pub limit: Option<usize>,
}

#[derive(Deserialize, Debug)]
pub struct ParamOptions {
    pub id: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateGameSchema {
    pub name: String,
    pub boardSize: i32,
    pub playerCount: i32,
    pub public: bool,
    pub showProgress: bool,
}

pub struct AppState {
    broadcaster: Arc<Broadcaster>,
    postgres_pool: Pool<Postgres>,
}

pub async fn sse_client(state: web::Data<AppState>) -> impl Responder {
    println!("in api");
    state.broadcaster.new_client().await
}

pub async fn broadcast_msg(
    state: web::Data<AppState>,
    Path((msg,)): Path<(String,)>,
) -> impl Responder {
    state.broadcaster.broadcast(&msg).await;
    HttpResponse::Ok().body("msg sent")
}

#[derive(Deserialize, sqlx::FromRow)]
pub struct ApiGetGames {
    name: String,
    // board_size: i32,
    // player_count: i32,
    // public: bool,
    // show_progress: bool,
}

#[derive(sqlx::FromRow, Debug)] // sqlx::postgres::PgRow
struct SomeId {
    id: i32,
}

pub async fn api_get_games(state: web::Data<AppState>) -> impl Responder {
    let row = sqlx::query_as::<_, SomeId>("select * from game")
        .fetch_all(&state.postgres_pool)
        .await
        .unwrap();
    // let one: i32 = row.get("id").unwrap();
    println!("{:?}", row);
    HttpResponse::Ok().body("msg sent!!")
    // let mut conn = state.postgres_pool.acquire().await.expect("Could not acquire connection pool #2");
    // let mut games = sqlx::query_as::<_, ApiGetGames>(r#"SELECT name FROM game;"#).fetch_all(&state.postgres_pool);
    // games.for_each(|game| println!("{:#?}", game));
    // state.postgres_pool.broadcast(&msg).await;
}

// #[derive(Debug, FromRow, Deserialize, Serialize)]
// #[allow(non_snake_case)]
// pub struct GameModel {
//     pub name: String,
//     pub public: bool,
//     pub showProgress: bool,
//     pub boardSize: i8,
//     pub playerCount: i8,
//     // #[serde(rename = "createdAt")]
//     // pub created_at: Option<chrono::DateTime<chrono::Utc>>,
//     // #[serde(rename = "updatedAt")]
//     // pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
// }

async fn api_game_create(
    body: web::Json<CreateGameSchema>,
    data: web::Data<AppState>,
) -> impl Responder {
    // Result<(String, String, i8, i8, bool, bool),_>
    let uuid = Uuid::new_v4();
    let query_result  = sqlx::query(
        r#"INSERT INTO game (uuid, name, "boardSize", "playerCount", public, "showProgress") VALUES ($1, $2, $3, $4, $5, $6)"#,
    )
        .bind(uuid)
        .bind(body.name.to_string())
        .bind(body.boardSize.clone())
        .bind(body.playerCount)
        .bind(body.public)
        .bind(body.showProgress)
        .execute(&data.postgres_pool)
        .await;

    // data.broadcaster.broadcast(serde_json::json!({
    //     "type"
    // })

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
            // This route is used to listen events/ sse events
            .route("/events{_:/?}", web::get().to(sse_client))
            // This route will create notification
            .route("/events/{msg}", web::get().to(broadcast_msg))
            .route("/api/games", web::get().to(api_get_games))
            .route("/api/game", web::post().to(api_game_create))
    })
    .bind(format!("{}:{}", "127.0.0.1", "8080"))?
    .run()
    .await
}
