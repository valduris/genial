import * as React from "react";
import { connect } from "react-redux";

import { mapTimes, translate } from "../../utils";
import { GameStatus, GenialLobby, LobbyGames, Thunk, Uuid4 } from "../../types";
import { setGenialState } from "../../index";
import { selectPlayerUuid } from "../../selectors";

export interface LobbyGameStateProps {
    games: LobbyGames;
    game: Pick<GenialLobby, "game">;
    playerUuid: string;
    adminUuid: string;
}

export interface LobbyGameDispatchProps {
    onReadyChange: (gameUuid: Uuid4) => void;
    onStartGame: (gameUuid: Uuid4) => void;
}

export type LobbyGameProps = LobbyGameStateProps & LobbyGameDispatchProps;

export function LobbyGame(props: LobbyGameProps) {
    if (!props.game) {
        return null;
    }

    return (
        <div className={"section"}>
            <table className={"table"}>
                <thead>
                    <tr>
                        <td>{translate("boardSize")}</td>
                        <td>{translate("playerCount")}</td>
                        <td>{translate("public")}</td>
                        <td>{translate("showProgress")}</td>
                        <td>{translate("gameName")}</td>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{props.game.boardSize}</td>
                        <td>{props.game.playerCount}</td>
                        <td><input type={"checkbox"} readOnly checked={props.game.public} /></td>
                        <td><input type={"checkbox"} readOnly checked={props.game.showProgress} /></td>
                        <td>{props.game.name}</td>
                    </tr>
                </tbody>
            </table>
            <h2>{translate("players")}</h2>
            <table className={"table"}>
                <thead>
                    <tr>
                        <td>{translate("name")}</td>
                    </tr>
                </thead>
                <tbody>
                    {mapTimes(props.game.playerCount, (i => {
                        const player = props.game.players[i];
                        return (
                            <tr key={i}>
                                <td>{player ? player.name : translate("waitingForPlayerToJoin")}</td>
                            </tr>
                        );
                    }))}
                </tbody>
            </table>
            <input
                className={"button is-primary"}
                type={"submit"}
                onSubmit={() => props.onStartGame(props.game.uuid)}
                value={translate("startGame")}
                disabled={(
                    props.game.players.length !== props.game.playerCount
                    ||
                    props.game.adminUuid !== props.playerUuid
                )}
            />
        </div>
    );
}

export const LobbyGameConnected = connect<any, any, any, any>((state: GenialLobby) => ({
    games: state.games,
    game: state.game,
    loadingState: state.loadingState,
    playerUuid: selectPlayerUuid(state),
    adminUuid: selectPlayerUuid(state),
}), { onStartGame: onStartGame })(LobbyGame);

export function onStartGame(gameUuid: Uuid4): Thunk {
    return async (dispatch, getState) => {
        // const playerUuid = selectPlayerUuid(getState());
        // const body: GamePostParams = { ...data, adminUuid: playerUuid };
        // const result = await fetchJson("http://localhost:3300/api/game", { body: JSON.stringify(body) });
        // console.log(result);
        // dispatch(setGenialState(immer.produce(getState(), state => {
        //     state.game = {
        //         ...result,
        //         finished: false,
        //         status: GameStatus.Lobby,
        //     };
        // })));
        // console.log("onCreateGameFormSubmit", getState());
        //
        //
        // // const result = await Api.joinGame({
        // //     gameUuid: gameUuid,
        // //     playerUuid: selectPlayerUuid(getState()),
        // // });
        // dispatch(setGenialState({}));
        // // log.info(result);
    };
}