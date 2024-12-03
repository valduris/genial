import { Thunk, Uuid4} from "./types";
import { fetchJson } from "./api";
import { selectPlayerUuid} from "./selectors";
import * as immer from "immer";
import { setGenialState } from "./index";

// {
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
//     "type": "player_joined"
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

type EventSourceData = PlayerLobbyGameData;

export function hasLobbyGameData(payload: EventSourceData): payload is PlayerLobbyGameData {
    return ["player_joined", "player_left", "player_ready"].includes(payload.type);
}

export function onEventSourceMessage(payload: EventSourceData): Thunk {
    return (dispatch, getState) => {
        if ("ping" in payload) {
            fetchJson("http://localhost:8080/api/pong", {
                body: JSON.stringify({ playerUuid: selectPlayerUuid(getState()) }),
            });
        } else if (hasLobbyGameData(payload)) {
            dispatch(setGenialState(immer.produce(getState(), state => {
                Object.keys(payload.data.games).forEach(gameUuid => {
                    const lobbyGame = state.lobbyGames[gameUuid];
                    if (lobbyGame) {
                        lobbyGame.players = payload.data.games[gameUuid].players;
                    }
                });
            })));
        }
        console.log("onEventSourceMessage p s", payload, getState());
    };
}