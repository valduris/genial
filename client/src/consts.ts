import { Color, Direction, HexColor, SpecialCorners } from "./types";
import { createHexy } from "./utils";

export const COLORS: Color[] = ["red", "blue", "green", "orange", "yellow", "violet"];

export const SET_GENIAL_UI_STATE = "genial/SET_GENIAL_UI_STATE";

export const SPECIAL_CORNER_COORDINATES = [[-6, 0], [0, -6], [6, 0], [-6, 6], [0, 6], [6, -6]];

export const SPECIAL_CORNERS: SpecialCorners = SPECIAL_CORNER_COORDINATES.reduce((memo: SpecialCorners, point, index) => {
    return memo.concat([createHexy(point[0], point[1], COLORS[index])]) as SpecialCorners;
}, [] as unknown as SpecialCorners);

export const DIRECTIONS: Direction[] = SPECIAL_CORNER_COORDINATES.map(pair => [pair[0] / 6, pair[1] / 6] as Direction);

export const MAX_PLAYER_COUNT = 4;

// ((8+9+10+11+12+13+14)*2+15)/2
// 84 / 6 = 14
