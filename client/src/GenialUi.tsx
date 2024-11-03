import * as immer from "immer";
import * as React from "react";
import { connect } from "react-redux";
import { createTheme, MantineProvider, AppShell } from '@mantine/core';

import { Thunk, PlayerHexyPairIndex, Genial, GameStatus } from "./types"
import { setGenialState } from "./index";
import { LobbyGameListConnected, PlayerHexyPairListConnected, ProgressBarsConnected } from "./components";
import { BoardConnected } from "./components/Board";
import { CreateGameFormConnected } from "./components/CreateGameForm";
import { LobbyGameConnected } from "./components/lobbyGame/LobbyGame";
import { Navigation } from "./components/navigation/Navigation";
import { PlayerRegistrationFormConnected } from "./components/PlayerRegistrationForm";

import '@mantine/core/styles.css';

export interface GenialUiStateProps {
    game: Genial["game"];
    playerName: Genial["player"]["name"];
}

const theme = createTheme({});

export function GenialUi(props: GenialUiStateProps) {
    return (
        <MantineProvider theme={theme}>
            <AppShell>
                <div className="genial">
                    <Navigation />
                    <span>{props.playerName}</span>
                    <hr />
                    <CreateGameFormConnected />
                    <LobbyGameListConnected />
                    {props.game && <LobbyGameConnected />}
                    {props.game && props.game.status === GameStatus.InProgress && (
                        <>
                            <BoardConnected />
                            <PlayerHexyPairListConnected />
                            <ProgressBarsConnected />
                        </>
                    )}
                    <PlayerRegistrationFormConnected />
                </div>
            </AppShell>
        </MantineProvider>
    );
}

export const GenialUiConnected = connect((state: Genial) => ({
    game: state.game,
    playerName: state.player.name,
}))(GenialUi);

export function onPlayerHexyPairClick(hexyPairIndex: PlayerHexyPairIndex, hexyIndex: 0 | 1): Thunk {
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
