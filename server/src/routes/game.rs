use std::collections::HashMap;
use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use crate::AppState;
use crate::types::{BoardHex, BoardHexPair, Color, HexPair, Player};
use crate::util::error_log;

#[derive(Serialize, Deserialize, Debug)]
pub struct PlaceHexPairSchema {
    pub gameUuid: Uuid,
    pub playerUuid: Uuid,
    pub hexPairIndex: u8,
    pub x1: u8,
    pub y1: u8,
    pub x2: u8,
    pub y2: u8,
}

pub async fn api_game_place_hex_pair(body: web::Json<PlaceHexPairSchema>, data: web::Data<AppState>) -> impl Responder {
    let games = data.games.read().unwrap();

    if !games.contains_key(&body.gameUuid) {
        let message = format!("game does not exist in state with uuid: {}", body.gameUuid);
        error_log(message.clone());
        return HttpResponse::BadRequest().body(message);
    }

    let game = games.get(&body.gameUuid).unwrap();
    let hex_pair = game.players.get(&body.playerUuid).unwrap().hex_pairs.get(body.hexPairIndex as usize);

    if hex_pair.is_none() {
        let message = format!("player {} does not have a hex pair in this slot index: {}", body.playerUuid, body.hexPairIndex);
        error_log(message.clone());
        return HttpResponse::BadRequest().body(message);
    }

    game.hex_pair_placement_history.write().unwrap().push(BoardHexPair(
        BoardHex { color: Color::Yellow, x: 0, y: 0 },
        BoardHex { color: Color::Yellow, x: 0, y: 0 }
    ));

    game.hex_pairs_on_board.write().unwrap().insert(0, BoardHexPair(
        BoardHex { color: Color::Yellow, x: 0, y: 0 },
        BoardHex { color: Color::Yellow, x: 0, y: 0 }
    ));

    // if ()

    data.broadcaster.broadcast_to(<HashMap<Uuid, Player> as Clone>::clone(&game.players).into_keys().collect(), json!({ "type": "hexy_pair_placed", "data": game }).to_string().as_str()).await;

    return HttpResponse::Ok().json(serde_json::json!({ "status": "success", "operation": "place_hexy_pair" }));
}