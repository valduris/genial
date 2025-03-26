mod lobby;
pub mod game;
pub mod rooms_state;

use actix_web::{web, Error, HttpRequest, HttpResponse, Responder};
use actix_web::web::Data;
use std::sync::{Arc, Mutex, RwLock};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use tokio::time::{interval, sleep};
use uuid::Uuid;
use actix_ws::AggregatedMessage;
use futures_util::StreamExt as _;
use serde::Deserialize;
use crate::AppState;
use crate::ws::game::{ws_place_hex_pair, WsPlaceHexPair};
use crate::ws::lobby::{ws_join_game, ws_leave_game, ws_ready_change, WsJoinGame, WsLeaveGame, WsReadyChange};
use crate::ws::rooms_state::RoomsState;

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

pub async fn websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    data: Data<AppState>,
    path: web::Path<String>,
) -> Result<HttpResponse, Error> {
    match Uuid::parse_str(path.into_inner().as_str()) {
        Ok(player_uuid) => {
            let (response, mut session, msg_stream) = actix_ws::handle(&req, stream)?;
            let (client_tx, mut client_rx) = mpsc::unbounded_channel::<String>();

            data.rooms_state.write().unwrap().register_client(&player_uuid.to_string(), client_tx.clone());

            // Spawn task to handle the WebSocket
            actix_web::rt::spawn(async move {
                handle_websocket_connection(msg_stream, &mut session, player_uuid.to_string(), &mut client_rx, client_tx, data).await;
            });

            Ok(response)
        }
        Err(_) => {
            Ok(HttpResponse::BadRequest().finish())
        }
    }
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
    #[serde(alias="place_hex_pair")]
    PlaceHexPair(WsPlaceHexPair),
}

async fn handle_websocket_connection(
    stream: actix_ws::MessageStream,
    session: &mut actix_ws::Session,
    client_id: String,
    client_rx: &mut mpsc::UnboundedReceiver<String>,
    client_tx: mpsc::UnboundedSender<String>,
    app_state: Data<AppState>,
) {
    let mut stream = stream
        .max_frame_size(128 * 1024)
        .aggregate_continuations()
        .max_continuation_size(2 * 1024 * 1024);

    let mut hb_interval = interval(HEARTBEAT_INTERVAL);
    let mut last_heartbeat = Instant::now();
    let _ = session.ping(b"").await;

    loop {
        tokio::select! {
            _ = hb_interval.tick() => {
                if Instant::now().duration_since(last_heartbeat) > CLIENT_TIMEOUT {
                    println!("Client heartbeat failed, disconnecting: {}", client_id);
                    break;
                }

                if session.ping(b"").await.is_err() {
                    println!("Failed to send ping to client {}, disconnecting", client_id);
                    break;
                }
            }

            message = stream.next() => { // Process incoming messages
                match message {
                    Some(Ok(msg)) => {
                        last_heartbeat = Instant::now();

                        // if let Err(e) = app_state.rooms_state.write().unwrap().update_client_activity(&client_id) {
                        //     error_log(format!("data.rooms_state.write(), {:?}", e));
                        // }

                        app_state.rooms_state.write().unwrap().update_client_activity(&client_id);

                        match msg {
                            AggregatedMessage::Text(text) => {
                                match serde_json::from_str::<WsMessage>(&text) {
                                    Ok(ws_message) => {
                                        match ws_message {
                                            // WsMessage::Register(registration_payload) => {
                                            //     println!("{:?}", registration_payload);
                                            //     ws_register(&app_state, session, &registration_payload).await;
                                            // }
                                            WsMessage::JoinGame(join_game_payload) => {
                                                println!("{:?}", join_game_payload);
                                                ws_join_game(&app_state, session, &join_game_payload).await;
                                            }
                                            WsMessage::LeaveGame(leave_game_payload) => {
                                                println!("{:?}", leave_game_payload);
                                                ws_leave_game(&app_state, session, &leave_game_payload).await;
                                            }
                                            WsMessage::ReadyChange(check_ready_payload) => {
                                                println!("{:?}", check_ready_payload);
                                                ws_ready_change(&app_state, &check_ready_payload).await;
                                            }
                                            WsMessage::PlaceHexPair(place_hex_pair_payload) => {
                                                println!("{:?}", place_hex_pair_payload);
                                                ws_place_hex_pair(&app_state, &place_hex_pair_payload).await;
                                            }
                                        }
                                    },
                                    Err(e) =>/**/ println!("Could not parse status: {}\n", e)
                                }
                            }
                            AggregatedMessage::Ping(bytes) => {
                                if session.pong(b"").await.is_err() {
                                    break;
                                }
                            }
                            AggregatedMessage::Pong(_) => {
                                // Client responded to our ping, nothing to do
                            }
                            AggregatedMessage::Close(_) => {
                                break;
                            }
                            _ => {}
                        }
                    }
                    Some(Err(e)) => {
                        println!("Error receiving message for client {}: {:?}", client_id, e);
                        break;
                    }
                    None => {
                        // WebSocket stream ended
                        break;
                    }
                }
            }

            // Process outgoing messages
            message = client_rx.recv() => {
                match message {
                    Some(text) => {
                        if let Err(e) = session.text(text).await {
                            println!("Error sending message to client {}: {:?}", client_id, e);
                            break;
                        }
                    }
                    None => {
                        // Channel was closed
                        break;
                    }
                }
            }
        }
    }

    // Client disconnected - clean up
    println!("WebSocket connection closing: {}", client_id);
    app_state.rooms_state.write().unwrap().remove_client(&client_id);
}

async fn leave_room(client_id: &str, room_name: &str, rooms_state: &Arc<Mutex<RoomsState>>) {
    if let Ok(mut state) = rooms_state.lock() {
        state.leave_room(room_name, client_id);
    } else {
        println!("failed to acquire rooms_state.lock()")
    }
}

pub async fn cleanup_stale_clients(rooms_state: Data<Arc<RwLock<RoomsState>>>) -> impl Responder {
    let removed_clients = if let Ok(mut state) = rooms_state.write() {
        state.remove_stale_clients(CLIENT_TIMEOUT)
    } else {
        Vec::new()
    };

    let count = removed_clients.len();

    HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("Removed {} stale clients", count),
        "removed_clients": removed_clients
    }))
}

pub async fn start_cleanup_task(rooms_state: Arc<RwLock<RoomsState>>) {
    let cleanup_interval = Duration::from_secs(30); // Run cleanup every 30 seconds

    loop {
        sleep(cleanup_interval).await;

        if let Ok(mut state) = rooms_state.write() {
            let removed = state.remove_stale_clients(CLIENT_TIMEOUT);

            if !removed.is_empty() {
                println!("Cleanup task removed {} stale clients", removed.len());
            }
        }
    }
}
