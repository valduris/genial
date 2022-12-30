import {
    createBoardHexy,
    createBoardHexyPair,
    getColsByRow,
    getNeighboringHexysOf,
    isNeighborOf,
} from "../utils";
import { BoardHexyPairs } from "../types";

describe("utils", () => {
    describe("getNeighboringHexysOf", () => {
        it("returns neighboring hexys or points including board hexy pairs", () => {
            const boardHexyPairs: BoardHexyPairs = [
                createBoardHexyPair(createBoardHexy(1, 1, "red"), createBoardHexy(1, 2, "red")),
                createBoardHexyPair(createBoardHexy(4, 1, "blue"), createBoardHexy(5, 1, "blue")),
                createBoardHexyPair(createBoardHexy(7, 4, "violet"), createBoardHexy(7, 3, "violet")),
            ];
            const neighbors = getNeighboringHexysOf({ x: 1, y: 2 }, { hexyPairs: boardHexyPairs, boardSize: 6 });

            expect(neighbors).toEqual([
                {"x": 2, "y": 2},
                {"color": "red", "x": 1, "y": 1},
                {"x": 1, "y": 3},
                {"x": 2, "y": 3},
            ]);
        });

        it("returns neighboring hexys for middle row", () => {
            const neighbors = getNeighboringHexysOf({ x: 4, y: 6 }, { hexyPairs: [], boardSize: 6 });

            expect(neighbors).toEqual([
                { x: 3, y: 6 },
                { x: 5, y: 6 },
                { x: 4, y: 5 },
                { x: 4, y: 7 },
                { x: 3, y: 7 },
                { x: 3, y: 5 },
            ]);
        });

        it("returns neighboring hexys for a row greater than board size", () => {
            const neighbors = getNeighboringHexysOf({ x: 5, y: 8 }, { hexyPairs: [], boardSize: 6 });

            expect(neighbors).toEqual([
                { x: 4, y: 8 },
                { x: 6, y: 8 },
                { x: 5, y: 7 },
                { x: 5, y: 9 },
                { x: 4, y: 9 },
                { x: 6, y: 7 },
            ]);
        });

        it("returns neighboring hexys for middle row on a board with size 8", () => {
            const neighbors = getNeighboringHexysOf({ x: 6, y: 8 }, { hexyPairs: [], boardSize: 8 });

            expect(neighbors).toEqual([
                { x: 5, y: 8 },
                { x: 7, y: 8 },
                { x: 6, y: 7 },
                { x: 6, y: 9 },
                { x: 5, y: 9 },
                { x: 5, y: 7 },
            ]);
        });

        it("filters out of bounds coordinates for top left corner", () => {
            expect(getNeighboringHexysOf({ x: 1, y: 1 }, { hexyPairs: [], boardSize: 8 }).length).toBe(3);
        });

        it("filters out of bounds coordinates for bottom right corner", () => {
            expect(getNeighboringHexysOf({ x: 6, y: 11 }, { hexyPairs: [], boardSize: 6 }).length).toBe(3);
        });

        it("filters out of bounds coordinates for middle right corner", () => {
            expect(getNeighboringHexysOf({ x: 13, y: 7 }, { hexyPairs: [], boardSize: 7 }).length).toBe(3);
        });

        it("filters out of bounds coordinates for middle left corner", () => {
            expect(getNeighboringHexysOf({ x: 15, y: 8 }, { hexyPairs: [], boardSize: 8 }).length).toBe(3);
        });
    });

    describe("isNeighborOf", () => {
        it("returns true if point is neighbor", () => {
            expect(isNeighborOf({ x: 1, y: 2 }, { hexyPairs: [], boardSize: 6 }, { x: 2, y: 3 })).toBe(true);
        });

        it("returns false if point is not a neighbor", () => {
            expect(isNeighborOf({ x: 3, y: 3 }, { hexyPairs: [], boardSize: 7 }, { x: 5, y: 3 })).toBe(false);
        });
    });

    describe("getColsByRow", () => {
        it("6 => 1,6; 6,11; 11,6", () => {
            expect(getColsByRow(1, 6)).toBe(6);
            expect(getColsByRow(6, 6)).toBe(11);
            expect(getColsByRow(11, 6)).toBe(6);
        });

        it("7 => 1,7; 7,13; 13,7", () => {
            expect(getColsByRow(1, 7)).toBe(7);
            expect(getColsByRow(7, 7)).toBe(13);
            expect(getColsByRow(13, 7)).toBe(7);
        });

        it("8 => 1,8; 8,15; 15,8", () => {
            expect(getColsByRow(1, 8)).toBe(8);
            expect(getColsByRow(8, 8)).toBe(15);
            expect(getColsByRow(15, 8)).toBe(8);
        });
    });
});