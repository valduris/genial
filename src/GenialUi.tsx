import * as immer from "immer"
import * as React from "react";
import { connect } from "react-redux";
import * as classNames from "classnames";

import {
    Game,
    Thunk,
    GenialUiState,
    PlayerHexyPairIndex,
    Point,
    PlayerHexyPair,
    Color,
    DeepPick,
    BoardHexy, FirstParam
} from "./types"
import { setGenialUiState } from "./index";
import { SPECIAL_CORNERS } from "./consts";
import { HexyComponent, FooterConnected, ProgressConnected } from "./components";
import {
    createBoardHexyPair,
    createHexy,
    getColsByRow,
    getNeighboringHexysOf,
    isNeighborOf
} from "./utils";

export type WindowType = "settings" | "debug";

export interface GenialUiStateProps {
    game: Pick<Game, "player" | "boardSize" | "hexyPairs">;
    visibleWindow?: WindowType;
}

export interface GenialUiDispatchProps {
    onBoardHexyMouseEnter: typeof onBoardHexyMouseEnter;
    onPreviewedBoardHexyClick: typeof onPreviewedBoardHexyClick;
}

export type GenialUiProps = GenialUiStateProps & GenialUiDispatchProps;

export function getXyCoordsByRowCol(params: { row: number; col: number; }): { x: number; y: number; } {
    const x = Math.abs(6 - params.row) * 85 / 2 + 85 * params.col - 70;
    const y = params.row * 78 - 78;
    return { x: x, y: y };
}

export function selectIsHexyPreviewed<T extends Point>(
    state: DeepPick<GenialUiState, "game", "player", "hoveredHexyCoords"> & FirstParam<typeof selectPlayerSelectedHexyPair>
        & FirstParam<typeof selectPlayerSelectedHexyPairHexyColor>,
    point: T,
): boolean {
    const hoveredHexyCoords = state.game.player.hoveredHexyCoords;
    const playerSelectedHexyPair = selectPlayerSelectedHexyPair(state);
    const specialCornerColor = getSpecialCornerColorByPoint(point);
    const isHovered = hoveredHexyCoords?.x === point.x && hoveredHexyCoords.y === point.y;
    const preview = isHovered && playerSelectedHexyPair && (
        !specialCornerColor || specialCornerColor === selectPlayerSelectedHexyPairHexyColor(state)
    );

    return !!preview;
}

export function getSpecialCornerColorByPoint<T extends Point>(point: T): Color | undefined {
    return SPECIAL_CORNERS.find(cornerHexy => cornerHexy.x === point.x && cornerHexy.y === point.y)?.color;
}

export interface HexyStyle {
    circle: {
        color: Color | undefined;
    };
    hex: {
        fill: string;
        strokeWidth: number;
    };
    preview: boolean;
}

export function selectFirstPlacedHexy(state: DeepPick<GenialUiState, "game", "player", "firstPlacedHexy">): BoardHexy | undefined {
    return state.game.player.firstPlacedHexy;
}

export type GetHexyStyleByPointState = FirstParam<typeof selectFirstPlacedHexy> & FirstParam<typeof selectPlayerSelectedHexyPair>
    & FirstParam<typeof selectIsHexyPreviewed> & FirstParam<typeof selectPlayerSelectedHexyPairHexyColor>;

export function getHexyStyleByPoint(state: GetHexyStyleByPointState, point: Point): HexyStyle {
    const specialCornerColor = getSpecialCornerColorByPoint(point);
    const preview = selectIsHexyPreviewed(state, point);
    const firstPlacedHexy = selectFirstPlacedHexy(state);
    const isFirstPlacedHexy = firstPlacedHexy && firstPlacedHexy.x === point.x && firstPlacedHexy.y === point.y;

    return {
        hex: {
            fill: isFirstPlacedHexy
                ? "#444"
                : preview
                    ? "#777"
                    : "#fff",
            strokeWidth: isFirstPlacedHexy ? 3 : 1,
        },
        circle: {
            color: isFirstPlacedHexy
                ? firstPlacedHexy.color
                : preview
                    ? selectPlayerSelectedHexyPairHexyColor(state)
                    : specialCornerColor,
        },
        preview: preview,
    };
}

export function GenialUi(props: GenialUiProps) {
    return (
        <div className="genial">
            <main>
                <svg width="960" height="900" xmlns="http://www.w3.org/2000/svg">
                    <g className={"atlas"}>
                        {(() => {
                            const result = [];
                            for (let row = 1; row <= 11; row++) {
                                for (let col = 1; col <= getColsByRow(row, props.game.boardSize); col++) {
                                    const { x, y } = getXyCoordsByRowCol({ row: row, col: col });
                                    const hexyStyle = getHexyStyleByPoint(props, { x: col, y: row });

                                    result.push(
                                        <g
                                            className={classNames("atlasHexy", { handCursor: hexyStyle.preview })}
                                            onMouseEnter={() => props.onBoardHexyMouseEnter({ x: col, y: row })}
                                            onClick={() => hexyStyle.preview && props.onPreviewedBoardHexyClick({ x: col, y: row })}
                                            transform={`translate(${x}, ${y}) rotate(90, 45, 45)`}
                                            key={`${col}_${row}`}
                                        >
                                            <path
                                                d="m0.5,50l21.2,-42.3l56.5,0l21.2,42.41l-21.2,42.4-56.5,0l-21.2,-42.35z"
                                                stroke="#333"
                                                fill={hexyStyle.hex.fill}
                                                strokeWidth={hexyStyle.hex.strokeWidth}
                                            />
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
                                        const { x, y } = getXyCoordsByRowCol({ row: hexy.y, col: hexy.x });
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
            </main>
            <FooterConnected />
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

export function isPointSpecialCorner(point: Point): boolean {
    return SPECIAL_CORNERS.some(specialCorner => specialCorner.x === point.x && specialCorner.y === point.y);
}

export function selectIsPointCoveredWithHexy(state: DeepPick<GenialUiState, "game", "hexyPairs">, point: Point): boolean {
    return state.game.hexyPairs.some(hexyPair => {
        return hexyPair.some(hexy => hexy.x === point.x && hexy.y === point.y);
    });
}

// => hover
//     => unhover
//     => click
//         => cancel
//         => click
//            => confirm
//            => cancel
export type SelectIsPointAllowedToReceiveHoverState = FirstParam<[typeof selectFirstPlacedHexy]> & FirstParam<typeof selectPlayerSelectedHexyPair>
    & FirstParam<typeof selectIsPointCoveredWithHexy> & FirstParam<typeof selectPlayerSelectedHexyPairHexyColor>
    & { game: Pick<Game, "hexyPairs" | "boardSize"> };

export function selectIsPointAllowedToReceiveHover(state: SelectIsPointAllowedToReceiveHoverState, point: Point): boolean {
    const firstPlacedHexy = selectFirstPlacedHexy(state);
    const pointIsSpecialCorner = isPointSpecialCorner(point);
    const playerSelectedHexyPair = selectPlayerSelectedHexyPair(state);

    if (!playerSelectedHexyPair || selectIsPointCoveredWithHexy(state, point)) {
        return false;
    }

    if (firstPlacedHexy !== undefined) {
        return isNeighborOf(firstPlacedHexy, state.game, point)
            && (
                !pointIsSpecialCorner
                || (pointIsSpecialCorner && getSpecialCornerColorByPoint(point) === selectPlayerSelectedHexyPairHexyColor(state))
            );
    }

    const neighboringPoints = getNeighboringHexysOf(point, state.game).filter(hexyOrPoint => !selectIsPointCoveredWithHexy(state, hexyOrPoint));

    if (neighboringPoints.length === 1 && isPointSpecialCorner(neighboringPoints[0])) {
        const isZerothSelected = playerSelectedHexyPair[0].selected;
        const cornerColor = getSpecialCornerColorByPoint(neighboringPoints[0]);
        const selectedHexySiblingColor = playerSelectedHexyPair[isZerothSelected ? 1 : 0].color;

        return selectedHexySiblingColor === cornerColor;
    }

    return true;
}

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

export const GenialUiConnected = connect<any, any, any, any>(
    (state) => ({ game: state.game }),
    {
        onBoardHexyMouseEnter: onBoardHexyMouseEnter,
        onPreviewedBoardHexyClick: onPreviewedBoardHexyClick,
    },
)(GenialUi);

export type OnPreviewedBoardHexyClickState = GenialUiState;

export function selectPlayerSelectedHexyPair(state: DeepPick<GenialUiState, "game", "player", "hexyPairs">): PlayerHexyPair | undefined {
    return state.game.player.hexyPairs.find(hexyPair => hexyPair?.some(hexy => hexy.selected));
}

export function selectPlayerSelectedHexyPairHexyColor(state: DeepPick<GenialUiState, "game", "player", "hexyPairs">): Color | undefined {
    return state.game.player.hexyPairs.reduce((memo: Color | undefined, hexyPair) => {
        if (memo || !hexyPair) {
            return memo;
        }

        const selectedHexyColor = hexyPair.find(hexy => hexy.selected)?.color;

        if (selectedHexyColor) {
            return selectedHexyColor;
        }

        return memo;
    }, undefined);
}

export function onPreviewedBoardHexyClick(point: Point): Thunk<OnPreviewedBoardHexyClickState> {
    return (dispatch, getState) => {
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
                const color = selectPlayerSelectedHexyPairHexyColor(state);
                console.log("cooor", color);
                state.game.hexyPairs.push(createBoardHexyPair(
                    state.game.player.firstPlacedHexy,
                    createHexy(point.x, point.y, selectPlayerSelectedHexyPairHexyColor(state)!)
                ));
                state.game.player.hexyPairs.splice(state.game.player.hexyPairs.indexOf(playerSelectedHexyPair), 1, undefined);
                state.game.player.firstPlacedHexy = undefined;
                state.game.player.hexyPairs.forEach(hexyPair => {
                    if (hexyPair) {
                        hexyPair.forEach(hexy => hexy.selected = false);
                    }
                })
            }
        })));
    };
}
