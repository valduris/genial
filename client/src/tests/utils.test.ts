import {
    calulateProgressGained,
    createBoardHexy,
    createBoardHexyPair, createDrawableHexyPairs, createEmptyProgress, getColorByPoint,
    getColsByRow,
    getNeighboringHexysOf, getNextPointInDirection, isCoordinateValid,
    areNeighbors,
} from "../utils";
import { BoardHexyPairs, Point } from "../types";
import { DIRECTIONS, SPECIAL_CORNERS } from "../consts";

describe("utils", () => {
    describe("getColorByPoint", () => {
        it("returns color of hexy on board by coordinates if present", () => {
            const boardHexyPairs: BoardHexyPairs = [
                createBoardHexyPair(createBoardHexy(1, 1, "red"), createBoardHexy(1, 2, "orange")),
            ];
            expect(getColorByPoint(boardHexyPairs, { x: 1, y: 2 })).toBe("orange");
        });

        it("returns color of hexy on board by coordinates if present #2", () => {
            const boardHexyPairs: BoardHexyPairs = [
                createBoardHexyPair(createBoardHexy(7, 6, "blue"), createBoardHexy(7, 4, "green")),
            ];
            expect(getColorByPoint(boardHexyPairs, { x: 7, y: 6 })).toBe("blue");
        });

        it("returns undefined if a there is no placed hexy pair or special corner present in those coordinates", () => {
            expect(getColorByPoint([], { x: 1, y: 2 })).toBe(undefined);
        });

        it("returns color if no hexy pairs are on board but it's a special corner", () => {
            expect(getColorByPoint([], { x: 0, y: -6 })).toBe("blue");
        });
    });
    describe("getNextPointInDirection", () => {
        it("returns next point in direction", () => {
            const boardHexyPairs: BoardHexyPairs = [
                createBoardHexyPair(createBoardHexy(1, 1, "red"), createBoardHexy(1, 2, "orange")),
            ];
            expect(getNextPointInDirection({ x: 5, y: 11 }, [-1, 0])).toEqual({ x: 4, y: 11 });
        });
    });
    describe("calulateProgressGained", () => {
        it("returns progress gained when a hexy pair is placed on board when it's placed along special corner", () => {
            const progress = calulateProgressGained(
                { hexyPairs: [] },
                createBoardHexyPair(createBoardHexy(-1, -5, "orange"), createBoardHexy(0, -5, "blue"))
            );
            expect(progress).toEqual({ ...createEmptyProgress(), blue: 1 });
        });

        it("returns progress gained when a hexy pair is placed along a different hexy pair on board which neighbors with special corner", () => {
            const boardHexyPairs = [createBoardHexyPair(createBoardHexy(-1, -5, "orange"), createBoardHexy(0, -5, "blue"))];
            const progress = calulateProgressGained(
                { hexyPairs: boardHexyPairs },
                createBoardHexyPair(createBoardHexy(-1, -4, "orange"), createBoardHexy(0, -4, "blue"))
            );
            expect(progress).toEqual({ ...createEmptyProgress(), blue: 2, orange: 1 });
        });

        it("returns progress gained when a hexy pair is placed along a different hexy pair on board which neighbors with special corner", () => {
            const boardHexyPairs = [
                createBoardHexyPair(createBoardHexy(-1, -5, "orange"), createBoardHexy(0, -5, "blue")),
                createBoardHexyPair(createBoardHexy(-2, -4, "orange"), createBoardHexy(-2, -3, "orange")),
            ];
            const progress = calulateProgressGained(
                { hexyPairs: boardHexyPairs },
                createBoardHexyPair(createBoardHexy(-1, -4, "orange"), createBoardHexy(0, -4, "blue"))
            );
            expect(progress).toEqual({ ...createEmptyProgress(), blue: 2, orange: 3 });
        });

        it("returns progress gained when a hexy pair is placed along a different hexy pair (long sequence)", () => {
            const boardHexyPairs = [
                createBoardHexyPair(createBoardHexy(1, 5, "yellow"), createBoardHexy(0, 6, "yellow")),
                createBoardHexyPair(createBoardHexy(0, 4, "yellow"), createBoardHexy(0, 3, "yellow")),
                createBoardHexyPair(createBoardHexy(0, 1, "yellow"), createBoardHexy(0, 2, "yellow")),
            ];
            const progress = calulateProgressGained(
                { hexyPairs: boardHexyPairs },
                createBoardHexyPair(createBoardHexy(-1, 6, "yellow"), createBoardHexy(0, 5, "yellow"))
            );
            expect(progress).toEqual({ ...createEmptyProgress(), yellow: 7 });
        });
    });
    describe("getNeighboringHexysOf", () => {
        it("returns neighboring hexys or points including board hexy pairs", () => {
            const boardHexyPairs: BoardHexyPairs = [
                createBoardHexyPair(createBoardHexy(1, 1, "red"), createBoardHexy(1, 2, "red")),
                createBoardHexyPair(createBoardHexy(4, 1, "blue"), createBoardHexy(5, 1, "blue")),
                createBoardHexyPair(createBoardHexy(6, 4, "violet"), createBoardHexy(6, 3, "violet")),
            ];
            const neighbors = getNeighboringHexysOf({ x: 1, y: 2 }, { hexyPairs: boardHexyPairs, boardSize: 6 });

            expect(neighbors).toEqual([
                { x: 0, y: 2 },
                { color: "red", x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 0, y: 3 },
                { x: 1, y: 3 },
                { x: 2, y: 1 },
            ]);
        });

        it("returns neighboring hexys for middle row", () => {
            const neighbors = getNeighboringHexysOf({ x: 4, y: 0 }, { hexyPairs: [], boardSize: 6 });

            expect(neighbors).toEqual([
                { x: 3, y: 0 },
                { x: 4, y: -1 },
                { x: 5, y: 0 },
                { x: 3, y: 1 },
                { x: 4, y: 1 },
                { x: 5, y: -1 },
            ]);
        });

        it("returns neighboring hexys for middle row on a board with size 8", () => {
            const neighbors = getNeighboringHexysOf({ x: 7, y: 0 }, { hexyPairs: [], boardSize: 8 });

            expect(neighbors).toEqual([
                { x: 6, y: 0 },
                { x: 7, y: -1 },
                { x: 8, y: 0 },
                { x: 6, y: 1 },
                { x: 7, y: 1 },
                { x: 8, y: -1 },
            ]);
        });

        it("filters out of bounds coordinates for top left corner", () => {
            expect(getNeighboringHexysOf({ x: 0, y: -8 }, { hexyPairs: [], boardSize: 8 }).length).toBe(3);
        });

        it("filters out of bounds coordinates for bottom right corner", () => {
            expect(getNeighboringHexysOf({ x: 0, y: 6 }, { hexyPairs: [], boardSize: 6 }).length).toBe(3);
        });

        it("filters out of bounds coordinates for middle right corner", () => {
            expect(getNeighboringHexysOf({ x: 7, y: 0 }, { hexyPairs: [], boardSize: 7 }).length).toBe(3);
        });

        it("filters out of bounds coordinates for middle left corner", () => {
            expect(getNeighboringHexysOf({ x: -8, y: 0 }, { hexyPairs: [], boardSize: 8 }).length).toBe(3);
        });
    });

    describe("areNeighbors", () => {
        it("returns true if point is neighbor", () => {
            expect(areNeighbors({ x: 1, y: 2 }, { x: 2, y: 2 })).toBe(true);
        });

        it("returns false if point is not a neighbor", () => {
            expect(areNeighbors({ x: 3, y: 3 }, { x: 5, y: 3 })).toBe(false);
        });
    });

    describe("getColsByRow", () => {
        it("6 => 1,6; 6,11; 11,6", () => {
            expect(getColsByRow(-5, 6)).toBe(6);
            expect(getColsByRow(-4, 6)).toBe(7);
            expect(getColsByRow(-3, 6)).toBe(8);
            expect(getColsByRow(-2, 6)).toBe(9);
            expect(getColsByRow(-1, 6)).toBe(10);
            expect(getColsByRow(0, 6)).toBe(11);
            expect(getColsByRow(1, 6)).toBe(10);
            expect(getColsByRow(2, 6)).toBe(9);
            expect(getColsByRow(3, 6)).toBe(8);
            expect(getColsByRow(4, 6)).toBe(7);
            expect(getColsByRow(5, 6)).toBe(6);
        });
    });

    describe("SPECIAL_CORNERS", () => {
        it("SPECIAL_CORNERS are correctly initialized on module load", () => {
            expect(SPECIAL_CORNERS).toEqual([
                { color: "red", x: -6, y: 0 },
                { color: "blue", x: 0, y: -6 },
                { color: "green", x: 6, y: 0 },
                { color: "orange", x: -6, y: 6 },
                { color: "yellow", x: 0, y: 6 },
                { color: "violet", x: 6, y: -6 },
            ]);
        });
    });

    describe("DIRECTIONS", () => {
        it("DIRECTIONS are correctly initialized on module load", () => {
            expect(DIRECTIONS).toEqual([[-1, 0,], [0, -1], [1, 0], [-1, 1], [0, 1], [1, -1]]);
        });
    });

    describe("isCoordinateValid", () => {
        it("returns expected result for valid/invalid coords", () => {
            expect(isCoordinateValid({ x: 12, y: 12 }, 8)).toBe(false);
            expect(isCoordinateValid({ x: 0, y: 7 }, 7)).toBe(true);
            expect(isCoordinateValid({ x: 0, y: 7 }, 6)).toBe(false);
            expect(isCoordinateValid({ x: -7, y: -1 }, 8)).toBe(true);
            expect(isCoordinateValid({ x: -7, y: -1 }, 7)).toBe(false);
        });
    });

    describe("createDrawableHexyPairs", () => {
        it("creates drawable hexy pairs in expected format", () => {
            expect(createDrawableHexyPairs().length).toBe(72); // TODO need more
        });
    });
});