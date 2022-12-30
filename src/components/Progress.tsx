import * as React from "react";
import { connect } from "react-redux";
import * as classNames from "classnames";
import { Game, GenialUiState } from "../types";
import { COLORS, mapTimes } from "../utils";
import { onPlayerHexyPairClick } from "../GenialUi";

export interface ProgressStateProps {
    game: Game;
}

export type ProgressProps = ProgressStateProps;

export function Progress(props: ProgressProps) {
    return (
        <div className={"progress"}>
            <div className={"rows"}>
                {COLORS.map((color, index) => {
                    return (
                        <div className={"row"} key={color}>
                            <div className={"cell preview"} style={{ background: color }} />
                            {mapTimes(18, (i) => {
                                const empty = i > props.game.player.progress[color];
                                return (
                                    <div
                                        key={i}
                                        className={classNames("cell", { empty: empty })}
                                        style={{ background: color }}
                                    >
                                        {i + 1 > props.game.player.progress[color] && (
                                            <span className={classNames("number", {
                                                bold: i === props.game.player.progress[color],
                                            })}>
                                                {i + 1}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// MapStateToPropsParam<GenialUiStateProps, GenialUiOwnProps, any>
export const ProgressConnected = connect<any, any, any, any>(
    (state: GenialUiState) => ({ game: state.game }),
    { onPlayerHexyPairClick: onPlayerHexyPairClick },
)(Progress);