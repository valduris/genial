import * as React from "react";
import { connect } from "react-redux";
import * as immer from "immer";
import { Checkbox, InputWrapper, Table, Container } from '@mantine/core';

import { translate } from "../utils";
import { GamesLoadingState, Genial, LobbyGames, PlayerCount, Thunk, Uuid4 } from "../types";
import { log } from "../log";

import { selectPlayerUuid } from "../selectors";
import { setGenialState } from "../index";

export interface LobbyGameListStateProps {
    games: LobbyGames;
    loadingState: GamesLoadingState;
}

export interface LobbyGameListDispatchProps {
    onJoinGame: (gameUuid: Uuid4) => void;
}

export type LobbyGameListProps = LobbyGameListStateProps & LobbyGameListDispatchProps;

export function LobbyGameList(props: LobbyGameListProps) {
    return (
        <Container>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>{translate("gameName")}</Table.Th>
                        <Table.Th>{translate("boardSize")}</Table.Th>
                        <Table.Th>{translate("showProgress")}</Table.Th>
                        <Table.Th>{translate("playerCount")}</Table.Th>
                        <Table.Th>{translate("players")}</Table.Th>
                        <Table.Th></Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {props.loadingState === "loading" && (
                        <Table.Tr>
                            <td className={"loading"}>{translate("loading")}</td>
                        </Table.Tr>
                    )}
                    {props.loadingState === "noGames" && (
                        <Table.Tr>
                            <td className={"noGames"}>{translate("noGames")}</td>
                        </Table.Tr>
                    )}
                    {props.loadingState === "loaded" && props.games.map(game => {
                        return (
                            <Table.Tr key={game.uuid}>
                                <Table.Td>{game.name}</Table.Td>
                                <Table.Td>{game.boardSize}</Table.Td>
                                <Table.Td>
                                    <InputWrapper>
                                        <Checkbox defaultChecked={game.showProgress} disabled />
                                    </InputWrapper>
                                </Table.Td>
                                <Table.Td>{`${Object.keys(game.players).length} / ${game.playerCount}`}</Table.Td>
                                <Table.Td>{Object.keys(game.players).map(id => game.players[(id as unknown as number)].name).join(", ")}</Table.Td>
                                <Table.Td>
                                    <button
                                        onClick={() => props.onJoinGame(game.uuid)}
                                        data-role={"game_list_join"}
                                        disabled={game.playerCount === Object.keys(game.players).length as PlayerCount}
                                    >
                                        {translate("joinGame")}
                                    </button>
                                </Table.Td>
                            </Table.Tr>
                        );
                    })}
                </Table.Tbody>
            </Table>
        </Container>
    );
}

export const LobbyGameListConnected = connect((state: Genial) => ({
    games: state.lobbyGames,
    loadingState: state.loadingState,
}), { onJoinGame: onJoinGame })(LobbyGameList);

export function onJoinGame(gameUuid: Uuid4): Thunk<Genial> {
    return async (dispatch, getState, { fetchJson }) => {
        const params: { gameUuid: Uuid4; playerUuid: Uuid4; } = {
            gameUuid: gameUuid,
            playerUuid: selectPlayerUuid(getState()),
        };
        const result: any = await fetchJson("http://localhost:8080/api/game/join", { body: JSON.stringify(params) });
        log.info("/api/game/join", result);
        dispatch(setGenialState(immer.produce(getState(), state => {
            // const currLobbyGame = state.lobbyGames.find(game => game.players. === gameUuid);
            const lobbyGame = state.lobbyGames.find(game => game.uuid === gameUuid);
            if (lobbyGame) {
                lobbyGame.players = result.data.players;
            }
        })));

        // log.info("getState()", getState());
    };
}