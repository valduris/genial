import { createHexy, createPlayerHexyPair } from "../utils";
import {selectCurrentGameUuid, selectHexyStyleByPoint, SelectHexyStyleByPointState} from "../selectors";
import {FirstParam} from "../types";

describe("selectHexyStyleByPoint", () => {
    it("returns correct previewed hexy style", () => {
        const state: SelectHexyStyleByPointState = {
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
        };
        const style = selectHexyStyleByPoint(state, { x: 1, y: 2 });

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
describe("selectCurrentGameUuid", () => {
    it("returns game uuid of current player if defined", () => {
        const state: FirstParam<typeof selectCurrentGameUuid> = {
            "lobbyGames": {
                "fa8011c3-056b-4e26-b24e-a67d21649597": {
                    "boardSize": 6,
                    "name": "",
                    "playerCount": 2,
                    "players": [],
                    "showProgress": true,
                    "adminId": 12,
                    "uuid": "fa8011c3-056b-4e26-b24e-a67d21649597",
                    "status": "created",
                },
                "42243e19-22f2-4a6f-b8c8-b27e1cdb9d08": {
                    "boardSize": 6,
                    "name": "",
                    "playerCount": 2,
                    "players": [
                        {
                            "id": 1,
                            "name": "1",
                            "ready": false
                        }
                    ],
                    "adminId": 12897,
                    "showProgress": true,
                    "uuid": "42243e19-22f2-4a6f-b8c8-b27e1cdb9d08",
                    "status": "created",
                },
                "1f3ed932-1518-4fee-8746-b540405b5fe7": {
                    "boardSize": 6,
                    "name": "",
                    "playerCount": 2,
                    "players": [],
                    "showProgress": true,
                    "adminId": 11212,
                    "status": "created",
                    "uuid": "1f3ed932-1518-4fee-8746-b540405b5fe7"
                },
                "9b7a1aae-5b9f-4218-90d4-90722675e289": {
                    "boardSize": 6,
                    "name": "",
                    "playerCount": 2,
                    "players": [],
                    "showProgress": true,
                    "adminId": 12334234222,
                    "status": "created",
                    "uuid": "9b7a1aae-5b9f-4218-90d4-90722675e289"
                },
            },
            "player": { "id": 1 },
        };
        const uuid = selectCurrentGameUuid(state);

        expect(uuid).toEqual("42243e19-22f2-4a6f-b8c8-b27e1cdb9d08");
    });
});