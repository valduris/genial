// TODO
// https://github.com/laurentpayot/minidenticons

use std::io::{Write};
use std::io::prelude::*;
use std::{time::Duration};
use dotenv::dotenv;
use actix_web::{http::header, Responder, web, App, HttpServer, middleware};
use actix_web::{error::ResponseError};
use std::sync::{Arc, RwLock};
use std::env;
use std::ops::Deref;
use actix_cors::Cors;
use sqlx::postgres::{PgPoolOptions};
use sqlx::{FromRow, Pool, Postgres, Row};
use serde::{Deserialize, Serialize};
use crate::routes::game::api_game_place_hex_pair;
use crate::routes::lobby::{api_game_create, api_get_games, api_get_lobby_game, api_player_info, api_player_register, load_existing_games_from_database, load_existing_players_from_database};
use crate::ws::{websocket_handler, RoomsState, start_cleanup_task};
use crate::types::{Boards, Games, Players};
use futures_util::StreamExt;

mod types;
mod game;
mod util;
mod routes;
mod trash;
mod ws;

pub struct AppState {
    postgres_pool: Pool<Postgres>,
    games: Games,
    players: Players,
    boards: Boards,
    rooms_state: Arc<RwLock<RoomsState>>,
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let db_connection_str = env::var("DATABASE_URL").expect("$DATABASE_URL is not set");
    let rooms_state = Arc::new(RwLock::new(RoomsState::new()));
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&db_connection_str)
        .await
        .expect("could not connect to database");

    let cleanup_state = rooms_state.clone();
    tokio::spawn(async move {
        start_cleanup_task(cleanup_state).await;
    });

    let app_data = web::Data::new(AppState {
        postgres_pool: pool.clone(),
        games: Games::default(),
        players: Players::default(),
        boards: Boards::default(),
        rooms_state: rooms_state,
    });

    load_existing_games_from_database(&app_data).await;
    load_existing_players_from_database(&app_data).await;

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
            .app_data(app_data.clone())
            .wrap(cors)
            .route("/api/games", web::get().to(api_get_games))
            .route("/api/game", web::post().to(api_game_create))
            .route("/api/lobby_game", web::post().to(api_get_lobby_game))
            .route("/api/player/register", web::post().to(api_player_register))
            .route("/api/player/info", web::post().to(api_player_info))
            .route("/api/game/placeHexy", web::post().to(api_game_place_hex_pair))
            .route("/ws/{user_id}", web::get().to(websocket_handler))
            .wrap(middleware::NormalizePath::trim())
    })
    .bind(format!("{}:{}", "127.0.0.1", "8080"))?
    .run()
    .await
}
