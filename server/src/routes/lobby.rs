use std::io::prelude::*;
use std::{time::Duration};
use std::collections::HashMap;
use std::ops::{Deref, Index};
use std::ptr::read;
use std::rc::Rc;
use std::sync::{Arc};
use parking_lot::RwLock;
use actix_web::{Responder, web, HttpResponse};
use actix_web::{error::ResponseError, http::StatusCode};
use actix_web::cookie::time::macros::date;
use actix_web::rt::time::interval;
use actix_web_lab::extract::Path;
use futures_util::future::err;
use futures_util::stream::FuturesUnordered;
use rand::{thread_rng, Rng};
use rand::seq::SliceRandom;
use sqlx::{Error, FromRow, Row};
use serde_json::json;
use serde::{Deserialize, Serialize};
use sqlx::encode::IsNull::No;
use sqlx::postgres::PgQueryResult;
use sqlx::types::JsonValue;
use uuid::Uuid;

use crate::types::{Game, Player, Board, Progress};
use crate::AppState;
use crate::util::{error_log, get_random_name, handle_postgres_query_result};
use crate::game::HexPairsInBag;

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateGameSchema {
    pub name: String,
    pub boardSize: i32,
    pub playerCount: i32,
    pub showProgress: bool,
    pub playerUuid: Uuid,
}

pub async fn load_existing_games_from_database(data: &web::Data<AppState>) {
    #[derive(Serialize, sqlx::FromRow)]
    struct LoadGameFromDb {
        uuid: String,
        name: String,
        board_size: i32,
        player_count: i32,
        show_progress: bool,
        status: String,
        admin_uuid: String,
    }
    let query = "SELECT admin_uuid, name, uuid, board_size, player_count, show_progress, status FROM game";
    let rows: Vec<LoadGameFromDb> = sqlx::query_as(query).fetch_all(&data.postgres_pool).await.unwrap();
    let mut games = data.games.write();

    rows.iter().for_each(|r| {
        let game_uuid = Uuid::parse_str(r.uuid.as_str()).unwrap();
        games.insert(game_uuid, Arc::new(RwLock::new(Game {
            player_count: r.player_count as i8,
            player_to_move: None,
            admin_uuid: Uuid::parse_str(r.admin_uuid.as_str()).unwrap(),
            board_size: r.board_size,
            hex_pairs_in_bag: HexPairsInBag::new(),
            name: r.name.clone(),
            show_progress: r.show_progress,
            status: r.status.clone(),
            uuid: game_uuid,
            players: Arc::new(RwLock::new(Vec::new())),
        })));
    });
}

pub async fn api_game_create(body: web::Json<CreateGameSchema>, data: web::Data<AppState>) -> HttpResponse {
    let uuid = Uuid::new_v4();
    // let query_result  = sqlx::query(
    //     r#"INSERT INTO game (uuid, name, board_size, player_count, show_progress, admin_uuid) VALUES ($1, $2, $3, $4, $5, $6)"#,
    // )
    //     .bind(uuid)
    //     .bind(body.name.to_string())
    //     .bind(body.boardSize.clone())
    //     .bind(body.playerCount)
    //     .bind(body.showProgress)
    //     .bind(body.playerUuid.clone())
    //     .execute(&data.postgres_pool)
    //     .await;

    data.boards.write().insert(uuid, Arc::new(RwLock::new(Vec::new())));

    let game: Game = Game {
        player_count: body.playerCount as i8,
        player_to_move: None,
        admin_uuid: body.playerUuid.clone(),
        board_size: body.boardSize,
        hex_pairs_in_bag: HexPairsInBag::new(),
        name: body.name.clone(),
        show_progress: body.showProgress,
        status: "in_progress".to_string(),
        uuid: uuid,
        players: Arc::new(RwLock::new(Vec::new())),
        // players: HashMap::from([(body.playerUuid.clone(), Player {
        //     uuid: body.playerUuid.clone(),
        //     name: "playerName".to_string(),
        //     hex_pairs: vec![
        //         HexPair(Color::Blue, Color::Red),
        //         HexPair(Color::Orange, Color::Red),
        //         HexPair(Color::Blue, Color::Blue),
        //         HexPair(Color::Yellow, Color::Green),
        //         HexPair(Color::Red, Color::Orange),
        //         HexPair(Color::Violet, Color::Yellow),
        //     ],
        //     progress: Progress::new(),
        //     moves_in_turn: 1,
        // })])
    };

    data.games.write().insert(uuid, Arc::new(RwLock::new(game)));

    data.broadcaster.broadcast(json!({ "type": "game_created", "game": {
        "name": body.name,
        "boardSize": body.boardSize,
        "playerCount": body.playerCount,
        "uuid": uuid,
        "showProgress": body.showProgress
    }}).to_string().as_str()).await;

    // match query_result {
    //     Ok(_) => {
    HttpResponse::Ok().json(serde_json::json!({ "status": "success" }))
    //     }
    //     Err(e) => {
    //         return HttpResponse::InternalServerError().json(serde_json::json!({"status": "error","message": format!("{:?}", e)}));
    //     }
    // }
}

pub async fn api_get_games(state: web::Data<AppState>) -> HttpResponse {
    #[derive(Serialize)]
    struct ApiGetGamesPlayer {
        ready: bool,
        id: i32,
        name: String,
    }
    #[derive(Serialize)]
    struct ApiGetGames {
        uuid: Uuid,
        name: String,
        boardSize: i32,
        playerCount: i8,
        showProgress: bool,
        status: String,
        players: Vec<ApiGetGamesPlayer>,
    }

    let players = state.players.read();
    let data: Vec<ApiGetGames> = state.games.read().iter().map(|(_, game_lock)| {
        let game = game_lock.read();
        let api_game = ApiGetGames {
            uuid: game.uuid,
            name: game.name.clone(),
            boardSize: game.board_size.into(),
            playerCount: game.player_count,
            showProgress: game.show_progress,
            status: game.status.clone(),
            players: game.players.read().iter().map(|uuid| {
                let player = players.get(&uuid).unwrap().read();
                ApiGetGamesPlayer {
                    ready: player.ready,
                    id: player.id,
                    name: player.name.clone(),
                }
            }).collect(),
        };
        api_game
    }).collect();

    HttpResponse::Ok().json(json!(data))
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiLobbyGameSchema {
    pub gameUuid: Uuid,
}

pub async fn api_get_lobby_game(body: web::Json<ApiLobbyGameSchema>, state: web::Data<AppState>) -> impl Responder {
    #[derive(Serialize)]
    struct ApiLobbyGame {
        uuid: Uuid,
        name: String,
        boardSize: i32,
        playerCount: i8,
        showProgress: bool,
        status: String,
        players: Vec<ApiLobbyGamePlayer>,
        // pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
        // #[derive(sqlx::FromRow, Serialize)
        // players: Vec<serde_json::Value>,
    }

    #[derive(Serialize)]
    struct ApiLobbyGamePlayer {
        ready: bool,
        id: i32,
        name: String,
    }

    // let players = state.players.read();
    if let Some(game_lock) = state.games.read().get(&body.gameUuid) {


        let game = game_lock.read();

        let data = ApiLobbyGame {
            uuid: game.uuid,
            name: game.name.clone(),
            boardSize: game.board_size.into(),
            playerCount: game.player_count,
            showProgress: game.show_progress,
            status: game.status.clone(),
            players: Vec::new(),
            // game.players.iter().map(|uuid| async {
            //     let player = players.get(&uuid).unwrap().read();
            //     ApiLobbyGamePlayer {
            //         ready: player.ready,
            //         id: player.id,
            //         name: player.name.clone(),
            //     }
            // }).collect(),
        };

        HttpResponse::Ok().json(json!(data))
    } else {
        HttpResponse::NotFound().json(json!({ "status": "not_found" }))
    }
}
#[derive(Serialize, Deserialize, Debug)]
pub struct GameJoinSchema {
    pub gameUuid: Uuid,
    pub playerUuid: Uuid,
}
pub async fn api_lobby_game_join(body: web::Json<GameJoinSchema>, data: web::Data<AppState>) -> impl Responder {
    #[derive(sqlx::FromRow)]
    struct UpsertPlayer {
        id: i32,
    }

    let upsert_result: Result<UpsertPlayer, Error> = sqlx::query_as(r#"INSERT INTO player (uuid, game_uuid) VALUES ($1, $2) ON CONFLICT (uuid) DO UPDATE SET game_uuid = $2 RETURNING id"#)
        .bind(body.playerUuid.clone())
        .bind(body.gameUuid.clone())
        .fetch_one(&data.postgres_pool)
        .await;

    if let Err(error) = upsert_result {
        let message = format!("An error occurred while joining the game {}", error);
        error_log(message.clone());
        return HttpResponse::BadRequest().body(message);
    }

    let players_read_lock = data.players.read();

    if !players_read_lock.contains_key(&body.playerUuid) {
        drop(players_read_lock);
        data.players.write().insert(body.playerUuid, Arc::new(RwLock::new(Player {
            name: get_random_name(),
            ready: false,
            uuid: body.playerUuid,
            id: upsert_result.unwrap().id,
            game_uuid: body.gameUuid.into(),
            hex_pairs: Vec::new(),
            moves_in_turn: 0,
            progress: Progress::new(),
        })));
    } else {
        let mut player = players_read_lock.get(&body.playerUuid).unwrap().write();

        player.game_uuid = Some(body.gameUuid.clone());
        player.ready = false;
    }

    eprintln!("{:?}", data.players.read().get(&body.playerUuid).unwrap().read());

    #[derive(Serialize)]
    struct ApiGameJoin {
        #[serde(rename(serialize = "gameUuid"))]
        game_uuid: String,
        players: Vec<ApiGameJoinPlayer>,
    }

    #[derive(Serialize)]
    struct ApiGameJoinPlayer {
        ready: bool,
        id: i32,
        name: String,
    }

    let players = data.players.read().clone();
    if let Some(game) = data.games.read().get(&body.gameUuid) {
        let game = game.read();
        let mut game_players_write = game.players.write();
        if !game_players_write.contains(&body.playerUuid) {
            game_players_write.push(body.playerUuid);
        }
        drop(game_players_write);

        let payload = ApiGameJoin {
            game_uuid: game.uuid.into(),
            players: game.players.read().iter().fold(Vec::new(), |mut acc, uuid| {
                match players.get(&uuid) {
                    Some(player_rwlock) => {
                        let player = player_rwlock.read();
                        acc.push(ApiGameJoinPlayer {
                            ready: player.ready,
                            id: player.id,
                            name: player.name.clone(),
                        });
                    }
                    None => {
                        error_log(format!("Player not found while joining the game: {}", &uuid));
                    }
                }
                acc
            }).into_iter().collect(),
        };

        eprintln!("players {:?}", data.players.read().iter().collect::<Vec<_>>());

        data.broadcaster.broadcast(json!({ "type": "player_joined", "value": payload }).to_string().as_str()).await;

        HttpResponse::Ok().json(json!({ "type": "join_game" }))
    } else {
        HttpResponse::NotFound().json(json!({ "type": "player_joined", "status": "not_found" }))
    }

    // #[derive(sqlx::FromRow, Debug, Serialize)]
    // struct ApiLobbyGame {
    //     players: Vec<serde_json::Value>,
    //     #[serde(rename(serialize = "gameUuid"))]
    //     game_uuid: String,
    // }
    //
    // let row: ApiLobbyGame = sqlx::query_as(r#"
    //     SELECT g.uuid AS game_uuid, COALESCE(array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) FILTER (WHERE p.id IS NOT NULL), '{}') AS players
    //     FROM game g
    //     LEFT JOIN player p on g.uuid = p.game_uuid
    //     WHERE g.uuid = $1
    //     GROUP BY g.uuid
    // "#).bind(body.gameUuid.clone().to_string()).fetch_one(&data.postgres_pool).await.unwrap();
}
#[derive(Serialize, Deserialize, Debug)]
pub struct ApiPlayerReadySchema {
    pub playerUuid: Uuid,
    pub gameUuid: Uuid,
    pub ready: bool,
}

pub async fn api_lobby_player_ready(body: web::Json<ApiPlayerReadySchema>, data: web::Data<AppState>) -> impl Responder {
    // let query = r#"UPDATE player SET ready = $1 WHERE uuid = $2"#;
    // let result  = sqlx::query(query)
    //     .bind(body.ready)
    //     .bind(body.playerUuid.clone())
    //     .execute(&data.postgres_pool)
    //     .await;
    //
    // let row: ApiLobbyGame = sqlx::query_as(r#"
    //     SELECT g.uuid AS game_uuid, COALESCE(array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) FILTER (WHERE p.id IS NOT NULL), '{}') AS players
    //     FROM game g
    //     LEFT JOIN player p ON g.uuid = p.game_uuid
    //     GROUP BY g.uuid
    // "#).fetch_one(&data.postgres_pool).await.unwrap();

    data.players.read().get(&body.playerUuid).unwrap().write().ready = body.ready;
    match data.games.read().get(&body.gameUuid) {
        Some(game) => {
            let game_read = game.read();
            if let Some(game_players_write) = Some(game_read.players.clone().write()) {
                // if all players are ready, shuffle player uuid vec, pick a random index and assign move, next player = index + 1 (wraps)
                if game_players_write.iter().all(|uuid| {
                    data.players.read().get(uuid).unwrap().read().ready
                }) {
                    game_players_write.clone().shuffle(&mut thread_rng());
                    drop(game_read);

                    let mut game_write = game.write();
                    game_write.player_to_move = game_players_write.choose(&mut thread_rng()).copied();
                }
            }
        }
        None => {
            let message = format!("Game not found with uuid: {}", &body.gameUuid);
            error_log(message.clone());
            return HttpResponse::BadRequest().body(message);
        }
    }

    // if (all players ready) {
    //     assign move to player randomly
    //     start timer
    //     deal random hexys from drawables to all players
    // }
    // let player_uuids: Vec<Uuid> = data.games.read().get(&body.gameUuid).unwrap().players.clone().into_iter().map(|(_, v)| v.uuid).collect();

    println!("player {} is ready? {}", body.playerUuid, body.ready);
    // println!("player_uuids {:?} ", player_uuids);

    return HttpResponse::Ok().json(json!({ "type": "player_ready" }));

    // data.broadcaster.broadcast(json!({ "type": "player_ready", "value": row }).to_string().as_str()).await;

    // return handle_postgres_query_result(result);
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GameLeaveSchema {
    pub playerUuid: Uuid,
    pub gameUuid: Uuid,
}

pub async fn api_lobby_game_leave(body: web::Json<GameLeaveSchema>, data: web::Data<AppState>) -> impl Responder {
    let update_result: Result<(), Error> = sqlx::query_as("UPDATE player SET game_uuid = NULL WHERE uuid = $1")
        .bind(body.playerUuid.clone())
        .fetch_one(&data.postgres_pool)
        .await;

    if let Err(error) = update_result {
        let message = format!("An error occurred while joining the game {}", error);
        error_log(message.clone());
        return HttpResponse::InternalServerError().body(message);
    }

    match data.players.read().get(&body.playerUuid) {
        Some(player) => {
            let mut player_write = player.write();
            player_write.game_uuid = None;
            player_write.ready = false;
        }
        None => {
            let message = format!("Player not found while leaving the game {}", &body.playerUuid);
            error_log(message.clone());
            return HttpResponse::InternalServerError().body(message);
        }
    }

    #[derive(Serialize)]
    struct ApiGameLeave {
        #[serde(rename(serialize = "gameUuid"))]
        game_uuid: String,
        players: Vec<ApiGameLeavePlayer>,
    }

    #[derive(Serialize)]
    struct ApiGameLeavePlayer {
        ready: bool,
        id: i32,
        name: String,
    }

    let players = data.players.read().clone();
    if let Some(game) = data.games.read().get(&body.gameUuid) {
        let game = game.read();
        let mut game_players_write = game.players.write();
        if let Some(pos) = game_players_write.iter().position(|uuid| *uuid == body.playerUuid) {
            game_players_write.remove(pos);
        }
        drop(game_players_write);

        let payload = ApiGameLeave {
            game_uuid: game.uuid.into(),
            players: game.players.read().iter().fold(Vec::new(), |mut acc, uuid| {
                match players.get(&uuid) {
                    Some(player_rwlock) => {
                        let player = player_rwlock.read();
                        acc.push(ApiGameLeavePlayer {
                            ready: player.ready,
                            id: player.id,
                            name: player.name.clone(),
                        });
                    }
                    None => {
                        error_log(format!("player not found while joining the game: {}", &uuid));
                    }
                }
                acc
            }).into_iter().collect(),
        };

        eprintln!("players {:?}", data.players.read().iter().collect::<Vec<_>>());

        data.broadcaster.broadcast(json!({ "type": "player_left", "value": payload }).to_string().as_str()).await;

        HttpResponse::Ok().json(json!({ "type": "leave_game" }))
    } else {
        HttpResponse::NotFound().json(json!({ "type": "player_left", "status": "not_found" }))
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiPlayerRegisterSchema {
    pub name: String,
    pub email: String,
    pub password: String,
}

pub async fn api_player_register(body: web::Json<ApiPlayerRegisterSchema>, data: web::Data<AppState>) -> impl Responder {
    let uuid = Uuid::new_v4();
    let query = r#"INSERT INTO player (uuid, name, email, password) VALUES ($1, $2, $3, $4)"#;
    let result  = sqlx::query(query)
        .bind(uuid).bind(body.name.clone()).bind(body.email.clone()).bind(body.password.clone())
        .execute(&data.postgres_pool)
        .await;

    return handle_postgres_query_result(result);
}