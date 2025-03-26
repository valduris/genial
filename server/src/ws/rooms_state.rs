use std::collections::{HashMap, HashSet};
use std::time::{Duration, Instant};
use tokio::sync::mpsc;

#[derive(Debug)]
pub struct RoomsState {
    // Map of room name to set of client IDs
    rooms: HashMap<String, HashSet<String>>,
    // Map of client ID to sender
    pub clients: HashMap<String, mpsc::UnboundedSender<String>>,
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

    pub fn leave_room(&mut self, room_name: &str, client_id: &str) -> bool {
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

    pub fn broadcast_to_room(&self, room_name: &str, message: &str, skip_client_id: Option<&str>) {
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

    pub fn register_client(&mut self, client_id: &str, tx: mpsc::UnboundedSender<String>) {
        self.clients.insert(client_id.to_string(), tx);
        self.client_activity.insert(client_id.to_string(), Instant::now());
    }

    pub fn update_client_activity(&mut self, client_id: &str) {
        self.client_activity.insert(client_id.to_string(), Instant::now());
    }

    pub fn remove_stale_clients(&mut self, timeout: Duration) -> Vec<String> {
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
    pub fn remove_client(&mut self, client_id: &str) {
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