import { connect } from "react-redux";
import * as immer from "immer";
import * as React from "react";
import { useForm } from "@mantine/form";
import { Button, Fieldset, TextInput, InputWrapper, Checkbox, Container } from "@mantine/core";

import { translate } from "../utils";
import { BoardSize, Game, Genial, PlayerCount, Thunk } from "../types";
import { setGenialState } from "../index";
import { selectCurrentGameUuid, selectPlayerUuid } from "../selectors";

export interface CreateGameFormFormState {
    boardSize: Game["boardSize"];
    playerCount: Game["playerCount"];
    showProgress: Game["showProgress"];
    name: Game["name"];
}

export interface CreateGameFormDispatchProps {
    onSubmit: (data: CreateGameFormFormState) => void;
}

export interface CreateGameFromStateProps {
    hidden: boolean;
}

export type CreateGameFormProps = CreateGameFromStateProps & CreateGameFormDispatchProps;

export function CreateGameForm(props: CreateGameFormProps) {
    const form = useForm({
        mode: "uncontrolled",
        initialValues: {
            name: "",
            boardSize: 6 as BoardSize,
            playerCount: 2 as PlayerCount,
            showProgress: true,
        },
    });

    if (props.hidden) {
        return null;
    }

    return (
        <Container>
            <Fieldset legend={translate("createGame")}>
                <TextInput
                    label={translate("gameName")}
                    key={form.key("name")}
                    {...form.getInputProps("name")}
                    data-role="create_game_name"
                />
                <InputWrapper label={translate("boardSize")}>
                    <Button.Group>
                        {[6, 7, 8].map(n => {
                            return (
                                <Button
                                    key={`board_size_${n}`}
                                    variant={form.getValues().boardSize === n ? "light" : "outline"}
                                    onClick={() => form.setFieldValue("boardSize", n as BoardSize)}
                                >
                                    {n}
                                </Button>
                            );
                        })}
                    </Button.Group>
                </InputWrapper>
                <InputWrapper label={translate("playerCount")}>
                    <Button.Group>
                        {[2, 3, 4].map(n => {
                            return (
                                <Button
                                    key={`player_count_${n}`}
                                    variant={form.getValues().playerCount === n ? "light" : "outline"}
                                    onClick={() => form.setFieldValue("playerCount", n as PlayerCount)}
                                >
                                    {n}
                                </Button>
                            );
                        })}
                    </Button.Group>
                </InputWrapper>
                <InputWrapper
                    label={translate("showProgress")}
                    description={translate("showProgressDescription")}
                >
                    <Checkbox defaultChecked onChange={(e) => {}}/>
                </InputWrapper>
                <Button
                    onClick={() => props.onSubmit(form.getValues())}
                    mt="md"
                    data-role="create_game_submit"
                >
                    {translate("createGame")}
                </Button>
            </Fieldset>
        </Container>
    );
}

export const CreateGameFormConnected = connect(
    (state: Genial) => ({ hidden: !!selectCurrentGameUuid(state) }),
    { onSubmit: onCreateGameFormSubmit },
)(CreateGameForm);

export function onCreateGameFormSubmit(data: CreateGameFormFormState): Thunk<Genial> {
    return async (dispatch, getState, { fetchJson }) => {
        const playerUuid = selectPlayerUuid(getState());
        const body: any = { ...data, playerUuid: playerUuid };
        const result = await fetchJson("http://localhost:8080/api/game", { body: JSON.stringify(body) });

        dispatch(setGenialState(immer.produce(getState(), state => {
            state.lobbyGames[result.data.uuid] = {
                ...result.data,
                adminUuid: state.player.uuid,
                // players: [{
                //     id: state.playerId,
                //     name: state.playerName,
                //     ready: false,
                // }],
            };
        })));
    };
}