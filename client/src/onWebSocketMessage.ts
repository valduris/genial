import { PlayerHexyPairs, Thunk, Uuid4 } from "./types";
import * as immer from "immer";
import { setGenialState } from "./index";

// {
//     "type": "player_joined"
//     "data": {
//         "games": {
//             "4be1adbd-569b-4d3b-8189-8830398dcf83": {
//                 "players": [
//                     {
//                         "id": 1,
//                         "name": "grietiņa",
//                         "ready": false
//                     }
//                 ]
//             }
//         }
//     },
// }

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

interface PlayerGameState {
    type: "player_game_data";
    data: {
        players: Record<Uuid4, {
            hexPairs: PlayerHexyPairs;
        }>;
    };
}

type WsData = PlayerLobbyGameData | PlayerGameState;

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
        } else if (payload.type === "player_game_data") {
            dispatch(setGenialState(immer.produce(getState(), state => {
                const playedUuid = Object.keys(payload.data.players)[0];
                console.log("payload.data.players[playedUuid].hexPairs;", payload.data.players[playedUuid].hexPairs);
                state.player.hexyPairs = payload.data.players[playedUuid].hexPairs;
            })));
        }
        console.log("onWebSocketMessage p s", payload, getState());
    };
}