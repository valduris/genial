import * as React from "react";
import { connect } from "react-redux";
import classNames from "classnames";
import {Genial, LocalPlayer, PlayerHexyPairIndex} from "../types";
import { onPlayerHexyPairClick } from "../GenialUi";
import { HexyComponent } from "./Hexy";

export interface PlayerHexyPairListStateProps {
    player: LocalPlayer;
}

export interface PlayerHexyPairListDispatchProps {
    onPlayerHexyPairClick: (...parameters: Parameters<typeof onPlayerHexyPairClick>) => void;
}

export type PlayerHexyPairListProps = PlayerHexyPairListDispatchProps & PlayerHexyPairListStateProps;

export function PlayerHexyPairList(props: PlayerHexyPairListProps) {
    return (
        <div className={"footer"}>
            <div className={"selectableHexyList"}>
                <svg width="550" height="200" xmlns="http://www.w3.org/2000/svg">
                    {props.player.hexyPairs.map((hexyPair, index) => {
                        if (!hexyPair) {
                            return null;
                        }

                        return (
                            <g
                                className={classNames("playerHexyPair", { selected: hexyPair.some(hexy => hexy.selected) })}
                                key={index}
                            >
                                <HexyComponent
                                    onClick={props.onPlayerHexyPairClick.bind(null, index as PlayerHexyPairIndex, 0)}
                                    color={hexyPair[0].color}
                                    cx={index * 90}
                                    cy={0}
                                />
                                <HexyComponent
                                    onClick={props.onPlayerHexyPairClick.bind(null, index as PlayerHexyPairIndex, 1)}
                                    color={hexyPair[1].color}
                                    cx={index * 90}
                                    cy={90}
                                />
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    )
}

export const PlayerHexyPairListConnected = connect(
    (state: Genial) => ({ player: state.player }),
    { onPlayerHexyPairClick: onPlayerHexyPairClick },
)(PlayerHexyPairList);