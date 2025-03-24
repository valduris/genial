import { ColorCode, GameStatus, PlayerHexyPairs, Thunk, Uuid4 } from "./types";
import * as immer from "immer";
import { setGenialState } from "./index";
import { colorCodeToColor } from "./utils";

interface LobbyGameData {
    games: Record<Uuid4, {
        players: [{
            id: number;
            name: string;
            ready: boolean;
        }];
    }>;
}

interface PlayerLobbyGameData {
    type: "player_joined" | "player_left" | "player_ready";
    data: LobbyGameData;
}

export type ServerPlayerHexPair = [ColorCode, ColorCode] | null;
export type ServerPlayerHexPairs = [ServerPlayerHexPair, ServerPlayerHexPair, ServerPlayerHexPair, ServerPlayerHexPair, ServerPlayerHexPair, ServerPlayerHexPair];

interface PlayerGameState {
    type: "player_game_state";
    data: {
        players: Record<Uuid4, {
            hexPairs: ServerPlayerHexPairs;
        }>;
    };
}
interface GameState {
    type: "game_state";
    data: {
        games: Record<Uuid4, {
            player_move_order: Uuid4[];
            status: GameStatus;
        }>;
    };
}

type WsData = PlayerLobbyGameData | PlayerGameState | GameState;

export function hasLobbyGameData(payload: WsData): payload is PlayerLobbyGameData {
    return ["player_joined", "player_left", "player_ready"].includes(payload.type);
}

export function onWebSocketMessage(payload: WsData): Thunk {
    return (dispatch, getState) => {
        if ("ping" in payload) {
            
        } else if (hasLobbyGameData(payload)) {
            dispatch(setGenialState(immer.produce(getState(), state => {
                Object.keys(payload.data.games).forEach(gameUuid => {
                    const lobbyGame = state.lobbyGames[gameUuid];
                    if (lobbyGame) {
                        lobbyGame.players = payload.data.games[gameUuid].players;
                    }
                });
            })));
        } else if (payload.type === "player_game_state") {
            dispatch(setGenialState(immer.produce(getState(), state => {
                const playedUuid = Object.keys(payload.data.players)[0];
                const playerHexPairs = payload.data.players[playedUuid].hexPairs.map(hexPairsInColorCode => {
                    if (hexPairsInColorCode === null) {
                        return undefined;
                    }
                    return hexPairsInColorCode.map(h => colorCodeToColor(h));
                }) as PlayerHexyPairs;
                state.player.hexyPairs = playerHexPairs;
            })));
        } else if (payload.type === "game_state") {
            dispatch(setGenialState(immer.produce(getState(), state => {
                for (const gameUuid in payload.data.games) {
                    state.lobbyGames[gameUuid].status = payload.data.games[gameUuid].status;
                }
            })));
        }
        console.log("onWebSocketMessage p s", payload, getState());
    };
}