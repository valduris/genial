use actix_web::{web, Error, HttpRequest, HttpResponse, Responder};
use actix_web::web::{Data};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex, RwLock};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use tokio::time::{interval, sleep};
use uuid::Uuid;
use actix_ws::{AggregatedMessage};
use futures_util::{StreamExt as _};
use crate::AppState;
use crate::ws_actions::{ws_join_game, ws_register, WsMessage};

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug)]
pub struct RoomsState {
    // Map of room name to set of client IDs
    rooms: HashMap<String, HashSet<String>>,
    // Map of client ID to sender
    clients: HashMap<String, mpsc::UnboundedSender<String>>,
    // Last activity timestamp for each client
    client_activity: HashMap<String, Instant>,
}

impl RoomsState {
    pub fn new() -> Self {
        Self {
            rooms: HashMap::new(),
            clients: HashMap::new(),
            client_activity: HashMap::new(),
        }
    }

    pub fn join_room(&mut self, room_name: &str, client_id: &str) -> bool {
        let client_added = self.rooms
            .entry(room_name.to_string())
            .or_insert_with(HashSet::new)
            .insert(client_id.to_string());

        if client_added {
            let join_msg = format!("SYSTEM:User {} joined room {}", client_id, room_name);
            self.broadcast_to_room(room_name, &join_msg, Some(client_id));
        }

        self.client_activity.insert(client_id.to_string(), Instant::now());

        client_added
    }

    fn leave_room(&mut self, room_name: &str, client_id: &str) -> bool {
        let mut client_removed = false;

        if let Some(room) = self.rooms.get_mut(room_name) {
            client_removed = room.remove(client_id);

            if room.is_empty() {
                self.rooms.remove(room_name);
            }
        }

        // Notify room about user leaving if client was removed
        if client_removed {
            let leave_msg = format!("SYSTEM:User {} left room {}", client_id, room_name);
            self.broadcast_to_room(room_name, &leave_msg, None);
        }

        client_removed
    }

    fn is_in_room(&self, room_name: &str, client_id: &str) -> bool {
        self.rooms.get(room_name)
            .map_or(false, |clients| clients.contains(client_id))
    }

    fn broadcast_to_room(&self, room_name: &str, message: &str, skip_client_id: Option<&str>) {
        if let Some(room) = self.rooms.get(room_name) {
            for client_id in room {
                if skip_client_id.map_or(true, |id| id != client_id) {
                    if let Some(client_tx) = self.clients.get(client_id) {
                        let _ = client_tx.send(message.to_string());
                    }
                }
            }
        }
    }

    fn register_client(&mut self, client_id: &str, tx: mpsc::UnboundedSender<String>) {
        self.clients.insert(client_id.to_string(), tx);
        self.client_activity.insert(client_id.to_string(), Instant::now());
    }

    fn update_client_activity(&mut self, client_id: &str) {
        self.client_activity.insert(client_id.to_string(), Instant::now());
    }

    fn remove_stale_clients(&mut self, timeout: Duration) -> Vec<String> {
        let now = Instant::now();
        let stale_clients: Vec<String> = self.client_activity
            .iter()
            .filter_map(|(id, last_activity)| {
                if now.duration_since(*last_activity) > timeout {
                    Some(id.clone())
                } else {
                    None
                }
            })
            .collect();

        for client_id in &stale_clients {
            self.remove_client(client_id);
            println!("Removed stale client: {}", client_id);
        }

        stale_clients
    }

    // Remove a client from all rooms and clean up
    fn remove_client(&mut self, client_id: &str) {
        // Get all rooms the client is in
        let rooms_to_leave: Vec<String> = self.rooms.iter()
            .filter_map(|(room_name, clients)| {
                if clients.contains(client_id) {
                    Some(room_name.clone())
                } else {
                    None
                }
            })
            .collect();

        for room_name in rooms_to_leave {
            self.leave_room(&room_name, client_id);
        }

        self.clients.remove(client_id);
        self.client_activity.remove(client_id);
    }

    fn send_to_client(&self, client_id: &str, message: &str) -> bool {
        if let Some(tx) = self.clients.get(client_id) {
            tx.send(message.to_string()).is_ok()
        } else {
            false
        }
    }
}

pub async fn websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    data: Data<AppState>,
) -> Result<HttpResponse, Error> {
    let (response, mut session, msg_stream) = actix_ws::handle(&req, stream)?;
    let client_id = Uuid::new_v4().to_string();
    let (client_tx, mut client_rx) = mpsc::unbounded_channel::<String>();

    data.rooms_state.write().unwrap().register_client(&client_id, client_tx.clone());

    // Spawn task to handle the WebSocket
    actix_web::rt::spawn(async move {
        handle_websocket_connection(msg_stream, &mut session, client_id, &mut client_rx, client_tx, data).await;
    });

    Ok(response)
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
