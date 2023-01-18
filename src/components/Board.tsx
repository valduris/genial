import * as classNames from "classnames";
import * as immer from "immer"
import * as React from "react";
import { connect } from "react-redux";

import {
    calulateProgressGained,
    clamp,
    createBoardHexyPair,
    createHexy,
    getColsByRow,
    getXyCoordsByRowCol
} from "../utils";
import {
    selectGameId,
    selectHexyStyleByPoint, selectIsPointAllowedToReceiveHover,
    selectPlayerSelectedHexyPair,
    selectPlayerSelectedHexyPairHexyColor
} from "../selectors";
import { HexyComponent } from "./Hexy";
import { Game, GenialUiState, PlayerHexyPair, Point, ProgressValue, Thunk } from "../types";
import { setGenialUiState } from "../index";
import { COLORS } from "../consts";

export interface BoardOwnProps {
    children: React.ReactNode;
}

export interface BoardStateProps {
    game: Pick<Game, "player" | "boardSize" | "hexyPairs">;
}

export interface BoardDispatchProps {
    onBoardHexyMouseEnter: typeof onBoardHexyMouseEnter;
    onPreviewedBoardHexyClick: typeof onPreviewedBoardHexyClick;
}

export type BoardProps = BoardOwnProps & BoardStateProps & BoardDispatchProps;

const VIEW_BOX_MAP = {
    6: "0 0 1110 1040",
    7: "0 0 1280 1196",
    8: "0 0 1450 1355",
};

export function Board(props: BoardProps) {
    return (
        <div className={"svg-container"}>
            <svg viewBox={VIEW_BOX_MAP[props.game.boardSize]} xmlns="http://www.w3.org/2000/svg">
                <g className={"atlas"}>
                    {(() => {
                        const result = [];
                        const boardSize = props.game.boardSize;

                        for (let row = -boardSize; row <= boardSize; row++) {
                            const cols = getColsByRow(row, boardSize);
                            const xMin = row <= 0 ? -(boardSize) - row : -(boardSize);
                            const xMax = cols - Math.abs(xMin) + 1;

                            for (let col = xMin; col <= xMax; col++) {
                                const { x, y } = getXyCoordsByRowCol({ row: row, col: col, boardSize: props.game.boardSize });
                                const hexyStyle = selectHexyStyleByPoint(props, { x: col, y: row });

                                result.push(
                                    <g
                                        className={classNames("atlasHexy", { handCursor: hexyStyle.preview })}
                                        onMouseEnter={() => props.onBoardHexyMouseEnter({ x: col, y: row })}
                                        onClick={() => props.onPreviewedBoardHexyClick({ x: col, y: row }, hexyStyle.preview)}
                                        transform={`translate(${x}, ${y}) rotate(90, 45, 45)`}
                                        key={`${col}_${row}`}
                                    >
                                        <path
                                            d="m0.5,50l21.2,-42.3l56.5,0l21.2,42.41l-21.2,42.4-56.5,0l-21.2,-42.35z"
                                            stroke="#333"
                                            fill={hexyStyle.hex.fill}
                                            strokeWidth={hexyStyle.hex.strokeWidth}
                                        />
                                        <text x="30" y="50" transform={"rotate(-90, 45, 45)"}>{`${col},${row}`}</text>
                                        {hexyStyle.circle.color && (
                                            <ellipse
                                                ry="30"
                                                rx="30"
                                                stroke="#aaa"
                                                cx={50}
                                                cy={50}
                                                fill={hexyStyle.circle.color}
                                            />
                                        )}
                                    </g>
                                );
                            }
                        }
                        return result;
                    })()}
                </g>
                <g className="board">
                    {props.game.hexyPairs.map((hexyPair, index) => {
                        return (
                            <g key={index}>
                                {hexyPair.map(hexy => {
                                    const { x, y } = getXyCoordsByRowCol({ row: hexy.y, col: hexy.x, boardSize: props.game.boardSize });
                                    return (
                                        <HexyComponent
                                            key={`${x}_${y}`}
                                            color={hexy.color}
                                            cx={x}
                                            cy={y}
                                        />
                                    )
                                })}
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}

export const BoardConnected = connect<any, any, any, any>(
    (state) => ({ game: state.game }),
    {
        onBoardHexyMouseEnter: onBoardHexyMouseEnter,
        onPreviewedBoardHexyClick: onPreviewedBoardHexyClick,
    },
)(Board);

export type OnBoardHexyMouseEnterState = GenialUiState;

export function onBoardHexyMouseEnter(point: Point): Thunk<OnBoardHexyMouseEnterState> {
    return (dispatch, getState) => {
        dispatch(setGenialUiState(immer.produce(getState(), state => {
            if (selectIsPointAllowedToReceiveHover(state, point)) {
                state.game.player.hoveredHexyCoords = point;
            }
        })));
    };
}

export type OnPreviewedBoardHexyClickState = GenialUiState;

export function onPreviewedBoardHexyClick(point: Point, preview: boolean): Thunk<OnPreviewedBoardHexyClickState> {
    return (dispatch, getState, { Api }) => {
        if (!preview) {
            return;
        }

        dispatch(setGenialUiState(immer.produce(getState(), state => {
            const playerSelectedHexyPair = selectPlayerSelectedHexyPair(state);

            if (!playerSelectedHexyPair) {
                return
            }

            if (!state.game.player.firstPlacedHexy) {
                state.game.player.firstPlacedHexy = createHexy(point.x, point.y, selectPlayerSelectedHexyPairHexyColor(state)!);
                const isZerothHexySelected = playerSelectedHexyPair[0].selected;
                playerSelectedHexyPair[isZerothHexySelected ? 0 : 1].selected = false;
                playerSelectedHexyPair[isZerothHexySelected ? 1 : 0].selected = true;
            } else if (state.game.player.firstPlacedHexy !== undefined) {
                const boardHexyPair = createBoardHexyPair(
                    state.game.player.firstPlacedHexy,
                    createHexy(point.x, point.y, selectPlayerSelectedHexyPairHexyColor(state)!)
                );
                const progressGained = calulateProgressGained(state.game, boardHexyPair);
                const movesGained = COLORS.reduce((memo, color) => {
                    const newProgress = clamp(0, state.game.player.progress[color] + progressGained[color], 18);
                    const result = state.game.player.progress[color] !== 18 && newProgress === 18 ? memo + 1 : memo;
                    state.game.player.progress[color] = newProgress as ProgressValue;
                    return result;
                }, 0);
                const movesRemaining = state.game.player.movesInTurn + movesGained - 1;

                state.game.player.movesInTurn = movesRemaining;
                state.game.hexyPairs.push(boardHexyPair);
                state.game.player.hexyPairs.splice(state.game.player.hexyPairs.indexOf(playerSelectedHexyPair), 1, undefined);
                state.game.player.firstPlacedHexy = undefined;

                if (movesRemaining === 0) {
                    while (state.game.player.hexyPairs.some(h => h === undefined)) {
                        const randomIndex = Math.floor(Math.random() * state.game.drawableHexyPairs.length);
                        const [drawnHexyPair] = state.game.drawableHexyPairs.splice(randomIndex, 1);
                        // console.log(JSON.stringify(state.game.player.hexyPairs, null, 2))
                        const emptyIndex = state.game.player.hexyPairs.findIndex(h => h === undefined);
                        state.game.player.hexyPairs.splice(emptyIndex, 1, drawnHexyPair.map(h => ({
                            color: h.color,
                            selected: false,
                        })) as PlayerHexyPair);
                    }
                    // assign move to another player
                }

                state.game.player.movesInTurn = 1;

                Api.placeHexyPairOnBoard({
                    playerId: 1,
                    gameId: selectGameId(state),
                    hexy: boardHexyPair,
                });
            }
        })));
    };
}

