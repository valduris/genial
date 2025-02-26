use actix_web::{web, Error, HttpRequest, HttpResponse};
use tokio::task::spawn_local;
use crate::AppState;
pub use crate::ws_server::{ChatServer, ChatServerHandle};

pub type ConnId = usize;

pub type RoomId = String;

/// Message sent to a room/client.
pub type Msg = String;

/// Handshake and start WebSocket handler with heartbeats.
pub async fn chat_ws(
    req: HttpRequest,
    stream: web::Payload,
    state: web::Data<AppState>,
) -> Result<HttpResponse, Error> {
    let (res, session, msg_stream) = actix_ws::handle(&req, stream)?;

    // spawn websocket handler (and don't await it) so that the response is returned immediately
    spawn_local(crate::ws_handler::chat_ws(
        (state.ws_tx).clone(),
        session,
        msg_stream,
    ));

    Ok(res)
}