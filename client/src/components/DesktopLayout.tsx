import * as React from "react";
import { connect } from "react-redux";

export interface DesktopLayoutProps {
    children: React.ReactNode;
}

export function DesktopLayout(props: DesktopLayoutProps) {
    return (
        <div className={"desktop-wrapper"}>
            {props.children}
            <div className={"desktop-aside"}>

            </div>
        </div>
    );
}

export const DesktopLayooutConnected = connect()(DesktopLayout);