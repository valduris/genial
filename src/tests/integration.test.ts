import { initialize, InitializeResult } from "../index";
import { onPlayerHexyPairClick } from "../GenialUi";
import { selectPlayerSelectedHexyPair } from "../selectors";
import { onBoardHexyMouseEnter } from "../components/Board";

// beforeAll(() => {
//     const mGetRandomValues = jest.fn().mockReturnValueOnce(new Uint8Array(10));
//     Object.defineProperty(window, "crypto", {
//         value: { getRandomValues: mGetRandomValues },
//     });
// });

describe("full-game, multi-step, headless integration test", () => {
    it ("happy path case", async () => {
        const initializeResult: InitializeResult = await initialize({ startTime: Date.now() });
        const store = initializeResult.store;

        expect(selectPlayerSelectedHexyPair(store.getState())).toBe(undefined);

        store.dispatch(onPlayerHexyPairClick(0, 0));

        expect(selectPlayerSelectedHexyPair(store.getState())).toEqual([{"color": "green", "selected": true}, {"color": "blue", "selected": false}]);

        store.dispatch(onBoardHexyMouseEnter({ x: 2, y: 1 }));
    });
});