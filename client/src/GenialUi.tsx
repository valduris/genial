import * as immer from "immer";
import * as React from "react";
import { connect } from "react-redux";
import { createTheme, MantineProvider } from '@mantine/core';

import { Thunk, PlayerHexyPairIndex, Genial, GameStatus } from "./types"
import { setGenialState } from "./index";
import { LobbyGameListConnected, PlayerHexyPairListConnected, ProgressBarsConnected } from "./components";
import { BoardConnected } from "./components/Board";
import { CreateGameFormConnected } from "./components/CreateGameForm";
import { LobbyGameConnected } from "./components/lobbyGame/LobbyGame";
import { Navigation } from "./components/navigation/Navigation";
import { GameStartFormConnected } from "./components/GameStartForm";

export interface GenialUiStateProps {
    game: Genial["game"];
}

const theme = createTheme({});

export function GenialUi(props: GenialUiStateProps) {
    return (
        <MantineProvider theme={theme}>
            <div className="genial">
                <Navigation />
                <hr />
                {!props.game && (
                    <>
                        <div className="columns">
                            <div className="column is-4">
                                {!props.game && <CreateGameFormConnected />}
                            </div>
                            <div className="column is-8">
                                <LobbyGameListConnected />
                                <LobbyGameConnected />
                            </div>
                        </div>
                    </>
                )}
                <GameStartFormConnected />
                {props.game && props.game.status === GameStatus.InProgress && (
                    <>
                        <BoardConnected />
                        <PlayerHexyPairListConnected />
                        <ProgressBarsConnected />
                    </>
                )}
            </div>
        </MantineProvider>
    );
}

export const GenialUiConnected = connect<any, any, any, any>((state: Genial) => ({
    game: state.game,
}))(GenialUi);

export type OnPlayerHexyPairClickState = Genial;

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
