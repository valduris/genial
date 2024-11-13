use std::io::prelude::*;
use std::{time::Duration};
use std::collections::HashMap;
use std::sync::RwLock;
use actix_web::{Responder, web, HttpResponse};
use actix_web::{error::ResponseError, http::StatusCode};
use actix_web::rt::time::interval;
use actix_web_lab::extract::Path;
use rand::{random, Rng};
use sqlx::{Error, FromRow, Row};
use serde_json::json;
use serde::{Deserialize, Serialize};
use sqlx::types::JsonValue;
use uuid::Uuid;

use crate::types::{BoardSize, Game, Player, Color, Progress, BoardHexPair, BoardHex, HexPair};
use crate::AppState;
use crate::util::handle_postgres_query_result;
use crate::game::HexPairsToBeDrawn;

// pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
#[derive(sqlx::FromRow, Debug, Serialize)]
struct ApiGame {
    uuid: String,
    name: String,
    boardSize: i32,
    playerCount: i32,
    showProgress: bool,
    status: String,
    players: Vec<serde_json::Value>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct CreateGameSchema {
    pub name: String,
    pub boardSize: i32,
    pub playerCount: i32,
    pub showProgress: bool,
    pub playerUuid: Uuid,
}

pub async fn api_game_create(body: web::Json<CreateGameSchema>, data: web::Data<AppState>) -> impl Responder {
    let uuid = Uuid::new_v4();
    let query_result  = sqlx::query(
        r#"INSERT INTO game (uuid, name, board_size, player_count, show_progress, admin_uuid) VALUES ($1, $2, $3, $4, $5, $6)"#,
    )
        .bind(uuid)
        .bind(body.name.to_string())
        .bind(body.boardSize.clone())
        .bind(body.playerCount)
        .bind(body.showProgress)
        .bind(body.playerUuid.clone())
        .execute(&data.postgres_pool)
        .await;

    data.games.write().unwrap().insert(
        uuid,
        Game {
            first_move_player_index: rand::thread_rng().gen_range(0..body.playerCount as u8), // TODO determine at game start
            hex_pair_placement_history: RwLock::new(Vec::new()),
            admin_uuid: body.playerUuid.clone(),
            board_size: BoardSize(body.boardSize),
            hex_pairs_on_board: RwLock::new(vec!((BoardHexPair (BoardHex { color: Color::Red, x: 0, y: 0 }, BoardHex { color: Color::Red, x: 0, y: 0 })))),
            hex_pairs_to_be_drawn: HexPairsToBeDrawn::new(),
            name: body.name.clone(),
            public: true,
            show_progress: body.showProgress,
            status: "in_progress".to_string(),
            uuid: uuid,
            players: HashMap::from([(body.playerUuid.clone(), Player {
                name: "playerName".to_string(),
                hex_pairs: vec![
                    HexPair(Color::Blue, Color::Red),
                    HexPair(Color::Orange, Color::Red),
                    HexPair(Color::Blue, Color::Blue),
                    HexPair(Color::Yellow, Color::Green),
                    HexPair(Color::Red, Color::Orange),
                    HexPair(Color::Violet, Color::Yellow),
                ],
                progress: Progress::new(),
                moves_in_turn: 1,
            })])
        }
    );

    data.broadcaster.broadcast(json!({ "type": "game_created", "game": data.games.read().unwrap().get(&uuid) }).to_string().as_str()).await;

    match query_result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({"status": "success","data": serde_json::json!({
                "name": body.name,
                "boardSize": body.boardSize,
                "playerCount": body.playerCount,
                "uuid": uuid,
                "showProgress": body.showProgress
            })}));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({"status": "error","message": format!("{:?}", e)}));
        }
    }
}

#[derive(sqlx::FromRow, Debug, Serialize)]
struct ApiLobbyGame {
    players: Vec<serde_json::Value>,
    #[serde(rename(serialize = "gameUuid"))]
    game_uuid: String,
}

pub async fn api_get_games(state: web::Data<AppState>) -> impl Responder {
    let query = r#"
        SELECT
            g.name, g.uuid, g.board_size AS "boardSize", g.player_count AS "playerCount", g.status,
            g.show_progress AS "showProgress", COALESCE(
                array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) FILTER (WHERE p.id IS NOT NULL), '{}'
            ) players
        FROM game g
        LEFT JOIN player p ON g.uuid = p.game_uuid
        GROUP BY g.id;
    "#;
    let rows: Vec<ApiGame> = sqlx::query_as(query).fetch_all(&state.postgres_pool).await.unwrap();
    return HttpResponse::Ok().json(json!(rows));
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiLobbyGameSchema {
    pub gameUuid: String,
}

pub async fn api_get_lobby_game(body: web::Json<ApiLobbyGameSchema>, state: web::Data<AppState>) -> impl Responder {
    let rows: Vec<ApiGame> = sqlx::query_as(r#"
        select json_build_object(uuid, players) as game
        from (
            select g.uuid as uuid, array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) players
            from game g
            join player p on g.uuid = p.game_uuid
            where g.uuid = $1
            group by g.uuid
        ) players;
    "#).bind(body.gameUuid.clone()).fetch_all(&state.postgres_pool).await.unwrap();

    return HttpResponse::Ok().json(json!(rows));
}
#[derive(Serialize, Deserialize, Debug)]
pub struct GameJoinSchema {
    pub gameUuid: String,
    pub playerUuid: String,
}
pub async fn api_lobby_game_join(body: web::Json<GameJoinSchema>, data: web::Data<AppState>) -> impl Responder {
    let result  = sqlx::query(r#"INSERT INTO player (uuid, game_uuid) VALUES ($1, $2) ON CONFLICT (uuid) DO UPDATE SET game_uuid = $2"#)
        .bind(body.playerUuid.clone())
        .bind(body.gameUuid.clone())
        .execute(&data.postgres_pool)
        .await;

    let row: Vec<ApiLobbyGame> = sqlx::query_as(r#"
        SELECT g.uuid AS game_uuid, COALESCE(array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) FILTER (WHERE p.id IS NOT NULL), '{}') AS players
        FROM game g
        LEFT JOIN player p on g.uuid = p.game_uuid
        GROUP BY g.uuid
    "#).bind(body.gameUuid.clone()).fetch_all(&data.postgres_pool).await.unwrap();

    data.broadcaster.broadcast(json!({ "type": "player_joined", "value": row }).to_string().as_str()).await;

    return handle_postgres_query_result(result);
}
#[derive(Serialize, Deserialize, Debug)]
pub struct ApiPlayerReadySchema {
    pub playerUuid: String,
    pub ready: bool,
}

pub async fn api_lobby_player_ready(body: web::Json<ApiPlayerReadySchema>, data: web::Data<AppState>) -> impl Responder {
    let query = r#"UPDATE player SET ready = $1 WHERE uuid = $2"#;
    let result  = sqlx::query(query)
        .bind(body.ready)
        .bind(body.playerUuid.clone())
        .execute(&data.postgres_pool)
        .await;

    let row: ApiLobbyGame = sqlx::query_as(r#"
        SELECT g.uuid AS game_uuid, COALESCE(array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) FILTER (WHERE p.id IS NOT NULL), '{}') AS players
        FROM game g
        LEFT JOIN player p ON g.uuid = p.game_uuid
        GROUP BY g.uuid
    "#).fetch_one(&data.postgres_pool).await.unwrap();

    data.broadcaster.broadcast(json!({ "type": "player_joined", "value": row }).to_string().as_str()).await;

    return handle_postgres_query_result(result);
}

#[derive(Serialize, Deserialize, Debug)]
pub struct GameLeaveSchema {
    pub playerUuid: String,
    pub gameUuid: String,
}

pub async fn api_lobby_game_leave(body: web::Json<GameLeaveSchema>, data: web::Data<AppState>) -> impl Responder {
    let query_result = sqlx::query(r#"UPDATE player SET game_uuid = NULL, ready = FALSE WHERE uuid = $1"#)
        .bind(body.playerUuid.clone())
        .execute(&data.postgres_pool)
        .await;

    let row: ApiLobbyGame = sqlx::query_as(r#"
        select uuid as game_uuid, players
        from (
            select g.uuid as uuid, array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) players
            from game g
            join player p on g.uuid = p.game_uuid
            where g.uuid = $1
            group by g.uuid
        ) players;
    "#).bind(body.gameUuid.clone()).fetch_one(&data.postgres_pool).await.unwrap();

    data.broadcaster.broadcast(json!({ "type": "player_left", "value": row }).to_string().as_str()).await;

    return handle_postgres_query_result(query_result);
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ApiPlayerRegisterSchema {
    pub name: String,
    pub email: String,
    pub password: String,
}

pub async fn api_player_register(body: web::Json<ApiPlayerRegisterSchema>, data: web::Data<AppState>) -> impl Responder {
    let uuid = Uuid::new_v4();
    let query = r#"INSERT INTO player (uuid, name, email, password) VALUES ($1, $2, $3, $4)"#;
    let result  = sqlx::query(query)
        .bind(uuid).bind(body.name.clone()).bind(body.email.clone()).bind(body.password.clone())
        .execute(&data.postgres_pool)
        .await;

    return handle_postgres_query_result(result);
}