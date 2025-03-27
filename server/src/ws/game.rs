use actix_web::web::Data;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;
use crate::AppState;
use crate::game::{calculate_progress_gained, is_valid_hex_pair_placement, COLORS};
use crate::types::{BoardHex, BoardHexPair};
use crate::util::error_log;

#[derive(Serialize, Deserialize, Debug)]
pub struct WsPlaceHexPair {
    pub game_uuid: Uuid,
    pub player_uuid: Uuid,
    pub hex_pair_index: usize,
    pub hex1: BoardHex,
    pub hex2: BoardHex,
}

pub async fn ws_place_hex_pair(data: &Data<AppState>, place_hex_pair_payload: &WsPlaceHexPair) {
    let games = data.games.read();

    if !games.contains_key(&place_hex_pair_payload.game_uuid) {
        error_log(format!("game does not exist in state with uuid: {}", place_hex_pair_payload.game_uuid));
        return
    }

    let players_read = data.players.read();
    let game_read = games.get(&place_hex_pair_payload.game_uuid).unwrap().read();

    if !players_read.contains_key(&place_hex_pair_payload.player_uuid) {
        error_log(format!("player does not exist in state with uuid: {}", place_hex_pair_payload.player_uuid));
        return
    }

    // remove hex pair from players hex pair list and insert hex pair in board hex pair list
    let player_rwlock = players_read.get(&place_hex_pair_payload.player_uuid).unwrap().clone();
    let player_read = player_rwlock.read();
    let mut player_hex_pairs = player_read.hex_pairs.clone();
    match player_hex_pairs.clone().get(place_hex_pair_payload.hex_pair_index) {
        Some(_player_hex_pair) => {
            player_hex_pairs[place_hex_pair_payload.hex_pair_index] = None;
            // TODO validate hex pair colors and index

            match data.boards.read().get(&place_hex_pair_payload.game_uuid) {
                Some(board) => {
                    let board_hex_1 = BoardHex { ..place_hex_pair_payload.hex1 };
                    let board_hex_2 = BoardHex { ..place_hex_pair_payload.hex2 };
                    let board_hex_pair: BoardHexPair = [board_hex_1, board_hex_2];
                    let board_read = board.read();
                    if !is_valid_hex_pair_placement(&board_read, game_read.board_size, board_hex_pair) {
                        error_log(format!("invalid hex pair placement {:?} on board {:?}", board_hex_pair, board_read));
                    }
                    drop(game_read);
                    drop(board_read);
                    let progress_gained = calculate_progress_gained(board.read().to_vec(), board_hex_pair);
                    let total_progress = progress_gained.clone().sum(player_read.progress.clone());
                    // increment progress values and check how many colors reaches genial, increment moves_in_turn if necessary
                    let genial_count = COLORS.iter().fold(0, |mut acc, color| {
                        acc += if total_progress.clone().is_genial(color.clone()) { 1 } else { 0 };
                        acc
                    });
                    drop(player_read);
                    let mut player_write = player_rwlock.write();
                    player_write.moves_in_turn += genial_count - 1;
                    player_write.progress = total_progress.clone();

                    // draw random hex pairs from available hex pair list, insert into players hex pair list
                    if player_write.moves_in_turn == 0 {
                        let hex_pairs_in_bag = games.get(&place_hex_pair_payload.game_uuid).unwrap().read().hex_pairs_in_bag.clone();
                        while let Some(empty_index) = player_write.hex_pairs.iter().position(|hex_pair| hex_pair.is_none()) {
                            match hex_pairs_in_bag.clone().take_random_hex_pair() {
                                Some(hex_pair) => {
                                    player_write.hex_pairs[empty_index] = Some(hex_pair);
                                }
                                None => {
                                    error_log(format!("hex_pairs_in_bag is empty for game: {}", place_hex_pair_payload.game_uuid));
                                    break;
                                }
                            }
                        }
                    }

                    let mut writable_board = board.write();
                    writable_board.push(board_hex_1);
                    writable_board.push(board_hex_2);
                    drop(writable_board);
                }
                None => {
                    error_log(format!("game does not exist in boards state: {}", place_hex_pair_payload.game_uuid));
                }
            }

            let player_read = player_rwlock.read();

            data.rooms_state.read().unwrap().broadcast_to_room(
                &place_hex_pair_payload.game_uuid.to_string(),
                json!({
                    "type": "game_state_per_move",
                    "data": {
                        "games": {
                            &place_hex_pair_payload.game_uuid.to_string(): {
                                "status": "in_progress",
                                "board": data.boards.read().get(&place_hex_pair_payload.game_uuid).unwrap().read().iter().collect::<Vec<&BoardHex>>(),
                            },
                        },
                        "players": {
                            player_read.id.to_string(): {
                                "progress": player_read.progress,
                            },
                        },
                    }
                }).to_string().as_str(),
                None
            );
        }
        None => {
            error_log(format!("player {} does not have a hex pair in this slot index: {}", place_hex_pair_payload.player_uuid, place_hex_pair_payload.hex_pair_index));
        }
    }
}