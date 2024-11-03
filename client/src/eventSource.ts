import {GameStatus, Thunk, Uuid4} from "./types";
import { fetchJson } from "./api";
import {selectCurrentGameUuid, selectPlayerUuid} from "./selectors";
import * as immer from "immer";
import {createEmptyGame, setGenialState} from "./index";

interface PlayerJoined {
    type: "player_joined";
    value: Array<{
        gameUuid: Uuid4;
        players: [{
            id: number;
            name: string;
            ready: boolean;
        }];
    }>;
}

type EventSourceData = PlayerJoined;

export function isPlayerJoinedMessage(payload: EventSourceData): payload is PlayerJoined {
    return payload.type === "player_joined";
}

export function onEventSourceMessage(data: EventSourceData): Thunk {
    return (dispatch, getState) => {
        if ("ping" in data) {
            fetchJson("http://localhost:8080/api/pong", {
                body: JSON.stringify({ playerUuid: selectPlayerUuid(getState()) }),
            });
        } else if (isPlayerJoinedMessage(data)) {
            console.log("player_joined", data);
            dispatch(setGenialState(immer.produce(getState(), state => {
                data.value.forEach(entry => {
                    const lobbyGame = state.lobbyGames[entry.gameUuid];
                    if (lobbyGame) {
                        lobbyGame.players = entry.players;
                    }
                });

                const currentGameUuid = selectCurrentGameUuid(state);

                console.log("currentGameUuid", currentGameUuid);

                if (currentGameUuid) {
                    state.game = { ...state.lobbyGames[currentGameUuid], status: GameStatus.Lobby, hexyPairs: [] };
                }
                // TODONOW
                // const currentGameUuid = state.lo?bbyGames.find(g => g.players[state.playerId])
                // state.game = state.lobbyGames[];
            })));
            console.log("getState", getState());
        }
        console.log("onEventSourceMessage", data);
    };
}