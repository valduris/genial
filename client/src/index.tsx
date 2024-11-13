import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { applyMiddleware, createStore } from "redux";
import { withExtraArgument } from "redux-thunk";
import {
    Dispatch,
    EventSourceState,
    Game,
    GameStatus,
    Genial, LobbyGame, LobbyGames,
    LocalStorageKey,
    PermanentAny,
    Thunk,
    ThunkExtraArguments,
    Uuid4
} from "./types"

import { GenialUiConnected } from "./GenialUi";
import { GENIAL_GLOBAL } from "./global";
import { SET_GENIAL_UI_STATE } from "./consts";
import { fetchJson } from "./api";

import "./Genial.css";
import { createEmptyProgress, randomFromRange, uuid4 } from "./utils";
import { onEventSourceMessage } from "./eventSource";

export function setGenialStatePlain(state: Genial) {
    return {
        type: SET_GENIAL_UI_STATE,
        payload: state,
    } as const;
}

type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>;
} : T;


export function setGenialState(state: DeepPartial<Genial>): Thunk {
    return (dispatch, getState) => {
        dispatch(setGenialStatePlain(Object.assign({}, getState(), state)));
    };
}

export function createEmptyGame(): Game {
    return {
        uuid: "",
        boardSize: 6,
        playerCount: 2,
        name: "",
        adminId: 0,
        hexyPairs: [],
        status: GameStatus.Lobby,
        showProgress: true,
        players: [],
    }
}

export const initialGenialState: Genial = {
    loadingState: "loading",
    eventSourceState: EventSourceState.CLOSED,
    menu: {
        open: false,
        entries: [],
        selectedEntryIndex: 0,
    },
    player: {
        hexyPairs: [undefined, undefined, undefined, undefined, undefined, undefined],
        firstPlacedHexy: undefined,
        name: "",
        hoveredHexyCoords: undefined,
        movesInTurn: 0,
        progress: createEmptyProgress(),
    },
    game: createEmptyGame(),
    lobbyGames: {},
    playerUuid: getOrCreatePlayerUuidForUnauthenticatedPlayer(),
    playerName: getOrCreatePlayerNameForUnauthenticatedPlayer(),
    playerId: 1,
};

export function getOrCreatePlayerUuidForUnauthenticatedPlayer(): Uuid4 {
    const uuidFromLocalStorage = localStorage.getItem(LocalStorageKey.PlayerUuid);

    if (!uuidFromLocalStorage) {
        const newUuid = uuid4();
        localStorage.setItem(LocalStorageKey.PlayerUuid, newUuid);
        return newUuid
    }

    return uuidFromLocalStorage;
}

export function getOrCreatePlayerNameForUnauthenticatedPlayer(): string {
    const playerNameFromLocalStorage = localStorage.getItem(LocalStorageKey.PlayerName);

    if (!playerNameFromLocalStorage) {
        const playerName = "Hexter_" + randomFromRange(1000, 9999);
        localStorage.setItem(LocalStorageKey.PlayerName, playerName);
        return playerName
    }

    return playerNameFromLocalStorage;
}

export function createGenialReducer(initialUiState: Genial = initialGenialState) {
    return (state = initialUiState, action: ReturnType<typeof setGenialStatePlain>) => {
        if (action.type === SET_GENIAL_UI_STATE) {
            return action.payload;
        }
        return state;
    }
}

export function onGameKeyDown(keyCode: number, initializeResult: InitializeResult): Thunk {
    return (dispatch, getState) => {
        const game = getState();

        if (keyCode === 27) { // escape
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
            } else if (selectedEntry === "quitGame") {
                // game.status = "loading";
                // game.status = GameStatus.Lobby;
            }
        }
    };
}

export interface InitializeResult {
    dispose: () => Promise<void>;
    store: {
        getState: () => Genial,
        dispatch: Dispatch;
    };
}

export async function initialize(): Promise<InitializeResult> {
    const rootNode = document.getElementById("root") as HTMLDivElement;
    const thunkExtraArguments: ThunkExtraArguments = {
        fetchJson: fetchJson,
    };
    const rootReducer = createGenialReducer();
    const middlewares = applyMiddleware(withExtraArgument(thunkExtraArguments));
    const store = createStore(rootReducer, middlewares);

    if (rootNode) {
        const reactRoot = ReactDOM.createRoot(rootNode)

        reactRoot.render(
            <Provider store={store}>
                <GenialUiConnected />
            </Provider>
        );
    }

    GENIAL_GLOBAL.store = store;

    fetchJson("http://localhost:8080/api/games", { method: "GET" }).then((games) => {
        store.dispatch(setGenialState({
            lobbyGames: games.reduce((memo: LobbyGames, game: LobbyGame) => {
                memo[game.uuid] = game;
                return memo;
            }, {}),
            loadingState: games.length > 0 ? "loaded" : "noGames"
        }));
        console.log("api/games", store.getState());
    });

    const initializeResult = {
        dispose: (): Promise<void> => {
            return Promise.resolve();
            // document.removeEventListener("keydown", onKeyDown, false);
            // reactRoot.unmount();
        },
        store: store,
    };

    function onKeyDown(event: { keyCode: number; }): void {
        if ([13, 27, 37, 38, 39, 40].includes(event.keyCode)) {
            store.dispatch(onGameKeyDown(event.keyCode, initializeResult ));
        }
    }

    document.addEventListener("keydown", onKeyDown, false);

    console.log("new event source", getOrCreatePlayerUuidForUnauthenticatedPlayer());
    const source = new EventSource(`http://localhost:8080/events/${getOrCreatePlayerUuidForUnauthenticatedPlayer()}`);

    source.addEventListener("message", (e) => {
        console.log("MSG", e);
        store.dispatch(onEventSourceMessage(JSON.parse(e.data)));
    }, false);

    source.addEventListener("open", (e: Event) => {
        store.dispatch(setGenialState({ eventSourceState: (e as PermanentAny).readyState as 0 | 1 | 2 }));
    }, false);

    source.addEventListener("error", (e) => {
        console.log('source.addEventListener("error"', e);
        store.dispatch(setGenialState({ eventSourceState: (e as PermanentAny).readyState as 0 | 1 | 2 }));
    }, false);

    return initializeResult;
}

initialize();



