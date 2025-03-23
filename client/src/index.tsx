import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { applyMiddleware, createStore } from "redux";
import { withExtraArgument } from "redux-thunk";
import {
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
import { onWebSocketMessage } from "./onWebSocketMessage";
import { selectPlayerUuid } from "./selectors";

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

export async function initialize(): Promise<void> {
    let playerUuid = getOrCreatePlayerUuidForUnauthenticatedPlayer();
    const [lobbyGames, playerInfo] = await Promise.all([
        fetchJson("http://localhost:8080/api/games", { method: "GET" }).then(games => games),
        fetchJson("http://localhost:8080/api/player/info", {
            body: JSON.stringify({ playerUuid: playerUuid })
        }).then((payload: ApiPlayerInfo) => { return payload }),
    ]);

    try {
        playerUuid = Object.keys(playerInfo.data.players)[0];
    } catch (e) {
        console.error("player not found: ", playerUuid);
        return Promise.resolve();
    }

    const initialGenialState = createGenialInitialState({
        lobbyGames: lobbyGames.reduce((memo: LobbyGames, game: LobbyGame) => {
            memo[game.uuid] = game;
            return memo;
        }, {}),
        loadingState: lobbyGames.length > 0 ? "loaded" : "noGames",
        player: playerInfo.data.players[playerUuid],
    });

    const proto = window.location.protocol.startsWith('https') ? 'wss' : 'ws'
    const wsUri = `${proto}://${"localhost"}:8080/ws/${getOrCreatePlayerUuidForUnauthenticatedPlayer()}`;
    const webSocket = new WebSocket(wsUri);

    webSocket.addEventListener("open", (e: Event) => store.dispatch(onWsOpen(e)), false);
    webSocket.addEventListener("message", (e) => store.dispatch(onWebSocketMessage(JSON.parse(e.data))), false);
    webSocket.addEventListener("error", (e) => store.dispatch(setWsStateUponOpenOrError(e)), false);

    const rootReducer = createGenialReducer(initialGenialState);
    const thunkExtra: ThunkExtraArguments = { fetchJson: fetchJson, transport: webSocket };
    const middlewares = applyMiddleware(withExtraArgument(thunkExtra));
    const store = createStore(rootReducer, middlewares);

    ReactDOM.createRoot(document.getElementById("root") as HTMLDivElement).render(
        <Provider store={store}>
            <GenialUiConnected />
        </Provider>
    );

    GENIAL_GLOBAL.store = store;
}

function setWsStateUponOpenOrError(e: Event) {
    return setGenialState({ webSocketState: (e as PermanentAny).currentTarget.readyState as 0 | 1 | 2 | 3 });
}

function onWsOpen(e: Event): Thunk {
    return (dispatch, getState, { transport }) => {
        transport.send(JSON.stringify({
            type: "register",
            payload: {
                player_uuid: selectPlayerUuid(getState()),
            },
        }));
        dispatch(setWsStateUponOpenOrError(e));
    }
}

initialize();



