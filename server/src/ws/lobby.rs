use actix_web::{web, HttpResponse};
use actix_web::web::Data;
use serde::{Deserialize, Serialize};
use serde_json::json;
use rand::{thread_rng};
use rand::seq::SliceRandom;
use uuid::Uuid;
use crate::AppState;
use crate::routes::lobby::collect_lobby_game_player_state;
use crate::util::error_log;

#[derive(Deserialize, Debug)]
struct WsRegister {
    player_uuid: Uuid,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct WsJoinGame {
    player_uuid: Uuid,
    game_uuid: Uuid,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct WsLeaveGame {
    pub player_uuid: Uuid,
    pub game_uuid: Uuid,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct WsReadyChange {
    pub player_uuid: Uuid,
    pub game_uuid: Uuid,
    pub ready: bool,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type", content = "payload")]
pub enum WsMessage {
    // #[serde(alias="register")]
    // Register(WsRegister),
    #[serde(alias="join_game")]
    JoinGame(WsJoinGame),
    #[serde(alias="leave_game")]
    LeaveGame(WsLeaveGame),
    #[serde(alias="ready_change")]
    ReadyChange(WsReadyChange),
}

pub async fn ws_register(app_state: &Data<AppState>, session: &mut actix_ws::Session, ws_register_payload: &WsRegister) {

}

pub async fn ws_join_game(app_state: &Data<AppState>, session: &mut actix_ws::Session, join_game_data: &WsJoinGame) {
    let player_uuid = &join_game_data.player_uuid;
    let game_uuid = &join_game_data.game_uuid;

    app_state.rooms_state.write().unwrap().join_room(&game_uuid.to_string(), &player_uuid.to_string());

    match app_state.players.read().get(&player_uuid) {
        None => {
            error_log(format!("player not found (api_lobby_game_join) with uuid: {}", player_uuid));
        }
        Some(player_rwlock) => {
            let mut player = player_rwlock.write();
            player.game_uuid = Some(*game_uuid);
            player.ready = false;
        }
    }

    if let Some(game) = app_state.games.read().get(game_uuid) {
        let game = game.read();
        let mut game_players_write = game.players.write();
        if !game_players_write.contains(player_uuid) {
            game_players_write.push(*player_uuid);
        }
        drop(game_players_write);

        let payload = format!("{}", json!({
            "type": "player_joined",
            "data": {
                "games": json!({
                    &game_uuid.to_string(): {
                        "players": collect_lobby_game_player_state(app_state, &game_uuid),
                    }
                })
            }
        }));

        if let Err(e) = session.text(payload).await {
            error_log(format!("ws connection closed (ws_join_game)"));
        }
    } else {
        error_log(format!("game not found (JoinGameRequest) with uuid: {}", &game_uuid));
    }
}

pub async fn ws_leave_game(app_state: &Data<AppState>, session: &mut actix_ws::Session, leave_game_data: &WsLeaveGame) {
    let player_uuid = &leave_game_data.player_uuid;
    let game_uuid = &leave_game_data.game_uuid;

    app_state.rooms_state.write().unwrap().leave_room(&game_uuid.to_string(), &player_uuid.to_string());

    match app_state.players.read().get(&player_uuid) {
        Some(player) => {
            let mut player_write = player.write();
            player_write.game_uuid = None;
            player_write.ready = false;
        }
        None => {
            error_log(format!("player not found while leaving the game {}", &player_uuid));
        }
    }

    if let Some(game) = app_state.games.read().get(&game_uuid) {
        let game = game.read();
        let mut game_players_write = game.players.write();
        if let Some(pos) = game_players_write.iter().position(|uuid| *uuid == *player_uuid) {
            game_players_write.remove(pos);
        }
        drop(game_players_write);

        let payload = format!("{}", json!({
            "type": "player_left",
            "data": {
                "games": json!({
                    &game_uuid.to_string(): {
                        "players": collect_lobby_game_player_state(app_state, &game_uuid),
                    }
                })
            }
        }));

        if let Err(e) = session.text(payload).await {
            error_log(format!("ws connection closed (ws_join_game)"));
        }
    } else {
        error_log(format!("game not found while leaving the game {}", &game_uuid));
    }
}

pub async fn ws_ready_change(data: &Data<AppState>, session: &mut actix_ws::Session, ready_change_payload: &WsReadyChange) {
    let players_read = data.players.read();
    match players_read.get(&ready_change_payload.player_uuid) {
        Some(player) => {
            player.write().ready = ready_change_payload.ready;
        }
        None => {
            error_log(format!("player not found in ws_ready_change {}", &ready_change_payload.player_uuid));
        }
    }

    match data.games.read().get(&ready_change_payload.game_uuid) {
        Some(game) => {
            let game_read = game.read();
            if let Some(game_players_write) = Some(game_read.players.clone().write()) {
                // if all players are ready, shuffle player uuid vec, pick a random index and assign move, next player = index + 1 (wraps)
                if game_players_write.iter().all(|uuid| {
                    let player_read = data.players.read();
                    let ready = player_read.get(uuid).unwrap().read().ready;
                    drop(player_read);
                    ready
                }) {
                    game_players_write.clone().shuffle(&mut thread_rng());
                    let first_player_to_move = game_players_write.choose(&mut thread_rng()).copied();
                    drop(game_players_write);
                    let hex_pair_bag = game_read.hex_pairs_in_bag.clone();

                    game_read.players.read().iter().for_each(|player_uuid| {
                        match players_read.get(&player_uuid) {
                            Some(player_rwlock) => {
                                let mut player_write = player_rwlock.write();
                                for i in 0..5 {
                                    match hex_pair_bag.clone().take_random_hex_pair() {
                                        Some(hex_pair) => {
                                            player_write.hex_pairs.insert(i, hex_pair);
                                        }
                                        None => {}
                                    }
                                }

                                data.rooms_state.read().unwrap().clients.get(&ready_change_payload.player_uuid.to_string()).unwrap().send(
                                    json!({
                                        "type": "player_game_data",
                                        "data": {
                                            "players": {
                                                &ready_change_payload.player_uuid.to_string(): {
                                                    "hexPairs": player_write.hex_pairs,
                                                }
                                            }
                                        }
                                    }).to_string()
                                ).unwrap();
                            }
                            None => {
                                error_log(format!("player not found in players state: {}", &player_uuid));
                            }
                        }
                    });

                    drop(game_read);
                    let mut game_write = game.write();
                    game_write.player_to_move = first_player_to_move;
                    game_write.status = "in_progress".to_string();
                }
            }

            data.rooms_state.read().unwrap().broadcast_to_room(
                &ready_change_payload.game_uuid.to_string(),
                json!({
                    "type": "player_ready",
                    "data": {
                        "games": json!({
                            &ready_change_payload.game_uuid.to_string(): {
                                "players": collect_lobby_game_player_state(&data, &ready_change_payload.game_uuid),
                            }
                        })
                    }
                }).to_string().as_str(),
                None
            );
        }
        None => {
            error_log(format!("game not found with uuid: {}", &ready_change_payload.game_uuid));
        }
    }
}