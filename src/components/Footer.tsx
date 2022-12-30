import * as React from "react";
import { connect } from "react-redux";
import * as classNames from "classnames";
import { Color, Game, GenialUiState, Player, PlayerHexyPairIndex } from "../types";
import { onPlayerHexyPairClick } from "../GenialUi";
import { HexyComponent } from "./Hexy";

export interface FooterStateProps {
    game: Game;
}

export interface FooterDispatchProps {
    onPlayerHexyPairClick: typeof onPlayerHexyPairClick;
}

export type FooterProps = FooterDispatchProps & FooterStateProps;

export function Footer(props: FooterProps) {
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
                        )
                    })}
                </svg>
            </div>
        </div>
    )
}

export const FooterConnected = connect<any, any, any, any>(
    (state: GenialUiState) => ({ game: state.game }),
    { onPlayerHexyPairClick: onPlayerHexyPairClick },
)(Footer);