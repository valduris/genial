import * as React from "react";
import { connect } from "react-redux";

import { translate } from "../utils";
import { GamesLoadingState, GenialLobby, LobbyGames, Thunk, Uuid4 } from "../types";
import { log } from "../log";

import "./LobbyGameList.css";
import { selectPlayerUuid } from "../selectors";
import { setGenialState } from "../index";

export interface LobbyGameListStateProps {
    games: LobbyGames;
    loadingState: GamesLoadingState;
}

export interface LobbyGameListDispatchProps {
    onJoinGame: (gameUuid: Uuid4) => void;
}

export type LobbyGameListProps = LobbyGameListStateProps & LobbyGameListDispatchProps;

export function LobbyGameList(props: LobbyGameListProps) {
    // TODO long term plan - sticky header
    return (
        <div className={"game-list"}>
            <div className={"row"}>
                <div className={"boardSize"}>{translate("boardSize")}</div>
                <div className={"playerCount"}>{translate("playerCount")}</div>
                <div className={"name"}>{translate("gameName")}</div>
            </div>
            {props.loadingState === "loading" && (
                <div className={"row"}>
                    <div className={"loading"}>{translate("loading")}</div>
                </div>
            )}
            {props.loadingState === "noGames" && (
                <div className={"row"}>
                    <div className={"noGames"}>{translate("noGames")}</div>
                </div>
            )}
            {props.loadingState === "loaded" && props.games.map(game => {
                return (
                    <div className={"row"} key={game.uuid}>
                        <div className={"boardSize"}>{game.boardSize}</div>
                        <div className={"playerCount"}>{`? / ${game.playerCount}`}</div>
                        <div className={"name"}>{game.name}</div>
                        <div className={"join"}>
                            <button onClick={() => props.onJoinGame(game.uuid)}>{translate("joinGame")}</button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export const LobbyGameListConnected = connect<any, any, any, any>((state: GenialLobby) => ({
    games: state.games,
    loadingState: state.loadingState,
}), { onJoinGame: onJoinGame })(LobbyGameList);

export function onJoinGame(gameUuid: Uuid4): Thunk {
    return async (dispatch, getState, { Api }) => {
        const result = await Api.joinGame({
            gameUuid: gameUuid,
            playerUuid: selectPlayerUuid(getState()),
        });
        dispatch(setGenialState({}));
        log.info(result);
    };
}