use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::AppState;
use crate::game::{calculate_progress_gained, is_valid_hex_pair_placement, COLORS};
use crate::types::{BoardHex, BoardHexPair};
use crate::util::error_log;

#[derive(Serialize, Deserialize, Debug)]
pub struct PlaceHexPairSchema {
    pub gameUuid: Uuid,
    pub playerUuid: Uuid,
    pub hexPairIndex: usize,
    pub x1: i8,
    pub y1: i8,
    pub x2: i8,
    pub y2: i8,
}

pub async fn api_game_place_hex_pair(body: web::Json<PlaceHexPairSchema>, data: web::Data<AppState>) -> impl Responder {
    let games = data.games.read();

    if !games.contains_key(&body.gameUuid) {
        let message = format!("game does not exist in state with uuid: {}", body.gameUuid);
        error_log(message.clone());
        return HttpResponse::BadRequest().body(message);
    }

    let players_read = data.players.read();
    let game_read = games.get(&body.gameUuid).unwrap().read();

    if !players_read.contains_key(&body.playerUuid) {
        let message = format!("player does not exist in state with uuid: {}", body.gameUuid);
        error_log(message.clone());
        return HttpResponse::BadRequest().body(message);
    }

    // remove hex pair from players hex pair list and insert hex pair in board hex pair list
    let player = players_read.get(&body.playerUuid).unwrap().clone();
    let mut player_hex_pairs = player.read().hex_pairs.clone();
    match player_hex_pairs.clone().get(body.hexPairIndex) {
        Some(player_hex_pair) => {
            player_hex_pairs.remove(body.hexPairIndex);

            match data.boards.read().get(&body.gameUuid) {
                Some(board) => {
                    let board_hex_1 = BoardHex { color: player_hex_pair[0].clone(), x: body.x1, y: body.y1 };
                    let board_hex_2 = BoardHex { color: player_hex_pair[1].clone(), x: body.x2, y: body.y2 };
                    let board_hex_pair: BoardHexPair = [board_hex_1, board_hex_2];
                    let board_read = board.read();
                    if !is_valid_hex_pair_placement(&board_read, game_read.board_size, board_hex_pair) {
                        let message = format!("invalid hex pair placement {:?} on board {:?}", board_hex_pair, board_read);
                        error_log(message.clone());
                        return HttpResponse::BadRequest().body(message);
                    }
                    let progress_gained = calculate_progress_gained(board.read().to_vec(), board_hex_pair);
                    let total_progress = progress_gained.clone().sum(player.read().progress.clone());
                    // increment progress values and check how many colors reaches genial, increment moves_in_turn if necessary
                    let genial_count = COLORS.iter().fold(0, |mut acc, color| {
                        acc += if total_progress.clone().is_genial(color.clone()) { 1 } else { 0 };
                        acc
                    });
                    player.write().moves_in_turn += genial_count;
                    player.write().progress = total_progress;

                    let mut writable_board = board.write();
                    writable_board.push(board_hex_1);
                    writable_board.push(board_hex_2);
                }
                None => {
                    let message = format!("game does not exist in boards state: {}", body.gameUuid);
                    error_log(message.clone());
                    return HttpResponse::BadRequest().body(message);
                }
            }

            let mut player_writable = player.write();

            player_writable.moves_in_turn -= 1;

            // draw random hex pairs from available hex pair list, insert into players hex pair list
            if player_writable.moves_in_turn == 0 {
                while player_writable.hex_pairs.len() < 6 {
                    let hex_pair = games.get(&body.gameUuid).unwrap().read().hex_pairs_in_bag.clone().take_random_hex_pair();
                    player_writable.hex_pairs.push(hex_pair);
                }
            }
        }
        None => {
            let message = format!("player {} does not have a hex pair in this slot index: {}", body.playerUuid, body.hexPairIndex);
            error_log(message.clone());
            return HttpResponse::BadRequest().body(message);
        }
    }
    // // data.broadcaster.broadcast_to(<HashMap<Uuid, Player> as Clone>::clone(&game.players).into_keys().collect(), json!({ "type": "hexy_pair_placed", "data": game }).to_string().as_str()).await;
    return HttpResponse::Ok().json(serde_json::json!({ "status": "success", "operation": "place_hexy_pair" }));
}