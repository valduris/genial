use std::sync::Arc;
use serde::Serialize;
use crate::types::{Board, BoardHex, BoardHexPair, Color, HexPair, Point};
use crate::util::error_log;

#[derive(Serialize)]
pub struct HexPairsToBeDrawn {
    pub pairs: Arc<Vec<HexPair>>,
}

impl HexPairsToBeDrawn {
    pub fn new() -> HexPairsToBeDrawn {
        HexPairsToBeDrawn {
            pairs: Arc::new(vec![
                 HexPair(Color::Red, Color::Blue),
                 HexPair(Color::Red, Color::Orange),
                 HexPair(Color::Red, Color::Violet),
                 HexPair(Color::Green, Color::Blue),
                 HexPair(Color::Violet, Color::Blue),
                 HexPair(Color::Violet, Color::Violet),
                 HexPair(Color::Violet, Color::Orange),
                 HexPair(Color::Red, Color::Orange),
                 HexPair(Color::Red, Color::Yellow),
                 HexPair(Color::Yellow, Color::Yellow),
            ])
        }
    }
    // pub fn take_random_hex_pair(self) -> HexPair {
        // let index = (rand::random::<f32>() * self.pairs.len() as f32).floor() as usize;
        // let value = self.pairs.get_mut().remove(index);
        // self.pairs.
        // value
    // }
}

// #[test]
// fn takes_random_hex_and_removes_from_vec() {
//     let pairs = HexPairsToBeDrawn::new();
//     pairs.take_random_hex_pair();
//     assert_eq!(pairs.pairs.take().len(), 10)
// }

pub fn get_cols_by_row(row: i8, board_size: i8) -> i8 {
    board_size * 2 - 1 + (row * (if row > 0 { -1 } else { 1 }))
}

pub fn is_coordinate_valid(point: Point, board_size: i8) -> bool {
    let col = point.x;
    let row = point.y;
    
    if row > board_size || row < -board_size {
        return false;
    }
    
    let x_min = if row <= 0 { -(board_size) - row } else { -(board_size) };
    let x_max = get_cols_by_row(row, board_size) -x_min.abs() + 1;
    
    col >= x_min && col <= x_max
}

// pub fn getNeighboringHexysOf(of: Pick<BoardHexy, "x" | "y">, game: Pick<Game, "hexyPairs" | "boardSize">): (BoardHexy | Point)[] {
//     return DIRECTIONS.reduce((memo: (BoardHexy | Point)[], direction) => {
//          const point = { x: of.x + direction[0], y: of.y + direction[1] };
//          const boardHexy: BoardHexy | undefined = game.hexyPairs.reduce((memo: BoardHexy | undefined, hexyPair) => {
//          return memo || hexyPair.find(hexy => hexy.x === point.x && hexy.y === point.y);
//     }, undefined);
//          return memo.concat(boardHexy ? [boardHexy] : isCoordinateValid(point, game.boardSize) ? [point] : []);
//     }, []);
// }
//
// pub const SPECIAL_CORNER_COORDINATES = [[-6, 0], [0, -6], [6, 0], [-6, 6], [0, 6], [6, -6]];
//
// pub const SPECIAL_CORNERS: SpecialCorners = SPECIAL_CORNER_COORDINATES.reduce((memo: SpecialCorners, point, index) => {
//     return memo.concat([createHexy(point[0], point[1], COLORS[index])]) as SpecialCorners;
// }, [] as unknown as SpecialCorners);
//
// pub const DIRECTIONS: Direction[] = SPECIAL_CORNER_COORDINATES.map(pair => [pair[0] / 6, pair[1] / 6] as Direction);
//
// pub fn areNeighbors(first: BoardHexy | Point, second: Point): boolean {
//     return DIRECTIONS.some(direction => {
//          return first.x === (second.x + direction[0]) && first.y === (second.y + direction[1]);
//     })
// }
//

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

pub fn is_point_covered_with_hex(hex_pairs: &Vec<BoardHexPair>, point: &Point) -> bool {
    hex_pairs.into_iter().any(|hex_pair| (hex_pair.0.x == point.x && hex_pair.0.y == point.y) || (hex_pair.1.x == point.x && hex_pair.1.y == point.y))
}

pub fn equal_colors(board_hex_1: BoardHex, board_hex_2: BoardHex) -> bool {
    board_hex_1.color == board_hex_2.color
}

pub fn is_valid_hex_pair_placement(hex_pairs: &Vec<BoardHexPair>, hex_pair: BoardHexPair) -> bool {
    let p1: Point = Point { x: hex_pair.0.x, y: hex_pair.0.y };
    let p2: Point = Point { x: hex_pair.1.x, y: hex_pair.1.y };

    // special ? not_covered && matches_color : not_covered =>
    // not_covered && special ? matches_color : true
    (!is_point_covered_with_hex(hex_pairs, &p1) && if is_point_special(&p1) {
        let special_hex = get_special_hex_point_by_point(&p1);
        // assert!(special_hex.is_some(), error_log(format!("special hex not found for point ...")));
        equal_colors(hex_pair.0, special_hex.unwrap())
    } else {
        true
    }) && (!is_point_covered_with_hex(hex_pairs, &p2) && if is_point_special(&p2) {
        let special_hex = get_special_hex_point_by_point(&p2);
        // assert!(special_hex.is_some(), error_log(format!("special hex not found for point ...")));
        equal_colors(hex_pair.1, special_hex.unwrap())
        } else {
            true
        }
    )
}
