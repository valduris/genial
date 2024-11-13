use std::cell::Cell;
use std::sync::Arc;
use serde::Serialize;
use crate::types::{Color, HexPair};

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