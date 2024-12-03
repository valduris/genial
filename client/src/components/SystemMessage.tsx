import * as React from "react";
import { Alert } from "@mantine/core";
import { connect } from "react-redux";
import { Genial } from "../types";

export interface SystemMessageProps {
    message: Genial["error"];
}

export function SystemMessage(props: SystemMessageProps) {
    if (!props.message) {
        return null;
    }

    return (
        <Alert variant="light" color="cyan" radius="xs" withCloseButton title="System message:" >
            {props.message}
        </Alert>
    );
}

export const SystemMessageConnected = connect((state: Genial) => ({
    message: state.error,
}))(SystemMessage);