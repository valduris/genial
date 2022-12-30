import { getHexyStyleByPoint, GetHexyStyleByPointState } from "../GenialUi";
import { createHexy, createPlayerHexyPair } from "../utils";

describe("getHexyStyleByPoint", () => {
    it("returns correct previewed hexy style", () => {
        const state: GetHexyStyleByPointState = {
            game: {
                player: {
                    hexyPairs: [
                        createPlayerHexyPair("red", "blue", 0),
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        undefined
                    ],
                    firstPlacedHexy: createHexy(1, 1, "red"),
                    hoveredHexyCoords: { x: 1, y: 2 },
                },
            },
        };
        const style = getHexyStyleByPoint(state, { x: 1, y: 2 });

        expect(style).toEqual({
            hex: {
                fill: "#777",
                strokeWidth: 1,
            },
            circle: {
                color: "red",
            },
            preview: true,
        });
    });
});