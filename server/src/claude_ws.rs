use actix_web::{web, App, Error, HttpRequest, HttpResponse, HttpServer, Responder};
use actix_web::web::{Bytes, Data, Payload};
use actix_web::http::StatusCode;
use futures::{SinkExt, StreamExt};
use actix_web_actors::ws;
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;
use tokio::time::{interval, sleep};
use uuid::Uuid;
use serde::{Deserialize, Serialize};

// Constants for heartbeat mechanism
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

// Shared state for rooms
struct RoomsState {
    // Map of room name to set of client IDs
    rooms: HashMap<String, HashSet<String>>,
    // Map of client ID to sender
    clients: HashMap<String, mpsc::UnboundedSender<String>>,
    // Last activity timestamp for each client
    client_activity: HashMap<String, Instant>,
}

impl RoomsState {
    fn new() -> Self {
        Self {
            rooms: HashMap::new(),
            clients: HashMap::new(),
            client_activity: HashMap::new(),
        }
    }

    // Add client to a room
    fn join_room(&mut self, room_name: &str, client_id: &str) -> bool {
        let client_added = self.rooms
            .entry(room_name.to_string())
            .or_insert_with(HashSet::new)
            .insert(client_id.to_string());

        // Notify room about new user if client was added
        if client_added {
            let join_msg = format!("SYSTEM:User {} joined room {}", client_id, room_name);
            self.broadcast_to_room(room_name, &join_msg, Some(client_id));
        }

        // Update activity timestamp
        self.client_activity.insert(client_id.to_string(), Instant::now());

        client_added
    }

    // Remove client from a room
    fn leave_room(&mut self, room_name: &str, client_id: &str) -> bool {
        let mut client_removed = false;

        if let Some(room) = self.rooms.get_mut(room_name) {
            client_removed = room.remove(client_id);

            // Clean up empty rooms
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

    // Check if client is in a room
    fn is_in_room(&self, room_name: &str, client_id: &str) -> bool {
        self.rooms.get(room_name)
            .map_or(false, |clients| clients.contains(client_id))
    }

    // Broadcast a message to all clients in a room
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

    // Register a new client
    fn register_client(&mut self, client_id: &str, tx: mpsc::UnboundedSender<String>) {
        self.clients.insert(client_id.to_string(), tx);
        self.client_activity.insert(client_id.to_string(), Instant::now());
    }

    // Update client activity timestamp
    fn update_client_activity(&mut self, client_id: &str) {
        self.client_activity.insert(client_id.to_string(), Instant::now());
    }

    // Check for and remove stale clients
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

        // Remove each stale client
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

        // Leave each room
        for room_name in rooms_to_leave {
            self.leave_room(&room_name, client_id);
        }

        // Remove client
        self.clients.remove(client_id);
        self.client_activity.remove(client_id);
    }

    // Send a message to a specific client
    fn send_to_client(&self, client_id: &str, message: &str) -> bool {
        if let Some(tx) = self.clients.get(client_id) {
            tx.send(message.to_string()).is_ok()
        } else {
            false
        }
    }
}

// WebSocket handler
async fn websocket_handler(
    req: HttpRequest,
    stream: web::Payload,
    rooms_state: web::Data<Arc<Mutex<RoomsState>>>,
) -> Result<HttpResponse, Error> {
    // Upgrade the connection to a WebSocket
    let (response, stream) = actix_web::web::upgrade::upgrade(&req, stream)?;

    // Generate a unique client ID
    let client_id = Uuid::new_v4().to_string();

    // Create channels for communication
    let (client_tx, mut client_rx) = mpsc::unbounded_channel::<String>();

    // Register the client in the rooms state
    if let Ok(mut state) = rooms_state.lock() {
        state.register_client(&client_id, client_tx.clone());
    } else {
        return Err(actix_web::error::ErrorInternalServerError("Failed to lock state"));
    }

    // Spawn task to handle the WebSocket
    actix_web::rt::spawn(async move {
        handle_websocket_connection(stream, client_id, client_rx, client_tx, rooms_state).await;
    });

    Ok(response)
}

async fn handle_websocket_connection(
    mut stream: actix_web::web::upgrade::Upgraded,
    client_id: String,
    mut client_rx: mpsc::UnboundedReceiver<String>,
    client_tx: mpsc::UnboundedSender<String>,
    rooms_state: web::Data<Arc<Mutex<RoomsState>>>,
) {
    // Track client's rooms
    let mut client_rooms = HashSet::<String>::new();

    // Send the client ID to the client
    let _ = stream.send(actix_web::ws::Message::Text(format!("CONNECTED:{}", client_id))).await;

    // Set up heartbeat interval
    let mut hb_interval = interval(HEARTBEAT_INTERVAL);
    let mut last_heartbeat = Instant::now();

    // Send the initial ping
    let _ = stream.send(actix_web::ws::Message::Ping(Bytes::from_static(b""))).await;

    loop {
        tokio::select! {
            // Check heartbeat
            _ = hb_interval.tick() => {
                if Instant::now().duration_since(last_heartbeat) > CLIENT_TIMEOUT {
                    println!("Client heartbeat failed, disconnecting: {}", client_id);
                    break;
                }

                // Send ping
                if stream.send(actix_web::ws::Message::Ping(Bytes::from_static(b""))).await.is_err() {
                    println!("Failed to send ping to client {}, disconnecting", client_id);
                    break;
                }
            }

            // Process incoming messages
            message = stream.next() => {
                match message {
                    Some(Ok(msg)) => {
                        // Update heartbeat timestamp
                        last_heartbeat = Instant::now();

                        // Update activity in global state
                        if let Ok(mut state) = rooms_state.lock() {
                            state.update_client_activity(&client_id);
                        }

                        match msg {
                            actix_web::ws::Message::Text(text) => {
                                // Parse the message (format: "ROOM_NAME:MESSAGE")
                                if let Some(pos) = text.find(':') {
                                    let (room_name, message) = text.split_at(pos);
                                    let message = &message[1..]; // Skip the colon

                                    if let Ok(mut state) = rooms_state.lock() {
                                        if state.is_in_room(room_name, &client_id) {
                                            // Format the message with sender ID
                                            let formatted_msg = format!("{}:{}", client_id, message);

                                            // Broadcast to room
                                            state.broadcast_to_room(room_name, &formatted_msg, Some(&client_id));
                                        }
                                    }
                                }
                            }
                            actix_web::ws::Message::Ping(bytes) => {
                                if stream.send(actix_web::ws::Message::Pong(bytes)).await.is_err() {
                                    break;
                                }
                            }
                            actix_web::ws::Message::Pong(_) => {
                                // Client responded to our ping, nothing to do
                            }
                            actix_web::ws::Message::Close(_) => {
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
                        if let Err(e) = stream.send(actix_web::ws::Message::Text(text)).await {
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
    if let Ok(mut state) = rooms_state.lock() {
        state.remove_client(&client_id);
    }
}

// Function to join a room
async fn join_room(
    client_id: &str,
    room_name: &str,
    rooms_state: &Arc<Mutex<RoomsState>>,
) -> bool {
    if let Ok(mut state) = rooms_state.lock() {
        state.join_room(room_name, client_id)
    } else {
        false
    }
}

// Function to leave a room
async fn leave_room(
    client_id: &str,
    room_name: &str,
    rooms_state: &Arc<Mutex<RoomsState>>,
) -> bool {
    if let Ok(mut state) = rooms_state.lock() {
        state.leave_room(room_name, client_id)
    } else {
        false
    }
}

// REST API for room management
mod api {
    use super::*;

    #[derive(Deserialize)]
    pub struct JoinRoomRequest {
        client_id: String,
        room_name: String,
    }

    #[derive(Serialize)]
    pub struct RoomResponse {
        success: bool,
        message: String,
    }

    // Join room endpoint
    pub async fn join_room(
        req: web::Json<JoinRoomRequest>,
        rooms_state: web::Data<Arc<Mutex<RoomsState>>>,
    ) -> impl Responder {
        let client_id = &req.client_id;
        let room_name = &req.room_name;

        let result = super::join_room(client_id, room_name, rooms_state.get_ref()).await;

        let message = if result {
            format!("Client {} joined room {}", client_id, room_name)
        } else {
            "Failed to join room".to_string()
        };

        HttpResponse::Ok().json(RoomResponse {
            success: result,
            message,
        })
    }

    // Leave room endpoint
    pub async fn leave_room(
        req: web::Json<JoinRoomRequest>,
        rooms_state: web::Data<Arc<Mutex<RoomsState>>>,
    ) -> impl Responder {
        let client_id = &req.client_id;
        let room_name = &req.room_name;

        let result = super::leave_room(client_id, room_name, rooms_state.get_ref()).await;

        let message = if result {
            format!("Client {} left room {}", client_id, room_name)
        } else {
            "Failed to leave room".to_string()
        };

        HttpResponse::Ok().json(RoomResponse {
            success: result,
            message,
        })
    }

    // Endpoint to check and remove stale clients
    pub async fn cleanup_stale_clients(
        rooms_state: web::Data<Arc<Mutex<RoomsState>>>,
    ) -> impl Responder {
        let removed_clients = if let Ok(mut state) = rooms_state.lock() {
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
}

// Background cleanup task
async fn start_cleanup_task(rooms_state: Arc<Mutex<RoomsState>>) {
    let cleanup_interval = Duration::from_secs(30); // Run cleanup every 30 seconds

    loop {
        // Sleep for the interval
        sleep(cleanup_interval).await;

        // Check and remove stale clients
        if let Ok(mut state) = rooms_state.lock() {
            let removed = state.remove_stale_clients(CLIENT_TIMEOUT);

            if !removed.is_empty() {
                println!("Cleanup task removed {} stale clients", removed.len());
            }
        }
    }
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let rooms_state = Arc::new(Mutex::new(RoomsState::new()));

    // Start background cleanup task
    let cleanup_state = rooms_state.clone();
    tokio::spawn(async move {
        start_cleanup_task(cleanup_state).await;
    });

    println!("Starting WebSocket server at 127.0.0.1:8080");

    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(rooms_state.clone()))
            .route("/ws", web::get().to(websocket_handler))
            .service(
                web::scope("/api")
                    .route("/join", web::post().to(api::join_room))
                    .route("/leave", web::post().to(api::leave_room))
                    .route("/cleanup", web::post().to(api::cleanup_stale_clients))
            )
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}