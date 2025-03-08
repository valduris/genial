import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { applyMiddleware, createStore } from "redux";
import { withExtraArgument } from "redux-thunk";
import {
    Dispatch,
    Genial,
    LobbyGame,
    LobbyGames,
    LocalStorageKey,
    PermanentAny,
    Thunk,
    ThunkExtraArguments,
    Uuid4,
    WebSocketState
} from "./types"

import { GenialUiConnected } from "./GenialUi";
import { GENIAL_GLOBAL } from "./global";
import { SET_GENIAL_UI_STATE } from "./consts";
import { fetchJson } from "./api";

import "./Genial.css";
import { createEmptyProgress, uuid4 } from "./utils";
import { onWebSocketMessage } from "./eventSource";

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

export function createGenialInitialState(state: DeepPartial<Genial>): Genial {
    const defaultState: Genial = {
        loadingState: "loading",
        webSocketState: WebSocketState.CLOSED,
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
            id: 1,
            uuid: "",
        },
        game: undefined,
        lobbyGames: {},
        playerUuid: getOrCreatePlayerUuidForUnauthenticatedPlayer(),
        error: undefined,
    };

    return Object.assign(defaultState, state);
}


export function getOrCreatePlayerUuidForUnauthenticatedPlayer(): Uuid4 {
    const uuidFromLocalStorage = localStorage.getItem(LocalStorageKey.PlayerUuid);

    if (!uuidFromLocalStorage) {
        const newUuid = uuid4();
        localStorage.setItem(LocalStorageKey.PlayerUuid, newUuid);
        return newUuid
    }

    return uuidFromLocalStorage;
}

export function createGenialReducer(initialUiState: Genial) {
    return (state = initialUiState, action: ReturnType<typeof setGenialStatePlain>) => {
        if (action.type === SET_GENIAL_UI_STATE) {
            return action.payload;
        }
        return state;
    }
}

export function onGameKeyDown(keyCode: number): Thunk {
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
    store?: {
        getState: () => Genial,
        dispatch: Dispatch;
    };
}

export interface ApiPlayerInfo {
    type: "player_info",
    data: {
        players: Record<Uuid4, {
            name: string;
            id: number;
            uuid: Uuid4;
        }>;
    };
}

export async function initialize(): Promise<InitializeResult> {
    const [lobbyGames, playerInfo] = await Promise.all([
        fetchJson("http://localhost:8080/api/games", { method: "GET" }).then(games => games),
        fetchJson("http://localhost:8080/api/player/info", {
            body: JSON.stringify({ playerUuid: getOrCreatePlayerUuidForUnauthenticatedPlayer() })
        }).then((payload: ApiPlayerInfo) => { return payload }),
    ]);

    let playerUuid;
    try {
        playerUuid = Object.keys(playerInfo.data.players)[0];
    } catch (e) {
        console.error("player not found: ", getOrCreatePlayerUuidForUnauthenticatedPlayer());
        return Promise.resolve({});
    }

    const initialGenialState = createGenialInitialState({
        lobbyGames: lobbyGames.reduce((memo: LobbyGames, game: LobbyGame) => {
            memo[game.uuid] = game;
            return memo;
        }, {}),
        loadingState: lobbyGames.length > 0 ? "loaded" : "noGames",
        player: playerInfo.data.players[playerUuid],
    });

    const rootReducer = createGenialReducer(initialGenialState);
    const middlewares = applyMiddleware(withExtraArgument({ fetchJson: fetchJson }));
    const store = createStore(rootReducer, middlewares);
    const rootNode = document.getElementById("root") as HTMLDivElement;

    if (rootNode) {
        ReactDOM.createRoot(rootNode).render(
            <Provider store={store}>
                <GenialUiConnected />
            </Provider>
        );
    }

    GENIAL_GLOBAL.store = store;

    const initializeResult = {
        store: store,
    };

    function onKeyDown(event: { keyCode: number; }): void {
        if ([13, 27, 37, 38, 39, 40].includes(event.keyCode)) {
            store.dispatch(onGameKeyDown(event.keyCode ));
        }
    }

    document.addEventListener("keydown", onKeyDown, false);

    const proto = window.location.protocol.startsWith('https') ? 'wss' : 'ws'
    const wsUri = `${proto}://${"localhost"}:8080/ws` //getOrCreatePlayerUuidForUnauthenticatedPlayer()
    const webSocket = new WebSocket(wsUri);

    webSocket.addEventListener("message", (e) => {
        console.log("ws message", e.data);
        store.dispatch(onWebSocketMessage(JSON.parse(e.data)));
    }, false);

    webSocket.addEventListener("open", (e: Event) => {
        console.log("ws open");
        store.dispatch(setGenialState({ webSocketState: (e as PermanentAny).readyState as 0 | 1 | 2 }));
    }, false);

    webSocket.addEventListener("error", (e) => {
        store.dispatch(setGenialState({ webSocketState: (e as PermanentAny).readyState as 0 | 1 | 2 }));
    }, false);

    return initializeResult;
}

initialize();



