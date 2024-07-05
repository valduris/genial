import * as React from "react";
import * as immer from "immer";
import { connect } from "react-redux";

import { debugAssert, mapTimes, translate } from "../../utils";
import { Game, Genial, LobbyGames, PlayerCount, Thunk, Uuid4 } from "../../types";
import { setGenialState } from "../../index";
import { selectPlayerUuid } from "../../selectors";
import { fetchJson } from "../../api";
import { Button, Checkbox, Container, Fieldset, InputWrapper, Table, TextInput, Grid } from "@mantine/core";
import { MAX_PLAYER_COUNT } from "../../consts";

export interface LobbyGameStateProps {
    games: LobbyGames;
    game: Game;
    playerUuid: string;
    adminUuid: string;
}

export interface LobbyGameDispatchProps {
    onLeaveGame: () => void;
    onReadyChange: () => void;
}

export type LobbyGameProps = LobbyGameStateProps & LobbyGameDispatchProps;

export function LobbyGame(props: LobbyGameProps) {
    if (!props.game) {
        return null;
    }

    return (
        <Container>
            <Grid>
                <Grid.Col span={6}>
                    <Fieldset>
                        <TextInput label={translate("gameName")} value={props.game.name} disabled />
                        <InputWrapper label={translate("boardSize")}>
                            <Button.Group>
                                {[6, 7, 8].map(n => {
                                    return (
                                        <Button key={`board_size_${n}`}>
                                            {n}
                                        </Button>
                                    );
                                })}
                            </Button.Group>
                        </InputWrapper>
                        <InputWrapper label={translate("playerCount")}>
                            <Button.Group>
                                {[2, 3, 4].map(n => {
                                    return (
                                        <Button key={`player_count_${n}`}>
                                            {n}
                                        </Button>
                                    );
                                })}
                            </Button.Group>
                        </InputWrapper>
                        <InputWrapper
                            label={translate("showProgress")}
                            description={translate("showProgressDescription")}
                        >
                            <Checkbox defaultChecked onChange={(e) => {}}/>
                        </InputWrapper>
                    </Fieldset>
                </Grid.Col>
                <Grid.Col span={6}>
                    <h2>{translate("players")}</h2>
                    <Table striped highlightOnHover withTableBorder withColumnBorders>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>{translate("player")}</Table.Th>
                                <Table.Th>{translate("ready?")}</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {mapTimes(MAX_PLAYER_COUNT, (i => {
                                const player = props.game.players[i];
                                console.log("player", player);
                                const content: string = player
                                    ? player.name
                                    : props.game.playerCount >= i
                                        ? translate("waitingForPlayerToJoin")
                                        : translate("openSlot");
                                // props.game.adminUuid !== props.playerUuid

                                return (
                                    <Table.Tr key={i}>
                                        <Table.Td>{content}</Table.Td>
                                        <Table.Td>
                                            {/*<InputWrapper>*/}
                                            {player && <Checkbox onChange={props.onReadyChange} checked={player.ready} />}
                                            {/*</InputWrapper>*/}
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            }))}
                        </Table.Tbody>
                    </Table>
                    <Button onClick={props.onLeaveGame} mt="md">{translate("leaveGame")}</Button>
                </Grid.Col>
            </Grid>
        </Container>
    );
}

export const LobbyGameConnected = connect<any, any, any, any>((state: Genial) => ({
    game: state.game,
    playerUuid: selectPlayerUuid(state),
    adminUuid: selectPlayerUuid(state),
}), { onLeaveGame: onLeaveGame, onReadyChange: onReadyChange })(LobbyGame);

export function onReadyChange(): Thunk {
    return async (dispatch, getState) => {
        const state = getState();

        if (!state.game) {
            return debugAssert("state.game not defined");
        }

        const ready = !state.game.players[state.playerUuid].ready;
        const body = { playerUuid: selectPlayerUuid(getState()), ready: ready };
        const result = await fetchJson("http://localhost:8080/api/game/ready", { body: JSON.stringify(body) });
    }
}

export function onLeaveGame(): Thunk {
    return async (dispatch, getState) => {
        const state = getState();
        const result = await fetchJson("http://localhost:8080/api/game/leave", {
            body: JSON.stringify({ playerUuid: selectPlayerUuid(state) }),
        });
        dispatch(setGenialState(immer.produce(state, state => {
            state.game = undefined;
            state.gameUuid = undefined;
        })));
    };
}