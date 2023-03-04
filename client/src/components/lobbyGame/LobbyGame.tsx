import * as React from "react";
import { connect } from "react-redux";

import { translate } from "../../utils";
import { GamesLoadingState, GenialLobby, LobbyGames, Thunk, Uuid4 } from "../../types";
import { log } from "../../log";

import "./LobbyGame.css";
import { selectPlayerUuid } from "../../selectors";
import { setGenialState } from "../../index";

export interface LobbyGameStateProps {
    games: LobbyGames;
}

export interface LobbyGameDispatchProps {
    onReadyChange: (gameUuid: Uuid4) => void;
}

export type LobbyGameProps = LobbyGameStateProps & LobbyGameDispatchProps;

export function LobbyGame(props: LobbyGameProps) {
    return (
        <div className={"game-list"}>
            <div className={"row"}>
                <div className={"boardSize"}>{translate("boardSize")}</div>
                <div className={"playerCount"}>{translate("playerCount")}</div>
                <div className={"name"}>{translate("gameName")}</div>
            </div>
        </div>
    );
}

export const LobbyGameConnected = connect<any, any, any, any>((state: GenialLobby) => ({
    games: state.games,
    loadingState: state.loadingState,
}), { onJoinGame: onJoinGame })(LobbyGame);

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