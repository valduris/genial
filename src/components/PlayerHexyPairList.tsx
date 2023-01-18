import * as React from "react";
import { connect } from "react-redux";
import * as classNames from "classnames";
import { Game, GenialUiState, Player, PlayerHexyPairIndex } from "../types";
import { onPlayerHexyPairClick } from "../GenialUi";
import { HexyComponent } from "./Hexy";

export interface PlayerHexyPairListStateProps {
    game: Game;
}

export interface PlayerHexyPairListDispatchProps {
    onPlayerHexyPairClick: typeof onPlayerHexyPairClick;
}

export type PlayerHexyPairListProps = PlayerHexyPairListDispatchProps & PlayerHexyPairListStateProps;

export function PlayerHexyPairList(props: PlayerHexyPairListProps) {
    return (
        <div className={"footer"}>
            <div className={"selectableHexyList"}>
                <svg width="550" height="200" xmlns="http://www.w3.org/2000/svg">
                    {(props.game.player as Player).hexyPairs.map((hexyPair, index) => {
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

export const PlayerHexyPairListConnected = connect<any, any, any, any>(
    (state: GenialUiState) => ({ game: state.game }),
    { onPlayerHexyPairClick: onPlayerHexyPairClick },
)(PlayerHexyPairList);