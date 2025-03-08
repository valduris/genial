// TODO
// https://github.com/laurentpayot/minidenticons

use std::io::{Write};
use std::io::prelude::*;
use std::{time::Duration};
use dotenv::dotenv;
use actix_web::{http::header, Responder, HttpRequest, web, App, HttpServer, HttpResponse, middleware};
use actix_ws::Message;
use actix_web::{error::ResponseError};
use self::broadcast::Broadcaster;
use std::sync::{Arc, Mutex};
use std::env;
use std::ops::Deref;
use actix_cors::Cors;
use sqlx::postgres::{PgPoolOptions};
use sqlx::{FromRow, Pool, Postgres, Row};
use serde::{Deserialize, Serialize};
use crate::routes::game::api_game_place_hex_pair;
use crate::routes::lobby::{api_game_create, api_get_games, api_get_lobby_game, api_lobby_game_join, api_lobby_game_leave, api_lobby_player_ready, api_player_info, api_player_register, load_existing_games_from_database, load_existing_players_from_database};
use crate::ws::{websocket_handler, join_room_handler, leave_room_handler, RoomsState, cleanup_stale_clients, start_cleanup_task};
use crate::types::{Boards, Games, Players};
use futures_util::StreamExt;
use tokio::{task::{spawn}, try_join};

mod broadcast;
mod types;
mod game;
mod util;
mod routes;
mod trash;
mod ws;

pub struct AppState {
    broadcaster: Arc<Broadcaster>,
    postgres_pool: Pool<Postgres>,
    games: Games,
    players: Players,
    boards: Boards,
    // ws_tx: ChatServerHandle,
    rooms_state: Arc<Mutex<RoomsState>>,
}

// 'created', // 'started', // 'finished', // 'cancelled'

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();

    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));

    let broadcaster = Broadcaster::create();
    let db_connection_str = env::var("DATABASE_URL").expect("$DATABASE_URL is not set");
    let rooms_state = Arc::new(Mutex::new(RoomsState::new()));
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&db_connection_str)
        .await
        .expect("can't connect to database");

    let cleanup_state = rooms_state.clone();
    tokio::spawn(async move {
        start_cleanup_task(cleanup_state).await;
    });

    let app_data = web::Data::new(AppState {
        broadcaster: Arc::clone(&broadcaster),
        postgres_pool: pool.clone(),
        games: Games::default(),
        players: Players::default(),
        boards: Boards::default(),
        // ws_tx: server_tx.clone(),
        rooms_state: Arc::new(Mutex::new(RoomsState::new())),
    });

    load_existing_games_from_database(&app_data).await;
    load_existing_players_from_database(&app_data).await;

    // let chat_server = spawn(chat_server.run());

    let http_server = HttpServer::new(move || {
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
            .route("/api/game/join", web::post().to(api_lobby_game_join))
            .route("/api/game/leave", web::post().to(api_lobby_game_leave))
            .route("/api/lobby_game", web::post().to(api_get_lobby_game))
            .route("/api/player/register", web::post().to(api_player_register))
            .route("/api/player/info", web::post().to(api_player_info))
            .route("/api/game/ready", web::post().to(api_lobby_player_ready))
            .route("/api/game/placeHexy", web::post().to(api_game_place_hex_pair))
            .route("/ws", web::get().to(websocket_handler))
            // .service(
            //     web::scope("/api")
            //         .route("/join", web::post().to(join_room_handler))
            //         .route("/leave", web::post().to(leave_room_handler))
            //         .route("/cleanup", web::post().to(cleanup_stale_clients))
            // )
            .wrap(middleware::NormalizePath::trim())
            // .wrap(middleware::Logger::default())
    })
    .bind(format!("{}:{}", "127.0.0.1", "8080"))?
    .run()
    .await;

//     try_join!(http_server, async move { chat_server.await.unwrap() })?;

    Ok(())
}
