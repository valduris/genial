use std::io::prelude::*;
use std::sync::{Arc};
use parking_lot::RwLock;
use actix_web::{Responder, web, HttpResponse};
use rand::{thread_rng};
use rand::seq::SliceRandom;
use sqlx::{Error, Row};
use serde_json::json;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::types::{Game, Player, Progress};
use crate::AppState;
use crate::util::{error_log, get_random_name};
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

pub async fn load_existing_players_from_database(data: &web::Data<AppState>) {
    #[derive(Serialize, sqlx::FromRow)]
    struct LoadPlayerFromDb {
        uuid: String,
        name: String,
        game_uuid: Option<String>,
        id: i32,
    }
    let query = "SELECT uuid, name, game_uuid, id FROM player";
    let rows: Result<Vec<LoadPlayerFromDb>, Error> = sqlx::query_as(query).fetch_all(&data.postgres_pool).await;

    if let Err(error) = rows {
        error_log(format!("database error (load_existing_players_from_database) {}", error));
        return;
    }

    let mut players = data.players.write();

    rows.unwrap().iter().for_each(|r| {
        let player_uuid = Uuid::parse_str(r.uuid.as_str()).unwrap();
        players.insert(player_uuid, Arc::new(RwLock::new(Player {
            uuid: player_uuid,
            name: r.name.clone(),
            game_uuid: if r.game_uuid.clone().is_none() { None } else { Some(Uuid::parse_str(r.game_uuid.clone().unwrap().as_str()).unwrap()) },
            id: r.id,
            ready: false,
            hex_pairs: Vec::new(),
            moves_in_turn: 0,
            progress: Progress::new(),
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

    data.games.write().insert(uuid, Arc::new(RwLock::new(Game {
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
    })));

    data.broadcaster.broadcast(json!({ "type": "game_created", "game": {
        "name": body.name,
        "boardSize": body.boardSize,
        "playerCount": body.playerCount,
        "uuid": uuid,
        "showProgress": body.showProgress
    }}).to_string().as_str()).await;

    HttpResponse::Ok().json(serde_json::json!({ "status": "success" }))
}

pub async fn api_get_games(state: web::Data<AppState>) -> HttpResponse {
    #[derive(Serialize)]
    struct ApiGetGames {
        uuid: Uuid,
        name: String,
        boardSize: i32,
        playerCount: i8,
        showProgress: bool,
        status: String,
        players: Vec<ApiLobbyPlayerState>,
    }

    let data: Vec<ApiGetGames> = state.games.read().iter().map(|(_, game_lock)| {
        let game = game_lock.read();
        let api_game = ApiGetGames {
            uuid: game.uuid,
            name: game.name.clone(),
            boardSize: game.board_size.into(),
            playerCount: game.player_count,
            showProgress: game.show_progress,
            status: game.status.clone(),
            players: collect_lobby_game_player_state(&state, &game.uuid),
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
        players: Vec<ApiLobbyPlayerState>,
    }

    if let Some(game_lock) = state.games.read().get(&body.gameUuid) {
        let game = game_lock.read();

        HttpResponse::Ok().json(json!(ApiLobbyGame {
            uuid: game.uuid,
            name: game.name.clone(),
            boardSize: game.board_size.into(),
            playerCount: game.player_count,
            showProgress: game.show_progress,
            status: game.status.clone(),
            players: collect_lobby_game_player_state(&state, &body.gameUuid),
        }))
    } else {
        error_log(format!("game not found: {} (api_get_lobby_game)", &body.gameUuid));
        HttpResponse::NotFound().json(json!({ "status": "error" }))
    }
}
#[derive(Serialize, Deserialize, Debug)]
pub struct GameJoinSchema {
    pub gameUuid: Uuid,
    pub playerUuid: Uuid,
}
pub async fn api_lobby_game_join(body: web::Json<GameJoinSchema>, data: web::Data<AppState>) -> HttpResponse {
    match data.players.read().get(&body.playerUuid) {
        None => {
            error_log(format!("player not found (api_lobby_game_join) with uuid: {}", &body.playerUuid));
            return HttpResponse::NotFound().json(json!({ "type": "player_joined", "status": "error" }));
        }
        Some(player_rwlock) => {
            let mut player = player_rwlock.write();
            player.game_uuid = Some(body.gameUuid.clone());
            player.ready = false;
        }
    }

    if let Some(game) = data.games.read().get(&body.gameUuid) {
        let game = game.read();
        let mut game_players_write = game.players.write();
        if !game_players_write.contains(&body.playerUuid) {
            game_players_write.push(body.playerUuid);
        }
        drop(game_players_write);

        let payload = json!({
            "type": "player_joined",
            "data": {
                "games": json!({
                    &body.gameUuid.to_string(): {
                        "players": collect_lobby_game_player_state(&data, &body.gameUuid),
                    }
                })
            }
        });

        data.broadcaster.broadcast(payload.to_string().as_str()).await;

        HttpResponse::Ok().json(json!({ "type": "player_joined", "status": "ok" }))
    } else {
        error_log(format!("game not found (api_lobby_game_join) with uuid: {}", &body.gameUuid));
        HttpResponse::NotFound().json(json!({ "type": "player_joined", "status": "error" }))
    }
}

#[derive(Serialize)]
pub struct ApiLobbyPlayerState {
    ready: bool,
    id: i32,
    name: String,
}

pub fn collect_lobby_game_player_state(data: &web::Data<AppState>, game_uuid: &Uuid) -> Vec<ApiLobbyPlayerState> {
    match data.games.read().get(game_uuid) {
         Some(game) => {
             game.read().players.read().iter().fold(Vec::new(), |mut acc, uuid| {
                 match data.players.read().get(&uuid) {
                     Some(player_rwlock) => {
                         let player = player_rwlock.read();
                         acc.push(ApiLobbyPlayerState {
                             ready: player.ready,
                             id: player.id,
                             name: player.name.clone(),
                         });
                     }
                     None => {
                         error_log(format!("player not found while collecting player data for game {}, {}", &game_uuid, &uuid));
                     }
                 }
                 acc
             }).into_iter().collect()
         }
        None => {
            error_log(format!("game not found while collecting player info for game: {}", &game_uuid));
            Vec::new()
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiPlayerReadySchema {
    pub playerUuid: Uuid,
    pub gameUuid: Uuid,
    pub ready: bool,
}

pub async fn api_lobby_player_ready(body: web::Json<ApiPlayerReadySchema>, data: web::Data<AppState>) -> HttpResponse {
    match data.players.read().get(&body.playerUuid) {
        Some(player) => {
            player.write().ready = body.ready;
        }
        None => {
            let message = format!("player not found in player ready route {}", &body.playerUuid);
            error_log(message.clone());
            return HttpResponse::NotFound().body(message);
        }
    }

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

            let payload = json!({
                "type": "player_ready",
                "data": {
                    "games": json!({
                        &body.gameUuid.to_string(): {
                            "players": collect_lobby_game_player_state(&data, &body.gameUuid),
                        }
                    })
                }
            });

            data.broadcaster.broadcast(payload.to_string().as_str()).await;

            HttpResponse::Ok().json(json!({ "type": "player_ready", "status": "ok" }))
        }
        None => {
            error_log(format!("Game not found with uuid: {}", &body.gameUuid));
            HttpResponse::NotFound().json(json!({ "type": "player_ready", "status": "error" }))
        }
    }

    // if (all players ready) {
    //     assign move to player randomly
    //     start timer
    //     deal random hexys from drawables to all players
    // }
    // println!("player_uuids {:?} ", player_uuids);
    // data.broadcaster.broadcast(json!({ "type": "player_ready", "value": row }).to_string().as_str()).await;
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GameLeaveSchema {
    pub playerUuid: Uuid,
    pub gameUuid: Uuid,
}

pub async fn api_lobby_game_leave(body: web::Json<GameLeaveSchema>, data: web::Data<AppState>) -> impl Responder {
    match data.players.read().get(&body.playerUuid) {
        Some(player) => {
            let mut player_write = player.write();
            player_write.game_uuid = None;
            player_write.ready = false;
        }
        None => {
            error_log(format!("player not found while leaving the game {}", &body.playerUuid));
            return HttpResponse::NotFound().json(json!({ "type": "player_left", "status": "error" }));
        }
    }

    if let Some(game) = data.games.read().get(&body.gameUuid) {
        let game = game.read();
        let mut game_players_write = game.players.write();
        if let Some(pos) = game_players_write.iter().position(|uuid| *uuid == body.playerUuid) {
            game_players_write.remove(pos);
        }
        drop(game_players_write);

        let payload = json!({
            "type": "player_left",
            "data": {
                "games": json!({
                    &body.gameUuid.to_string(): {
                        "players": collect_lobby_game_player_state(&data, &body.gameUuid),
                    }
                })
            }
        });

        data.broadcaster.broadcast(payload.to_string().as_str()).await;

        HttpResponse::Ok().json(json!({ "type": "player_left", "status": "ok" }))
    } else {
        error_log(format!("game not found while leaving the game {}", &body.gameUuid));
        HttpResponse::NotFound().json(json!({ "type": "player_left", "status": "error" }))
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct PlayerInfo {
    pub playerUuid: Uuid,
}

pub async fn api_player_info(body: web::Json<PlayerInfo>, data: web::Data<AppState>) -> impl Responder {
    #[derive(sqlx::FromRow)]
    struct UpsertPlayer {
        id: i32,
    }

    let random_name = get_random_name();
    let upsert_result: Result<UpsertPlayer, Error> = sqlx::query_as(r#"INSERT INTO player (uuid, name) VALUES ($1, $2) ON CONFLICT (uuid) DO UPDATE SET name = $2 RETURNING id, name"#)
        .bind(body.playerUuid.clone())
        .bind(random_name.clone())
        .fetch_one(&data.postgres_pool)
        .await;

    if let Err(error) = upsert_result {
        error_log(format!("(api_player_info) an error occurred {}", error));
        return HttpResponse::InternalServerError().json(json!({ "type": "player_info", "status": "error" }));
    }

    let player_id = upsert_result.unwrap().id;
    let mut game_uuid = None;
    let players_read = data.players.read();

    match players_read.get(&body.playerUuid) {
        Some(player_rwlock) => {
            game_uuid = Some(player_rwlock.read().game_uuid);
        }
        None => {
            drop(players_read);
            data.players.write().insert(body.playerUuid, Arc::new(RwLock::new(Player {
                game_uuid: None,
                name: random_name.clone(),
                ready: false,
                uuid: body.playerUuid,
                id: player_id,
                hex_pairs: Vec::new(),
                moves_in_turn: 0,
                progress: Progress::new(),
            })));
        }
    }

    let payload = json!({
        "type": "player_info",
        "data": {
            "players": {
                &body.playerUuid.to_string(): {
                    "uuid": body.playerUuid.clone(),
                    "id": player_id,
                    "name": random_name,
                    "gameUuid": game_uuid,
                    // "hexPairs": player.hex_pairs,
                    // "movesInTurn": player.moves_in_turn,
                    // "progress": player.progress,
                }
            },
        },
    });

    HttpResponse::Ok().json(json!(payload))
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

    match result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({ "status": "success" }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({ "status": "error","message": format!("{:?}", e)}));
        }
    }
}