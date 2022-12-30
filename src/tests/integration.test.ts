import { initialize, InitializeResult } from "../index";
import { onBoardHexyMouseEnter, onPlayerHexyPairClick, selectPlayerSelectedHexyPair } from "../GenialUi";

describe("full-game, multi-step, headless integration test", () => {
    it ("x", async () => {
        const initializeResult: InitializeResult = await initialize({ startTime: Date.now() });
        const store = initializeResult.store;

        expect(selectPlayerSelectedHexyPair(store.getState())).toBe(undefined);

        store.dispatch(onPlayerHexyPairClick(0, 0));

        expect(selectPlayerSelectedHexyPair(store.getState())).toEqual([{"color": "green", "selected": true}, {"color": "blue", "selected": false}]);

        store.dispatch(onBoardHexyMouseEnter({ x: 2, y: 1 }));
    });
});