import { ColorCode, Game, GameStatus, PlayerHexyPairs, Thunk, Uuid4 } from "./types";
import * as immer from "immer";
import { setGenialState } from "./index";
import { colorCodeToColor, createEmptyProgress } from "./utils";

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
            status: Game["status"];
            board_size: Game["boardSize"];
            hexy_pairs: Game["hexyPairs"];
            name: Game["name"];
            show_progress: Game["showProgress"];
            uuid: Game["uuid"];
            players: Game["players"];
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
                    return hexPairsInColorCode.map(h => ({
                        color: colorCodeToColor(h),
                        selected: false,
                    }));
                }) as PlayerHexyPairs;
                state.player.hexyPairs = playerHexPairs;
            })));
        } else if (payload.type === "game_state") {
            dispatch(setGenialState(immer.produce(getState(), state => {
                for (const gameUuid in payload.data.games) {
                    const serverGame = payload.data.games[gameUuid];
                    // state.lobbyGames[gameUuid].status = .status;
                    state.game = {
                        status: serverGame.status,
                        boardSize: serverGame.board_size,
                        hexyPairs: serverGame.hexy_pairs,
                        name: serverGame.name,
                        showProgress: serverGame.show_progress,
                        uuid: serverGame.uuid,
                        adminId: 0, // TODO
                        players: serverGame.players,
                    }
                    state.player.progress = createEmptyProgress();
                }
            })));
        }
        console.log("onWebSocketMessage p s", payload, getState());
    };
}