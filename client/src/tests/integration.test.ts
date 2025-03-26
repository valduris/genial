import { initialize } from "../index";
import { onPlayerHexyPairClick } from "../GenialUi";
import { selectPlayerSelectedHexyPair } from "../selectors";
import { onBoardHexyMouseEnter } from "../components/Board";
import {
    createBoardHexy,
    createDrawableHexyPairs,
    createPlayerHexyPair,
} from "../utils";
import { BoardHexyPairs, BoardSize, GameStatus, Genial, PlayerCount, UnixTimestamp } from "../types";


// beforeAll(() => {
//     const mGetRandomValues = jest.fn().mockReturnValueOnce(new Uint8Array(10));
//     Object.defineProperty(window, "crypto", {
//         value: { getRandomValues: mGetRandomValues },
//     });
// });

// export function initializeGameState(params: {
//     startTime: UnixTimestamp;
//     hexyPairs: BoardHexyPairs;
//     boardSize: BoardSize;
//     gameId: string;
//     playerCount: PlayerCount,
// }): Genial {
//     const team0Player0 = createPlayer({
//         name: "Human player",
//         hexyPairs: [
//             createPlayerHexyPair("green", "blue"),
//             createPlayerHexyPair("red", "green"),
//             undefined,
//             createPlayerHexyPair("red", "red"),
//             createPlayerHexyPair("yellow", "green"),
//             createPlayerHexyPair("orange", "orange"),
//         ],
//     });
//
//     const team1player0 = createPlayer({
//         name: "Computer",
//         hexyPairs: [
//             createPlayerHexyPair("green", "green"),
//             undefined,
//             undefined,
//             undefined,
//             undefined,
//             undefined,
//         ],
//     });
//
//     const initialGameState = {
//         player: team0Player0,
//         hexyPairs: params.hexyPairs,
//         boardSize: params.boardSize,
//         startTime: params.startTime,
//         drawableHexyPairs: createDrawableHexyPairs(),
//         playerCount: params.playerCount,
//         status: GameStatus.InProgress,
//         gameId: params.gameId,
//     } as const;
//
//     return initialGameState;
// }

// describe("full-game, multi-step, headless integration test", () => {
//     it ("happy path case", async () => {
//         const store = initializeGameState({
//             gameId: "eb6a6aa6-4cbe-459f-bee7-c78478a95c36", // TODO
//             boardSize: 8,
//             startTime: Date.now(), // TODO
//             hexyPairs: [
//                 createBoardHexyPair(createBoardHexy(1, 1, "blue"), createBoardHexy(2, 1, "orange")),
//             ],
//             playerCount: 2,
//         });
//
//         const initializeResult: InitializeResult = await initialize();
//         const store = initializeResult.store;
//
//         expect(selectPlayerSelectedHexyPair(store.getState())).toBe(undefined);
//
//         store.dispatch(onPlayerHexyPairClick(0, 0));
//
//         expect(selectPlayerSelectedHexyPair(store.getState())).toEqual([{"color": "green", "selected": true}, {"color": "blue", "selected": false}]);
//
//         store.dispatch(onBoardHexyMouseEnter({ x: 2, y: 1 }));
//     });
// });