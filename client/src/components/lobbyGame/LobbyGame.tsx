import * as React from "react";
import * as immer from "immer";
import { connect } from "react-redux";

import { debugAssert, handleFetchResult, mapTimes, translate } from "../../utils";
import { LobbyGame, Genial, Thunk } from "../../types";
import { setGenialState } from "../../index";
import { selectPlayerUuid, selectPlayerId, selectCurrentGameUuid } from "../../selectors";
import { fetchJson } from "../../api";
import { Button, Checkbox, Container, Fieldset, InputWrapper, Table, TextInput, Grid } from "@mantine/core";
import { MAX_PLAYER_COUNT } from "../../consts";

export interface LobbyGameStateProps {
    lobbyGame: LobbyGame | undefined;
    playerUuid: string;
    adminId: number;
}

export interface LobbyGameDispatchProps {
    onLeaveGame: () => void;
    onReadyChange: () => void;
}

export type LobbyGameProps = LobbyGameStateProps & LobbyGameDispatchProps;

export function LobbyGameComponent(props: LobbyGameProps) {
    if (!props.lobbyGame) {
        return null;
    }

    return (
        <Container>
            <Grid>
                <Grid.Col span={6}>
                    <Fieldset>
                        <TextInput label={translate("gameName")} value={props.lobbyGame.name} disabled />
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
                                const player = props.lobbyGame!.players[i];
                                const content: string = player
                                    ? player.name
                                    : props.lobbyGame!.playerCount >= i
                                        ? translate("waitingForPlayerToJoin")
                                        : translate("openSlot");

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

export const LobbyGameConnected = connect((state: Genial) => {
    const lobbyGameUuid = selectCurrentGameUuid(state);
    return {
        lobbyGame: lobbyGameUuid ? state.lobbyGames[lobbyGameUuid] : undefined,
        adminId: selectPlayerId(state),
        playerUuid: selectPlayerUuid(state),
    };
}, { onLeaveGame: onLeaveGame, onReadyChange: onReadyChange })(LobbyGameComponent);

export function onReadyChange(): Thunk {
    return async (dispatch, getState) => {
        const state = getState();
        const lobbyGameUuid = selectCurrentGameUuid(state);

        if (!lobbyGameUuid) {
            return debugAssert("state.game not defined");
        }

        let ready;

        dispatch(setGenialState(immer.produce(getState(), state => {
            const player = state.lobbyGames[lobbyGameUuid].players.find(p => !!p && p.id === state.player.id);

            if (!player) {
                return debugAssert("player not found");
            }

            player.ready = !player.ready;
            ready = player.ready;
        })));

        const body = { playerUuid: selectPlayerUuid(getState()), ready: ready, gameUuid: lobbyGameUuid };
        await fetchJson("http://localhost:8080/api/game/ready", { body: JSON.stringify(body) });
    }
}

export function onLeaveGame(): Thunk {
    return async (dispatch, getState) => {
        const state = getState();
        dispatch(handleFetchResult(await fetchJson("http://localhost:8080/api/game/leave", {
            body: JSON.stringify({
                playerUuid: selectPlayerUuid(state),
                gameUuid: selectCurrentGameUuid(state),
            }),
        })));
    };
}
