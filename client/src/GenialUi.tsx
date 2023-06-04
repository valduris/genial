import * as immer from "immer";
import * as React from "react";
import { connect } from "react-redux";

import { Thunk, PlayerHexyPairIndex, GenialInProgress, GameStatus, Genial, GenialLobby } from "./types"
import { setGenialState } from "./index";
import { LobbyGameListConnected, PlayerHexyPairListConnected, ProgressConnected } from "./components";
import { BoardConnected } from "./components/Board";
import { CreateGameFormConnected } from "./components/CreateGameForm";
import { LobbyGameConnected } from "./components/lobbyGame/LobbyGame";
import { Navigation } from "./components/navigation/Navigation";
// import { type prismaCreateGame } from "./serverTypes";
import { type ServerSentEvent } from "types";
// import { type ServerSentEvent } from "validators";

// type Ret = ReturnType<typeof prismaCreateGame>;

const x: ServerSentEvent = "sfd";
    // x: "234",
// }

export interface GenialUiStateProps {
    status: GameStatus;
    game: Pick<Genial, "game">;
}

export function GenialUi(props: GenialUiStateProps) {
    return (
        <div className="genial">
            <Navigation />
            <hr />
            {props.status === GameStatus.Lobby && (
                <>
                    {!props.game && <CreateGameFormConnected />}
                    <LobbyGameListConnected />
                    <LobbyGameConnected />
                </>
            )}
            {props.status === GameStatus.InProgress && (
                <>
                    <BoardConnected />
                    <PlayerHexyPairListConnected />
                    <ProgressConnected />
                </>
            )}
        </div>
    );
}

export const GenialUiConnected = connect<any, any, any, any>((state: GenialLobby) => ({
    game: state.game,
    status: state.status,
}))(GenialUi);

export type OnPlayerHexyPairClickState = GenialInProgress;

export function onPlayerHexyPairClick(hexyPairIndex: PlayerHexyPairIndex, hexyIndex: 0 | 1): Thunk<OnPlayerHexyPairClickState> {
    return (dispatch, getState) => {
        dispatch(setGenialState(immer.produce(getState(), state => {
            state.player.hexyPairs.forEach(hexyPair => {
                if (hexyPair) {
                    hexyPair.forEach(hexy => hexy.selected = false);
                }
            });
            state.player.hexyPairs[hexyPairIndex]![hexyIndex]!.selected = true;
        })));
    };
}
