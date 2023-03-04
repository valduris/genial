import * as immer from "immer"
import * as React from "react";

import { Thunk, PlayerHexyPairIndex, GenialInProgress, GameStatus } from "./types"
import { setGenialState } from "./index";
import { LobbyGameListConnected, PlayerHexyPairListConnected, ProgressConnected } from "./components";
import { BoardConnected } from "./components/Board";
import { CreateGameFormConnected } from "./components/CreateGameForm";

export function GenialUi(props: { status: GameStatus; }) {
    return (
        <div className="genial">
            {props.status === GameStatus.Lobby && (
                <>
                    <CreateGameFormConnected />
                    <LobbyGameListConnected />
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
