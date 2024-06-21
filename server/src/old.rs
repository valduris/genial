use axum::{
    async_trait,
    extract::{FromRef, FromRequestParts, State},
    http::{request::Parts, StatusCode},
    routing::{get, post},
    Router, Json,
};
use tower_http::cors::{Any, CorsLayer};
use sqlx::postgres::{PgPool, PgPoolOptions};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use serde::Deserialize;
use std::env;
use std::{net::SocketAddr, time::Duration};
use dotenv::dotenv;
use uuid::Uuid;

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "example_tokio_postgres=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // "postgresql://genial:genial@localhost:5432/genial?schema=public"
    let db_connection_str = env::var("DATABASE_URL").expect("$DATABASE_URL is not set");

    let cors = CorsLayer::new()
        .allow_headers(Any)
        .allow_methods(Any)
        .allow_origin(Any);

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&db_connection_str)
        .await
        .expect("can't connect to database");

    // build our application with some routes
    let app = Router::new()
        .route("/",
               get(using_connection_pool_extractor)
                   .post(using_connection_extractor),
        )
        .route("/api/games",
               get(using_connection_extractor)
                   .post(using_connection_extractor),
        )
        .route("/api/game", post(using_connection_extractor2))
        .layer(cors)
        .with_state(pool);

    // run it with hyper
    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    tracing::debug!("listening on {}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

// we can extract the connection pool with `State`
async fn using_connection_pool_extractor(
    State(pool): State<PgPool>,
) -> Result<String, (StatusCode, String)> {
    sqlx::query_scalar("select 'hello world from pg'")
        .fetch_one(&pool)
        .await
        .map_err(internal_error)
}

// we can also write a custom extractor that grabs a connection from the pool
// which setup is appropriate depends on your application
struct DatabaseConnection(sqlx::pool::PoolConnection<sqlx::Postgres>);

#[async_trait]
impl<S> FromRequestParts<S> for DatabaseConnection
    where
        PgPool: FromRef<S>,
        S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(_parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let pool = PgPool::from_ref(state);

        let conn = pool.acquire().await.map_err(internal_error)?;

        Ok(Self(conn))
    }
}

// async fn using_connection_extractor(
//     DatabaseConnection(mut conn): DatabaseConnection,
// ) -> Result<String, (StatusCode, String)> {
//     sqlx::query_scalar("select 'hello world from pg'")
//         .fetch_one(&mut *conn)
//         .await
//         .map_err(internal_error)
// }

#[derive(Deserialize)]
pub struct LoginInput {
    name: String,
    board_size: i32,
    player_count: i32,
    public: bool,
    show_progress: bool,
}

async fn using_connection_extractor(
    DatabaseConnection(mut conn): DatabaseConnection,
    Json(payload): Json<LoginInput>,
) -> Result<String, (StatusCode, String)> {

    let uuid = Uuid::new_v4();
    println!("host: {}", uuid);
    let _ = sqlx::query("INSERT INTO GAME (uuid, boardSize, playerCount, name, public, showProgress) VALUES ($1, $2, $3, $4, $5, $6);")
        .bind(uuid).bind(payload.board_size).bind(payload.player_count).bind(payload.name).bind(payload.public).bind(payload.show_progress)
        .execute(&mut *conn)
        .await;

    sqlx::query_scalar("select 'hello world from pg'")
        .fetch_one(&mut *conn)
        .await
        .map_err(internal_error)

    // let result = sqlx::query("CREATE TABLE IF NOT EXISTS refresh_keys (
    //     id INTEGER PRIMARY KEY,
    //     customer_id INTEGER NOT NULL,
    //     key TEXT NOT NULL,
    //     enabled BOOLEAN NOT NULL
    // )").execute(&pool).await;
    //
    // match result {
    //     Ok(_) => println!("Table created"),
    //     Err(e) => println!("Error creating table: {}", e),
    // }
    //
    // // Create new row to insert:
    // let data = RefreshKeys {
    //     id: 1,
    //     customer_id: 1,
    //     key: "test".to_string(),
    //     enabled: true,
    // };
    //
    // let result = sqlx::query(
    //     "INSERT INTO refresh_keys (id, customer_id, key, enabled)
    //     VALUES ($1, $2, $3, $4)")
    //     .bind(data.id)
    //     .bind(data.customer_id)
    //     .bind(data.key)
    //     .bind(data.enabled)
    //     .execute(&pool).await;

    // match result {
    //     Ok(_) => println!("Row inserted"),
    //     Err(e) => println!("Error inserting row: {}", e),
    // }
    //
    // // Select row in database:
    // let keys = sqlx::query_as::<_, RefreshKeys>(
    //     "SELECT * FROM refresh_keys"
    // ).fetch_all(&pool).await;
    //
    // let key_vec = match keys {
    //     Ok(keys) => keys,
    //     Err(e) => {
    //         println!("Error selecting row: {}", e);
    //         return;
    //     }
    // };
    //
    // for key in key_vec {
    //     println!("id={}, customer_id={}, key={}, enabled={}",
    //              key.id,
    //              key.customer_id,
    //              key.key,
    //              key.enabled);
    // }
}

async fn using_connection_extractor2(
    DatabaseConnection(mut conn): DatabaseConnection,
    Json(payload): Json<LoginInput>,
) -> Result<String, (StatusCode, String)> {

    println!("host: {}", payload.name);

    sqlx::query_scalar("select 'hello world from pg'")
        .fetch_one(&mut *conn)
        .await
        .map_err(internal_error)
}

/// Utility function for mapping any error into a `500 Internal Server Error`
/// response.
fn internal_error<E>(err: E) -> (StatusCode, String)
    where
        E: std::error::Error,
{
    (StatusCode::INTERNAL_SERVER_ERROR, err.to_string())
}