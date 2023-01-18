import * as immer from "immer"
import * as React from "react";

import { Thunk, GenialUiState, PlayerHexyPairIndex } from "./types"
import { setGenialUiState } from "./index";
import { PlayerHexyPairListConnected, ProgressConnected } from "./components";
import { BoardConnected } from "./components/Board";
import { CreateGameFormConnected } from "./components/CreateGameForm";

export function GenialUi() {
    return (
        <div className="genial">
            <CreateGameFormConnected />
            <BoardConnected />
            <PlayerHexyPairListConnected />
            <ProgressConnected />
        </div>
    );
}

export type OnPlayerHexyPairClickState = GenialUiState;

export function onPlayerHexyPairClick(hexyPairIndex: PlayerHexyPairIndex, hexyIndex: 0 | 1): Thunk<OnPlayerHexyPairClickState> {
    return (dispatch, getState) => {
        dispatch(setGenialUiState(immer.produce(getState(), state => {
            state.game.player.hexyPairs.forEach(hexyPair => {
                if (hexyPair) {
                    hexyPair.forEach(hexy => hexy.selected = false);
                }
            });
            state.game.player.hexyPairs[hexyPairIndex]![hexyIndex]!.selected = true;
        })));
    };
}
