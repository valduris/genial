import { Color, Direction, HexColor, SpecialCorners } from "../types";

export const COLORS: Color[] = ["red", "blue", "green", "orange", "yellow", "violet"];

export const PROGRESS_COLORS: HexColor[] = [
    "#FFA847", "#F2A943", "#E5AB3F", "#D9AD3B", "#CCAF38", "#C0B134", "#B3B330", "#A6B52C", "#9AB729", "#8DB925",
    "#81BA21", "#74BC1D", "#68BE1A", "#5BC016", "#4EC212", "#42C40E", "#35C60B", "#29C807", "#1CCA03", "#10CC00",
];

export const SPECIAL_CORNER_COORDINATES = [[-6, 0], [0, -6], [6, 0], [-6, 6], [0, 6], [6, -6]];

export const SPECIAL_CORNERS: SpecialCorners = SPECIAL_CORNER_COORDINATES.reduce((memo: SpecialCorners, point, index) => {
    return memo.concat([{ x: point[0], y: point[1], color: COLORS[index] }]) as SpecialCorners;
}, [] as unknown as SpecialCorners);

export const DIRECTIONS: Direction[] = SPECIAL_CORNER_COORDINATES.map(pair => [pair[0] / 6, pair[1] / 6] as Direction);