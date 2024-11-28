// TODO
// https://github.com/laurentpayot/minidenticons

use std::io::{Write};
use std::io::prelude::*;
use std::{time::Duration};
use dotenv::dotenv;
use actix_web::{http::header, Responder, web, App, HttpServer, HttpResponse };
use actix_web::{error::ResponseError};
use self::broadcast::Broadcaster;
use actix_web_lab::extract::Path;
use std::sync::{Arc};
use std::env;
use std::ops::Deref;
use actix_cors::Cors;
use sqlx::postgres::{PgPoolOptions};
use sqlx::{FromRow, Pool, Postgres, Row};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::routes::game::api_game_place_hex_pair;
use crate::routes::lobby::{
    api_game_create, api_get_games, api_get_lobby_game, api_lobby_game_join, api_lobby_game_leave, api_lobby_player_ready, api_player_register, load_existing_games_from_database
};
use crate::types::{Boards, Games, Players};

mod broadcast;
mod types;
mod game;
mod util;
mod routes;
mod trash;

pub struct AppState {
    broadcaster: Arc<Broadcaster>,
    postgres_pool: Pool<Postgres>,
    games: Games,
    players: Players,
    boards: Boards,
}

// 'created', // 'started', // 'finished', // 'cancelled'
pub async fn sse_connect_client(state: web::Data<AppState>, Path(uuid): Path<Uuid>) -> impl Responder {
    state.broadcaster.new_client(uuid).await
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

    let app_data = web::Data::new(AppState {
        broadcaster: Arc::clone(&broadcaster),
        postgres_pool: pool.clone(),
        games: Games::default(),
        players: Players::default(),
        boards: Boards::default(),
    });

    load_existing_games_from_database(&app_data).await;

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
            .route("/events/{uuid}", web::get().to(sse_connect_client))
            .route("/api/games", web::get().to(api_get_games))
            .route("/api/game", web::post().to(api_game_create))
            .route("/api/game/join", web::post().to(api_lobby_game_join))
            .route("/api/game/leave", web::post().to(api_lobby_game_leave))
            .route("/api/lobby_game", web::post().to(api_get_lobby_game))
            .route("/api/player/register", web::post().to(api_player_register))
            .route("/api/game/ready", web::post().to(api_lobby_player_ready))
            .route("/api/game/placeHexy", web::post().to(api_game_place_hex_pair))
    })
    .bind(format!("{}:{}", "127.0.0.1", "8080"))?
    .run()
    .await
}
