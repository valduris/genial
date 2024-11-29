use std::collections::HashMap;
use std::sync::{Arc};
use parking_lot::RwLock;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use serde::Serializer;
use crate::game::HexPairsInBag;
use crate::util::error_log;

#[derive(Debug, Serialize, Deserialize, PartialEq, Copy, Clone)]
pub struct BoardHex {
    pub x: i8,
    pub y: i8,
    pub color: Color,
}

#[derive(Serialize)]
pub struct PlayerHex {
    color: Color,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Copy, Hash, Eq)]
pub enum Color {
    Red,
    Yellow,
    Orange,
    Blue,
    Green,
    Violet,
}

impl Color {
    pub fn as_str(&self) -> &'static str {
        match self {
            Color::Red => "red",
            Color::Yellow => "yellow",
            Color::Orange => "orange",
            Color::Blue => "blue",
            Color::Green => "green",
            Color::Violet => "violet",
        }
    }
}

pub type Games = Arc<RwLock<HashMap<Uuid, Arc<RwLock<Game>>>>>;

pub type Players = Arc<RwLock<HashMap<Uuid, Arc<RwLock<Player>>>>>;

#[derive(Debug, Serialize, Deserialize)]
pub struct Player {
    pub name: String,
    pub ready: bool,
    pub uuid: Uuid,
    pub id: i32,
    pub game_uuid: Option<Uuid>,
    pub hex_pairs: HexPairs,
    pub moves_in_turn: i8,
    pub progress: Progress,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Progress(HashMap<Color, u8>);

impl Progress {
    pub fn new() -> Progress {
        Progress(HashMap::from([
            (Color::Red, 0),
            (Color::Yellow, 0),
            (Color::Orange, 0),
            (Color::Blue, 0),
            (Color::Green, 0),
            (Color::Violet, 0),
        ]))
    }

    pub fn increment(&mut self, color: Color) {
        match self.0.get(&color) {
            Some(i) => self.0.insert(color, i + 1),
            None => self.0.insert(color, 1),
        };
    }

    pub fn is_genial(self, color: Color) -> bool {
        match self.0.get(&color) {
            Some(progress) => progress >= (&18).into(),
            None => false,
        }
    }

    pub fn sum(self, progress: Progress) -> Progress {
        self.0.iter().fold(Progress::new(), |mut acc: Progress, (color, value)| {
            match progress.0.get(color) {
                Some(other_value) => {
                    acc.0.insert(*color, (value + other_value).clamp(0, 18));
                }
                None => {
                    error_log(format!("color {} does not have a value in Progress", color.as_str()));
                }
            }
            return acc;
        })
    }
}

#[derive(PartialEq, Clone)]
pub struct Point {
    pub x: i8,
    pub y: i8,
}

pub type BoardHexPair = [BoardHex; 2];

pub type HexPair = [Color; 2];

pub type HexPairs = Vec<HexPair>;

pub struct Game {
    pub admin_uuid: Uuid,
    pub board_size: i32,
    pub hex_pairs_in_bag: HexPairsInBag,
    pub player_to_move: Option<Uuid>,
    pub name: String,
    pub show_progress: bool,
    pub status: String,
    pub uuid: Uuid,
    pub player_count: i8,
    pub players: Arc<RwLock<Vec<Uuid>>>, // ordered by move sequence
}

pub type Board = Vec<BoardHex>;

pub type Boards = Arc<RwLock<HashMap<Uuid, Arc<RwLock<Board>>>>>;
