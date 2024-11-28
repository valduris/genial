use std::collections::HashMap;
use std::iter::{Iterator};
use std::sync::{Arc, RwLock};
use serde::Serialize;
use crate::types::{Board, BoardHex, BoardHexPair, Color, HexPair, Point, Progress};
use lazy_static::lazy_static;

lazy_static! {
    pub static ref COLORS: Vec<Color> = {
        vec![Color::Red, Color::Blue, Color::Green, Color::Orange, Color::Yellow, Color::Violet]
    };

    static ref SPECIAL_CORNER_COORDINATES: Vec<(i8, i8)> = {
        vec![(-6, 0), (0, -6), (6, 0), (-6, 6), (0, 6), (6, -6)]
    };

    static ref SPECIAL_CORNERS: Vec<BoardHex> = {
        SPECIAL_CORNER_COORDINATES.iter().enumerate().map(|(index, point)| {
            BoardHex { x: point.0, y: point.1, color: COLORS[index] }
        }).collect()
    };

    static ref DIRECTIONS: Vec<(i8, i8)> = {
        SPECIAL_CORNER_COORDINATES.iter().map(|pair| (pair.0 / 6, pair.1 / 6)).collect()
    };

    static ref SPECIAL_POINT_NEIGHBORS: HashMap<Color, (Color, Color)> = HashMap::from([
        (Color::Red, (Color::Violet, Color::Orange)),
        (Color::Violet, (Color::Red, Color::Blue)),
        (Color::Blue, (Color::Violet, Color::Green)),
        (Color::Green, (Color::Blue, Color::Yellow)),
        (Color::Yellow, (Color::Green, Color::Orange)),
        (Color::Orange, (Color::Yellow, Color::Red)),
    ]);
}

pub fn get_cols_by_row(row: i32, board_size: i32) -> i32 {
    board_size * 2 - 1 + (row * (if row > 0 { -1 } else { 1 }))
}

pub fn is_coordinate_valid(point: &Point, board_size: i32) -> bool {
    let col = point.x as i32;
    let row = point.y as i32;
    
    if row > board_size || row < -board_size {
        return false;
    }
    
    let x_min = if row <= 0 { -(board_size) - row } else { -(board_size) };
    let x_max = get_cols_by_row(row, board_size) -x_min.abs() + 1;
    
    col >= x_min && col <= x_max
}

pub fn get_next_point_in_direction(point: Point, direction: (i8, i8) /* [-1, 0] | [0, -1] | [1, 0] | [-1, 1] | [0, 1] | [1, -1] */) -> Point {
    Point {
        x: point.x + 1 * direction.0,
        y: point.y + 1 * direction.1,
    }
}

pub fn get_color_by_point(board: &Vec<BoardHex>, point: Point) -> Option<Color> {
    let board_hex: Option<&BoardHex> = board.iter().find(|board_hex| {
        board_hex.x == point.x && board_hex.y == point.y
    });

    if board_hex.is_none() {
         match get_special_hex_point_by_point(&point) {
             Some(point) => {
                 return Some(point.color);
             }
             None => {
                 return None::<Color>;
             }
         }
    }

    board_hex?.color.into()
}

pub fn calculate_progress_gained(board: Board, hex_pair: BoardHexPair) -> Progress {
    let mut progress_gained: Progress = Progress::new();

    [0, 1].iter().for_each(|i: &usize| {
        DIRECTIONS.iter().for_each(|direction| {
            let mut temp_point = get_next_point_in_direction(Point { x: hex_pair[*i].x, y: hex_pair[0].y }, *direction);
            loop {
                let color = get_color_by_point(&board, temp_point.clone());

                if color.is_some() && color.unwrap() == hex_pair[0].color {
                    progress_gained.increment(color.unwrap());
                } else {
                    break;
                }

                temp_point = get_next_point_in_direction(temp_point, *direction);
            }
        });
    });

    progress_gained
}

pub const SPECIAL_HEX_POINTS: [BoardHex; 6] = [
    BoardHex { color: Color::Red, x: -6, y: 0 },
    BoardHex { color: Color::Blue, x: 0, y: -6 },
    BoardHex { color: Color::Green, x: 6, y: 0 },
    BoardHex { color: Color::Orange, x: -6, y: 6 },
    BoardHex { color: Color::Yellow, x: 0, y: 6 },
    BoardHex { color: Color::Violet, x: 6, y: -6 }
];

pub fn get_special_hex_point_by_point(point: &Point) -> Option<BoardHex> {
    SPECIAL_HEX_POINTS.into_iter().find(|p| point.x == p.x && point.y == p.y)
}

pub fn is_point_special(point: &Point) -> bool {
    SPECIAL_HEX_POINTS.into_iter().any(|p| p.x == point.x && p.y == point.y)
}

pub fn is_point_covered_with_hex(board: &Board /* Vec<BoardHex> */, point: &Point) -> bool {
    board.into_iter().any(|board_hex: &BoardHex| board_hex.x == point.x && board_hex.y == point.y)
}

pub fn equal_colors(board_hex_1: BoardHex, board_hex_2: BoardHex) -> bool {
    board_hex_1.color == board_hex_2.color
}

pub fn is_valid_hex_pair_placement(board: &Board, board_size: i32, hex_pair: BoardHexPair) -> bool {
    let p1: Point = Point { x: hex_pair[0].x, y: hex_pair[0].y };
    let p2: Point = Point { x: hex_pair[1].x, y: hex_pair[1].y };

    if !is_coordinate_valid(&p1, board_size) || !is_coordinate_valid(&p2, board_size) {
        return false;
    }

    // special ? not_covered && matches_color : not_covered =>
    // not_covered && special ? matches_color : true
    (!is_point_covered_with_hex(board, &p1) && if is_point_special(&p1) {
        let special_hex = get_special_hex_point_by_point(&p1);
        // assert!(special_hex.is_some(), error_log(format!("special hex not found for point ...")));
        equal_colors(hex_pair[0], special_hex.unwrap())
    } else {
        true
    }) && (!is_point_covered_with_hex(board, &p2) && if is_point_special(&p2) {
        let special_hex = get_special_hex_point_by_point(&p2);
        // assert!(special_hex.is_some(), error_log(format!("special hex not found for point ...")));
        equal_colors(hex_pair[1], special_hex.unwrap())
    } else {
        true
    })
}

#[derive(Serialize, Clone)]
pub struct HexPairsInBag(Arc<RwLock<Vec<HexPair>>>);

impl HexPairsInBag {
    pub fn new() -> HexPairsInBag {
        HexPairsInBag(Arc::new(RwLock::new(
            COLORS.iter().fold(Vec::new(), |mut acc, color| {
                COLORS.iter().for_each(|inner_color| {
                    acc.push([*color, *inner_color ]);
                    acc.push([*inner_color, *color ]);
                });
                SPECIAL_POINT_NEIGHBORS.get(color).iter().for_each(|neighbors| {
                    acc.push([*color, neighbors.0]);
                    acc.push([*color, neighbors.1]);
                });
                acc
            }).into_iter().collect()
        )))
    }
    pub fn take_random_hex_pair(self) -> HexPair {
        let mut writable = self.0.write().unwrap();
        let index = (rand::random::<f32>() * writable.len() as f32).floor() as usize;
        let value = writable.remove(index);
        value
    }
}

// #[test]
// fn takes_random_hex_and_removes_from_vec() {
//     let pairs = HexPairsInBag::new();
//     pairs.take_random_hex_pair();
//     assert_eq!(pairs.pairs.take().len(), 10)
// }
