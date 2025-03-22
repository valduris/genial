use actix_web::web::Data;
use serde::{Deserialize, Serialize};
use serde_json::json;
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

#[derive(Deserialize, Debug)]
#[serde(tag = "type", content = "payload")]
pub enum WsMessage {
    // #[serde(alias="register")]
    // Register(WsRegister),
    #[serde(alias="join_game")]
    JoinGame(WsJoinGame),
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