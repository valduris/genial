import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { createStore, applyMiddleware, DeepPartial, Store } from "redux";
import thunk from "redux-thunk";

import { initializeGameState } from "./genial";
import { Game, Thunk, ThunkExtraArguments, UnixTimestamp, GenialUiState, Dispatch } from "./types"

import { GenialUi } from "./GenialUi";
import {
    createBoardHexyPair,
    createPromise,
    CreatePromiseReturnType,
    createBoardHexy,
    uuid4,
    createHexy
} from "./utils";
import { GENIAL_GLOBAL } from "./global";
import { SET_GENIAL_UI_STATE } from "./consts";
import { Api } from "./api";

export function setGenialUiStatePlain(state: GenialUiState) {
    return {
        type: SET_GENIAL_UI_STATE,
        payload: state,
    } as const;
}

export function setGenialUiState(state: DeepPartial<GenialUiState>): Thunk {
    return (dispatch, getState) => {
        dispatch(setGenialUiStatePlain(Object.assign({}, getState(), state)));
    };
}

export function createGenialUiReducer(initialUiState: GenialUiState) {
    return (state = initialUiState, action: ReturnType<typeof setGenialUiStatePlain>) => {
        if (action.type === SET_GENIAL_UI_STATE) {
            return action.payload;
        }
        return state;
    }
}

export function replayFileName(game: Game): string {
    const playerNames: string[] = [];
    return `replay_${new Date(game.startTime).toLocaleString()}_${playerNames.join(",")}.json`;
}

export function onGameKeyDown(keyCode: number, initializeResult: InitializeResult): Thunk {
    return (dispatch, getState) => {
        const game = getState().game;

        if (keyCode == 27) { // escape
            game.menu.open = !game.menu.open;
        } else if (keyCode === 37) { // left

        } else if (keyCode === 38) { // up
            const newIndex = game.menu.selectedEntryIndex - 1;
            game.menu.selectedEntryIndex = newIndex < 0 ? game.menu.entries.length - 1 : newIndex;
        } else if (keyCode === 39) { // right

        } else if (keyCode === 40) { // down
            const newIndex = game.menu.selectedEntryIndex + 1;
            game.menu.selectedEntryIndex = newIndex >= game.menu.entries.length ? 0 : newIndex;
        }

        if (game.menu.open && keyCode === 13) {
            const selectedEntry = game.menu.entries[game.menu.selectedEntryIndex];
            if (selectedEntry === "resume") {
                game.menu.open = false;
            // } else if (selectedEntry === "saveReplay") {
                // const anchor = document.createElement("a");
                // const encodedDownload = "data:text/json;charset=utf-8," + encodeURIComponent(
                //     JSON.stringify(createReplayFileFromGameHistory(game))
                // );
                // anchor.setAttribute("href", encodedDownload);
                // anchor.setAttribute("download", replayFileName(game));
                // anchor.click();

            // } else if (selectedEntry === "loadReplay") {
                // game.status = "loading";
                // initializeResult.gameCreated.then(() => {
                //     initializeResult.dispose().promise.then(() => {
                //         initialize({ startTime: Date.now() });
                //     });
                // });

            } else if (selectedEntry === "quitGame") {
                // game.status = "loading";
                game.status = "mainMenu";
            }
        }
    };
}

// export function createGameFromReplay(replay: Replay): Game {
//     return initializeGameState({
//         type: "replay",
//         startTime: Date.now(),
//         hexys: [],
//         status: "inProgress",
//     });
// }

export interface InitializeResult {
    gameCreated: Promise<void>;
    dispose: () => CreatePromiseReturnType<void>;
    store: {
        getState: () => GenialUiState,
        dispatch: Dispatch;
    };
}


export async function initialize(params: { startTime: UnixTimestamp; }): Promise<InitializeResult> {
    const rootNode = document.getElementById("root") as HTMLDivElement;
    const game = initializeGameState({
        gameId: "eb6a6aa6-4cbe-459f-bee7-c78478a95c36",
        boardSize: 8,
        startTime: params.startTime,
        hexyPairs: [
            createBoardHexyPair(createBoardHexy(1, 1, "blue"), createBoardHexy(2, 1, "orange")),
        ],
        type: "singlePlayer",
        status: "inProgress",
    });
    const initialUiState = { game: game };
    const thunkExtraArguments: ThunkExtraArguments = {
        Api: Api,
    };
    const rootReducer = createGenialUiReducer(initialUiState);
    const middlewares = applyMiddleware(thunk.withExtraArgument(thunkExtraArguments));
    const store = createStore(rootReducer, middlewares);

    if (rootNode) {
        const reactRoot = ReactDOM.createRoot(rootNode)

        reactRoot.render(
            <Provider store={store}>
                <GenialUi />
            </Provider>
        );
    }

    const gameCreated = Promise.all([]).then(([]) => {
        GENIAL_GLOBAL.game = game;
    });

    const initializeResult = {
        gameCreated: gameCreated,
        dispose: (): CreatePromiseReturnType<void> => {
            const promise = createPromise<void>();
            // document.removeEventListener("keydown", onKeyDown, false);
            // reactRoot.unmount();

            window.setTimeout(() => {
                promise.resolve();
            }, 2000);

            return promise;
        },
        store: store,
    };

    function onKeyDown(event: { keyCode: number; }): void {
        if ([13, 27, 37, 38, 39, 40].includes(event.keyCode)) {
            store.dispatch(onGameKeyDown(event.keyCode, initializeResult ));
        }
    }

    document.addEventListener("keydown", onKeyDown, false);

    return initializeResult;
}

initialize({ startTime: Date.now() });
