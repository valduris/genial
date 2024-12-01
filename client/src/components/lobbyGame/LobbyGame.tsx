import * as React from "react";
import * as immer from "immer";
import { connect } from "react-redux";

import { debugAssert, mapTimes, translate } from "../../utils";
import {LobbyGame, Genial, Thunk, Game, GameStatus} from "../../types";
import {createEmptyGame, setGenialState} from "../../index";
import {selectPlayerUuid, selectPlayerId, selectCurrentGameUuid} from "../../selectors";
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

// const state: FirstParam<typeof selectCurrentGameUuid> = {
//     "lobbyGames": {
//         "fa8011c3-056b-4e26-b24e-a67d21649597": {
//             "boardSize": 6,
//             "name": "",
//             "playerCount": 2,
//             "players": [],
//             "showProgress": true,
//             "adminId": 12,
//             "uuid": "fa8011c3-056b-4e26-b24e-a67d21649597"
//         },
//         "42243e19-22f2-4a6f-b8c8-b27e1cdb9d08": {
//             "boardSize": 6,
//             "name": "",
//             "playerCount": 2,
//             "players": [
//                 {
//                     "id": 1,
//                     "name": "1",
//                     "ready": false
//                 }
//             ],
//             "adminId": 12897,
//             "showProgress": true,
//             "uuid": "42243e19-22f2-4a6f-b8c8-b27e1cdb9d08"
//         },
//         "1f3ed932-1518-4fee-8746-b540405b5fe7": {
//             "boardSize": 6,
//             "name": "",
//             "playerCount": 2,
//             "players": [],
//             "showProgress": true,
//             "adminId": 11212,
//             "uuid": "1f3ed932-1518-4fee-8746-b540405b5fe7"
//         },
//         "9b7a1aae-5b9f-4218-90d4-90722675e289": {
//             "boardSize": 6,
//             "name": "",
//             "playerCount": 2,
//             "players": [],
//             "showProgress": true,
//             "adminId": 12334234222,
//             "uuid": "9b7a1aae-5b9f-4218-90d4-90722675e289"
//         },
//     },
//     "playerId": 1
// };
// const uuid = selectCurrentGameUuid(state);
// console.log("uuid", uuid);
// console.log("uuid", uuid);
// console.log("uuid", uuid);

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

            // if (ready) {
            //     state.game = { ...createEmptyGame(), ...state.game, status: GameStatus.InProgress } as unknown as Game;
            // }
        })));

        const body = { playerUuid: selectPlayerUuid(getState()), ready: ready, gameUuid: lobbyGameUuid };
        await fetchJson("http://localhost:8080/api/game/ready", { body: JSON.stringify(body) });
    }
}

export function onLeaveGame(): Thunk {
    return async (dispatch, getState) => {
        const state = getState();

        console.log("state", state);

        if (!state.game) {
            return;
        }

        const result = await fetchJson("http://localhost:8080/api/game/leave", {
            body: JSON.stringify({
                playerUuid: selectPlayerUuid(state),
                gameUuid: selectCurrentGameUuid(state),
            }),
        });

        if (result.status === "ok") {

        } else if (result.status === "error") {
            console.error(result);
        }
        // dispatch(setGenialState(immer.produce(state, state => {
        //     state.game = undefined;
        // })));
    };
}
