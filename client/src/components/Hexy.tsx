import * as React from "react";

import { Color } from "../types";
import { colorToString } from "../utils";

export interface HexyComponentProps {
    color: Color;
    cx: number;
    cy: number;
    onClick?: () => void;
}

export function HexyComponent(props: HexyComponentProps) {
    return (
        <g
            className="hexy"
            transform={`translate(${props.cx}, ${props.cy})`}
            onClick={props.onClick}
        >
            <path transform="rotate(90, 45, 45)"
                d="m0.5,50l21.2,-42.3l56.5,0l21.2,42.41l-21.2,42.4-56.5,0l-21.2,-42.35z"
                stroke="#000"
                fill="#222"
                strokeWidth={3}
            />
            <ellipse
                ry="30"
                rx="30"
                stroke="#000"
                cx={40}
                cy={50}
                fill={colorToString(props.color)}
            />
        </g>
    );
}