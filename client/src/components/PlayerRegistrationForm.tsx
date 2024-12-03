import { Button, Fieldset, Grid, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import * as React from "react";
import { connect } from "react-redux";
import { Thunk } from "../types";
import { fetchJson } from "../api";
import { handleFetchResult } from "../utils";

export interface PlayerRegistrationFormProps {
    onSubmit: (params: OnSubmitParams) => void;
}

export function PlayerRegistrationForm(props: PlayerRegistrationFormProps) {
    const form = useForm({
        mode: "uncontrolled",
        initialValues: {
            name: "",
            email: "",
            password: "",
        },
    });
    return (
        <Grid>
            <Grid.Col span={5}>
                <Fieldset legend="Registration form">
                    <TextInput
                        label="Name"
                        placeholder="Name"
                        key={form.key("name")}
                        {...form.getInputProps("name")}
                    />
                    <TextInput
                        label="Email"
                        placeholder="Email"
                        key={form.key("email")}
                        {...form.getInputProps("email")}
                    />
                    <TextInput
                        label="Password"
                        placeholder="Password"
                        key={form.key("password")}
                        type="password"
                        {...form.getInputProps("password")}
                    />
                    <Button onClick={() => props.onSubmit(form.getValues())} mt="md">Register</Button>
                </Fieldset>
                {/*<Button.Group>*/}
                {/*    <Button variant="default">First</Button>*/}
                {/*    <Button variant="default">Second</Button>*/}
                {/*    <Button variant="default">Third</Button>*/}
                {/*</Button.Group>*/}
            </Grid.Col>
            <Grid.Col span={7}>
            </Grid.Col>
        </Grid>
    );
}

export interface OnSubmitParams {
    name: string;
    email: string;
    password: string;
}

export function onPlayerRegistrationFormSubmit(values: OnSubmitParams): Thunk {
    return async (dispatch, getState) => {
        dispatch(handleFetchResult(
            await fetchJson("http://localhost:8080/api/player/register", { body: JSON.stringify(values) })
        ));
    }
}

export const PlayerRegistrationFormConnected = connect(() => ({}), { onSubmit: onPlayerRegistrationFormSubmit })(PlayerRegistrationForm);