import * as React from "react";
import { connect } from "react-redux";
import classNames from "classnames";
import { Genial, Progress } from "../types";
import { colorToString, mapTimes } from "../utils";
import { COLORS } from "../consts";

export interface ProgressStateProps {
    progress: Progress;
}

export type ProgressProps = ProgressStateProps;

export function ProgressBars(props: ProgressProps) {
    return (
        <div className={"progress"}>
            <div className={"rows"}>
                {COLORS.map((colorCode, index) => {
                    const color = colorToString(colorCode);
                    return (
                        <div className={"row"} key={color}>
                            <div className={"cell preview"} style={{ background: color }} />
                            {mapTimes(18, (i) => {
                                const empty = i >= props.progress[colorCode];
                                return (
                                    <div
                                        key={i}
                                        className={classNames("cell", { empty: empty })}
                                        style={{ background: color }}
                                    >
                                        {i + 1 > props.progress[colorCode] && (
                                            <span className={classNames("number", {
                                                bold: i === props.progress[colorCode],
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

// MapStateToPropsParam<GenialProps, GenialUiOwnProps, any>
export const ProgressBarsConnected = connect(
    (state: Genial) => ({ progress: state.player.progress }),
)(ProgressBars);