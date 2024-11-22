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
    /*
        1) remove hex pair from players hex pair list
        2) insert hex pair in board hex pair list
        3) increment progress values and check how many colors reaches genial, increment moves_in_turn if necessary
        4) if (moves_in_turn > 0) go to 1) else 5)
        5) draw random hex pairs from available hex pair list, insert into players hex pair list
        6) assign move to the next player
        7) ?
     */
    let games = data.games.read().await;

    if !games.contains_key(&body.gameUuid) {
        let message = format!("game does not exist in state with uuid: {}", body.gameUuid);
        error_log(message.clone());
        return HttpResponse::BadRequest().body(message);
    }
    //
    // let game = games.get(&body.gameUuid).unwrap();
    let hex_pair = data.players.read().await.get(&body.playerUuid).unwrap().hex_pairs.get(body.hexPairIndex as usize);

    if hex_pair.is_none() {
        let message = format!("player {} does not have a hex pair in this slot index: {}", body.playerUuid, body.hexPairIndex);
        error_log(message.clone());
        return HttpResponse::BadRequest().body(message);
    }
    //
    // {
    //     // let board = ;
    //
    //     match data.boards.write().await.get(&body.gameUuid) {
    //         Some(b) => {
    //             // let x = b.0;
    //             // b.0.push(BoardHexPair(
    //             //     BoardHex { color: Color::Yellow, x: 0, y: 0 },
    //             //     BoardHex { color: Color::Yellow, x: 0, y: 0 }
    //             // ));
    //         }
    //         None => {
    //             let message = format!("game does not exist in boards state: {}", body.gameUuid);
    //             error_log(message.clone());
    //             return HttpResponse::BadRequest().body(message);
    //         }
    //     }
    // } // drop board
    //
    // // data.broadcaster.broadcast_to(<HashMap<Uuid, Player> as Clone>::clone(&game.players).into_keys().collect(), json!({ "type": "hexy_pair_placed", "data": game }).to_string().as_str()).await;

    return HttpResponse::Ok().json(serde_json::json!({ "status": "success", "operation": "place_hexy_pair" }));
}

pub fn key_not_found_log(key: &str) {
    error_log(format!("game uuid not found in data.boards: {}", key))
}