import * as React from "react";
import { connect } from "react-redux";
import * as classNames from "classnames";
import { DeepPick, Game, GenialInProgress } from "../types";
import { mapTimes } from "../utils";
import { onPlayerHexyPairClick } from "../GenialUi";
import { COLORS } from "../consts";

export interface ProgressStateProps {
    game: DeepPick<Game, "player", "progress">;
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
                                const empty = i >= props.game.player.progress[color];
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

// MapStateToPropsParam<GenialInProgressProps, GenialUiOwnProps, any>
export const ProgressConnected = connect<any, any, any, any>(
    (state: GenialInProgress) => ({ game: state }),
    { onPlayerHexyPairClick: onPlayerHexyPairClick },
)(Progress);