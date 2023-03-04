import * as classNames from "classnames";
import * as React from "react";

import "./RadioSelect.css";

export interface RadioSelectProps<T> {
    values: T[];
    onClick: (value: T) => void;
    selectedValue: T;
}

export const RadioSelect = <T,>(props: RadioSelectProps<T>): React.ReactElement => {
    return (
        <div className={"radio-select"}>
            {props.values.map(value => {
                return (
                    <div
                        key={`${value}`}
                        className={classNames("radio-value", { selected: props.selectedValue === value })}
                        onClick={() => props.onClick(value)}
                    >
                        {value as string}
                    </div>
                );
            })}
        </div>
    );
}