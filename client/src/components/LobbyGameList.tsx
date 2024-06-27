import * as React from "react";
import { connect } from "react-redux";
import * as immer from "immer";
import { Table } from '@mantine/core';

import { translate } from "../utils";
import { GamesLoadingState, GameStatus, Genial, LobbyGames, PlayerCount, Thunk, Uuid4 } from "../types";
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
    console.log("props", props, props.loadingState);
    return (
        <Table striped highlightOnHover withTableBorder withColumnBorders>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>{translate("boardSize")}</Table.Th>
                    <Table.Th>{translate("playerCount")}</Table.Th>
                    <Table.Th>{translate("gameName")}</Table.Th>
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
                            <Table.Td>{game.boardSize}</Table.Td>
                            <Table.Td>{`${game.players.length} / ${game.playerCount}`}</Table.Td>
                            <Table.Td>{game.name}</Table.Td>
                            <Table.Td>{game.players.join(", ")}</Table.Td>
                            <Table.Td>
                                <button
                                    onClick={() => props.onJoinGame(game.uuid)}
                                    data-role={"game_list_join"}
                                    disabled={game.playerCount === game.players.length as PlayerCount}
                                >
                                    {translate("joinGame")}
                                </button>
                            </Table.Td>
                        </Table.Tr>
                    );
                })}
            </Table.Tbody>
        </Table>
    );
}

export const LobbyGameListConnected = connect<any, any, any, any>((state: Genial) => ({
    games: state.lobbyGames,
    loadingState: state.loadingState,
}), { onJoinGame: onJoinGame })(LobbyGameList);

export function onJoinGame(gameUuid: Uuid4): Thunk<Genial> {
    return async (dispatch, getState, { fetchJson }) => {
        log.info("getState() before onJoinGame", getState());

        const params: { gameUuid: Uuid4; playerUuid: Uuid4; } = {
            gameUuid: gameUuid,
            playerUuid: selectPlayerUuid(getState()),
        };
        const result: any = await fetchJson("http://localhost:8080/api/game/join", { body: JSON.stringify(params) });
        log.info(result);
        dispatch(setGenialState(immer.produce(getState(), state => {
            state.game = {
                ...result,
                finished: false,
                status: GameStatus.Lobby,
            };
        })));

        log.info("getState()", getState());
    };
}