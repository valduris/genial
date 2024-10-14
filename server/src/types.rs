pub struct BoardHex {
    x: i8,
    y: i8,
    color: Color,
}

pub struct PlayerHex {
    color: Color,
    selected: bool,
}

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


#[derive(Debug)]
pub struct ProgressValue(u16);
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

#[derive(Debug)]
pub struct BoardSize(u16);
// https://stackoverflow.com/questions/27673674/is-there-a-way-to-create-a-data-type-that-only-accepts-a-range-of-values

impl BoardSize {
    pub fn new(board_size: u16) -> Option<BoardSize> {
        if board_size >= 6 && board_size <= 8 {
            Some(BoardSize(board_size))
        } else {
            None
        }
    }
}

pub struct PlayerHexPairIndex(i8); // 0 | 1 | 2 | 3 | 4 | 5;

pub struct Progress {
    red: ProgressValue,
    yellow: ProgressValue,
    orange: ProgressValue,
    blue: ProgressValue,
    green: ProgressValue,
    violet: ProgressValue,
}

// pub type Direction = [-1, 0] | [0, -1] | [1, 0] | [-1, 1] | [0, 1] | [1, -1];

pub struct Player {
    name: String,
    hex_pairs: PlayerHexPairs,
    moves_in_turn: i8,
}

pub struct Point {
    x: i8,
    y: i8,
}

pub type BoardHexPair = (BoardHex, BoardHex);

pub type PlayerHexPair = (PlayerHex, PlayerHex);

pub type BoardHexPairs = Vec<BoardHexPair>;

pub type PlayerHexPairs = (
    Option<PlayerHexPair>,
    Option<PlayerHexPair>,
    Option<PlayerHexPair>,
    Option<PlayerHexPair>,
    Option<PlayerHexPair>,
    Option<PlayerHexPair>,
);

pub struct DrawableHex {
    color: Color,
}

pub type DrawableHexPair = (DrawableHex, DrawableHex);

pub type DrawableHexPairs = Vec<DrawableHexPair>;

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

pub struct Game {
    admin_uuid: String,
    board_size: BoardSize,
    hex_pairs: BoardHexPairs,   
    name: String,
    player_count: u8,
    public: bool,
    show_progress: bool,
    status: String,
    uuid: String,

    // finished: false,
    // players: Record<Uuid4, {
    //     uuid: Uuid4,
    //     name: String,
    //     progress?: Progress,
    //     ready: bool,
    // }>,
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
