import { BoardHexy, HexColor } from "./types";
import { createHexy } from "./utils";

export const SET_GENIAL_UI_STATE = "genial/SET_GENIAL_UI_STATE";

export const PROGRESS_COLORS: HexColor[] = [
    "#FFA847", "#F2A943", "#E5AB3F", "#D9AD3B", "#CCAF38", "#C0B134", "#B3B330", "#A6B52C", "#9AB729", "#8DB925",
    "#81BA21", "#74BC1D", "#68BE1A", "#5BC016", "#4EC212", "#42C40E", "#35C60B", "#29C807", "#1CCA03", "#10CC00",
];

export const SPECIAL_CORNERS: BoardHexy[] = [
    createHexy(1, 1, "red"),
    createHexy(6, 1, "blue"),
    createHexy(1, 6, "green"),
    createHexy(11, 6, "orange"),
    createHexy(1, 11, "yellow"),
    createHexy(6, 11, "violet"),
];