use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use crate::game::HexPairsToBeDrawn;

#[derive(Debug, Serialize, Deserialize)]
pub struct BoardHex {
    pub x: i8,
    pub y: i8,
    pub color: Color,
}

pub struct PlayerHex {
    color: Color,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Clone, Serialize)]
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

#[derive(Debug, Serialize)]
pub struct BoardSize(pub i32);

impl BoardSize {
    pub fn new(board_size: i32) -> Option<BoardSize> {
        if board_size >= 6 && board_size <= 8 {
            Some(BoardSize(board_size))
        } else {
            None
        }
    }
}

#[derive(Clone, Serialize)]
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

#[derive(Clone, Serialize)]
pub struct Player {
    pub name: String,
    pub hex_pairs: Vec<HexPair>,
    pub moves_in_turn: i8,
    pub progress: Progress,
}

pub struct Point {
    x: i8,
    y: i8,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BoardHexPair(pub BoardHex, pub BoardHex);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HexPair(pub Color, pub Color);

pub type HexPairs = Vec<HexPair>;
pub type BoardHexPairs = Vec<BoardHexPair>;

pub type SpecialCorners = (BoardHex, BoardHex, BoardHex, BoardHex, BoardHex, BoardHex);

pub struct LobbyGame {
    uuid: String,
    players: Vec<String>,
    name: String,
    board_size: BoardSize,
    player_count: u8,
    show_progress: bool,
}

pub type LobbyGames = Vec<LobbyGame>;

#[derive(Serialize)]
pub struct Game {
    pub admin_uuid: Uuid,
    pub board_size: BoardSize,
    pub hex_pairs_on_board: RwLock<BoardHexPairs>,
    pub hex_pairs_to_be_drawn: HexPairsToBeDrawn,
    pub first_move_player_index: u8,
    pub hex_pair_placement_history: RwLock<Vec<BoardHexPair>>,
    pub name: String,
    pub public: bool,
    pub show_progress: bool,
    pub status: String,
    pub uuid: Uuid,
    pub players: HashMap<Uuid, Player>,
}

// pub struct Genial {
//     loadingState: GamesLoadingState,
//     lobbyGames: LobbyGames,
//     eventSourceState: EventSourceState,
//     authenticated: bool,
//     playerUuid: Uuid4,
//     playerName: String,
//     menu: {
//         open: bool,
//         entries: MenuOption[],
//         selectedEntryIndex: i8,
//     },
//     game?: Game,
//     player: Player,
//     players: Record<Uuid4, Player>,
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
