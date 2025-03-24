import * as immer from "immer";
import * as React from "react";
import { connect } from "react-redux";
import { createTheme, MantineProvider, AppShell, MantineColorsTuple } from '@mantine/core';

import { Thunk, PlayerHexyPairIndex, Genial, WebSocketState } from "./types"
import { setGenialState } from "./index";
import { LobbyGameListConnected, PlayerHexyPairListConnected, ProgressBarsConnected } from "./components";
import { BoardConnected } from "./components/Board";
import { CreateGameFormConnected } from "./components/CreateGameForm";
import { LobbyGameConnected } from "./components/lobbyGame/LobbyGame";
import { Navigation } from "./components/navigation/Navigation";
import { SystemMessageConnected } from "./components/SystemMessage";

import '@mantine/core/styles.css';

export interface GenialUiStateProps {
    game: Genial["game"];
    playerName: Genial["player"]["name"];
    webSocketStatus: string;
}

const COLORS: MantineColorsTuple = [
    "#fff4e1",
    "#ffe8cc",
    "#fed09b",
    "#fdb766",
    "#fca13a",
    "#fc931d",
    "#fc8c0c",
    "#e17800",
    "#c86a00",
    "#af5a00"
];

const THEME = createTheme({
    colors: {
        blue: COLORS,
    },
    primaryColor: "blue",
});

export function GenialUi(props: GenialUiStateProps) {
    return (
        <MantineProvider theme={THEME}>
            <AppShell>
                <div className="genial">
                    <Navigation />
                    <SystemMessageConnected />
                    <span>{props.playerName}</span>
                    <span style={{ float: "right" }}>{props.webSocketStatus}</span>
                    <hr />
                    <CreateGameFormConnected />
                    <LobbyGameListConnected />
                    <LobbyGameConnected />
                    {props.game && props.game.status === "in_progress" && (
                        <>
                            <BoardConnected />
                            <PlayerHexyPairListConnected />
                            <ProgressBarsConnected />
                        </>
                    )}
                    {/*<PlayerRegistrationFormConnected />*/}
                </div>
            </AppShell>
        </MantineProvider>
    );
}

function webSocketStateToString(webSocketState: WebSocketState): string {
    console.log("webSocketState", webSocketState);
    return {
        0: "CONNECTING",
        1: "OPEN",
        2: "CLOSING",
        3: "CLOSED",
    }[webSocketState];
}

export const GenialUiConnected = connect((state: Genial) => ({
    game: state.game,
    playerName: state.player.name,
    webSocketStatus: webSocketStateToString(state.webSocketState),
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
