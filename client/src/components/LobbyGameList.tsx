import * as React from "react";
import { connect } from "react-redux";
import * as immer from "immer";

import { translate } from "../utils";
import {
    GamesLoadingState,
    GameStatus,
    GenialLobby,
    LobbyGames,
    PermanentAny,
    PlayerCount,
    Thunk,
    Uuid4
} from "../types";
import { log } from "../log";

import { selectPlayerUuid } from "../selectors";
import { onEventSourceMessage, setGenialState } from "../index";

export interface LobbyGameListStateProps {
    games: LobbyGames;
    loadingState: GamesLoadingState;
}

export interface LobbyGameListDispatchProps {
    onJoinGame: (gameUuid: Uuid4) => void;
}

export type LobbyGameListProps = LobbyGameListStateProps & LobbyGameListDispatchProps;

export function LobbyGameList(props: LobbyGameListProps) {
    return (
        <table className={"table"}>
            <thead>
                <tr>
                    <th>{translate("boardSize")}</th>
                    <th>{translate("playerCount")}</th>
                    <th>{translate("gameName")}</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {props.loadingState === "loading" && (
                    <tr>
                        <td className={"loading"}>{translate("loading")}</td>
                    </tr>
                )}
                {props.loadingState === "noGames" && (
                    <tr>
                        <td className={"noGames"}>{translate("noGames")}</td>
                    </tr>
                )}
                {props.loadingState === "loaded" && props.games.map(game => {
                    return (
                        <tr key={game.uuid}>
                            <td>{game.boardSize}</td>
                            <td>{`${game.players.length} / ${game.playerCount}`}</td>
                            <td>{game.name}</td>
                            <td>
                                <button
                                    onClick={() => props.onJoinGame(game.uuid)}
                                    data-role={"game_list_join"}
                                    disabled={game.playerCount === game.players.length as PlayerCount}
                                >
                                    {translate("joinGame")}
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export const LobbyGameListConnected = connect<any, any, any, any>((state: GenialLobby) => ({
    games: state.games,
    loadingState: state.loadingState,
}), { onJoinGame: onJoinGame })(LobbyGameList);

export function onJoinGame(gameUuid: Uuid4): Thunk<GenialLobby> {
    return async (dispatch, getState, { fetchJson }) => {
        type JoinGameResult = ReturnType<Awaited<typeof httpPostCreateGame>>;

        log.info("getState() before onJoinGame", getState());

        const params: { gameUuid: Uuid4; playerUuid: Uuid4; } = {
            gameUuid: gameUuid,
            playerUuid: selectPlayerUuid(getState()),
        };
        const result: JoinGameResult = await fetchJson("http://localhost:3300/api/game/join", { body: JSON.stringify(params) });
        log.info(result);
        dispatch(setGenialState(immer.produce(getState(), state => {
            state.game = {
                ...result,
                finished: false,
                status: GameStatus.Lobby,
            };
        })));

        log.info("getState()", getState());
    };
}