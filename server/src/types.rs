use std::collections::HashMap;
use std::io::Read;
use std::ops::Deref;
use std::sync::{Arc};
use tokio::sync::RwLock;
use serde::{Deserialize, Serialize};
// use serde_json::SerializerSerializer;
use uuid::Uuid;
use serde::Serializer;
use crate::game::HexPairsToBeDrawn;

#[derive(Debug, Serialize, Deserialize)]
pub struct BoardHex {
    pub x: i8,
    pub y: i8,
    pub color: Color,
}

#[derive(Serialize)]
pub struct PlayerHex {
    color: Color,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum Color {
    Red,
    Yellow,
    Orange,
    Blue,
    Green,
    Violet,
}

impl Color {
    fn as_str(&self) -> &'static str {
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

pub type Games = Arc<RwLock<HashMap<Uuid, Game>>>;

pub type Players = Arc<RwLock<HashMap<Uuid, Arc<RwLock<Player>>>>>;

#[derive(Debug, Serialize, Deserialize)]
pub struct Player {
    pub name: String,
    pub ready: bool,
    pub uuid: Uuid,
    pub id: i32,
    pub game_uuid: Option<Uuid>,
    pub hex_pairs: Vec<HexPair>,
    pub moves_in_turn: i8,
    pub progress: Progress,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProgressValue(pub u16);
// https://stackoverflow.com/questions/27673674/is-there-a-way-to-create-a-data-type-that-only-accepts-a-range-of-values

impl ProgressValue {
    fn new(progressValue: u16) -> Option<ProgressValue> {
        if progressValue > 0 && progressValue < 19 {
            Some(ProgressValue(progressValue))
        } else {
            None
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Progress {
    pub red: ProgressValue,
    pub yellow: ProgressValue,
    pub orange: ProgressValue,
    pub blue: ProgressValue,
    pub green: ProgressValue,
    pub violet: ProgressValue,
}

impl Progress {
    pub fn new() -> Progress {
        Progress {
            red: ProgressValue(0),
            yellow: ProgressValue(0),
            orange: ProgressValue(0),
            blue: ProgressValue(0),
            green: ProgressValue(0),
            violet: ProgressValue(0),
        }
    }
}

pub struct Point {
    pub x: i8,
    pub y: i8,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BoardHexPair(pub BoardHex, pub BoardHex);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HexPair(pub Color, pub Color);

pub type HexPairs = Vec<HexPair>;

pub type SpecialCorners = (BoardHex, BoardHex, BoardHex, BoardHex, BoardHex, BoardHex);

#[derive(Serialize)]
pub struct Game {
    pub admin_uuid: Uuid,
    pub board_size: i32,
    pub hex_pairs_to_be_drawn: HexPairsToBeDrawn,
    pub first_move_player_index: Option<u8>,
    pub name: String,
    pub show_progress: bool,
    pub status: String,
    pub uuid: Uuid,
    pub player_count: i8,
    pub players: Vec<Uuid>,
}

pub struct Board(pub Vec<BoardHex>);

pub type Boards = Arc<RwLock<HashMap<Uuid, Board>>>;

// impl Default for Boards {
//     fn default() -> Self {
//         Boards(Arc::new(RwLock::new(HashMap::new())))
//     }
// }

// impl fmt::Debug for BoardHexPair {
//     fn fmt(&self, fmt: &mut fmt::Formatter<'_>) -> fmt::Result {
//         fmt.debug_tuple("BoardHexPair")
//             .field(&self.0)
//             .field(&self.1)
//             .finish()
//     }
// }

// pub type Direction = [-1, 0] | [0, -1] | [1, 0] | [-1, 1] | [0, 1] | [1, -1];
