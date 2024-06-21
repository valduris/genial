import { connect } from "react-redux";
import * as immer from "immer";
import classNames from "classnames";
import * as React from "react";
import { TextInput, Button, Group, Grid, Checkbox, Input, Fieldset } from '@mantine/core';

import { translate } from "../utils";
import { BoardSize, Game, GameStatus, Genial, PlayerCount, Thunk } from "../types";

import { setGenialState } from "../index";
import { selectPlayerUuid } from "../selectors";

export interface CreateGameFormOwnProps {
    visible: boolean;
    name: string;
}

export type CreateGameFormFormState = Pick<Game, "boardSize" | "public" | "showProgress">;

export interface CreateGameFormDispatchProps {
    onStart: () => void;
}

export type CreateGameFormProps = CreateGameFormOwnProps & CreateGameFormDispatchProps;

/**
 * it wraps
 */
export function getNextElementFromArray<T>(array: T[], current: T): T {
    const currentIndex = array.indexOf(current);
    const index = (currentIndex + 1) === array.length ? 0 : currentIndex + 1;
    return array[index];
}

export function CreateGameForm(props: CreateGameFormProps) {
    const [formState, setFormState] = React.useState<CreateGameFormFormState>({
        boardSize: 6,
        public: true,
        showProgress: true,
    });

    const setValueInFormState = React.useCallback((value: Partial<CreateGameFormFormState>) => {
        setFormState(prevState => ({ ...prevState, ...value }));
    }, [setFormState]);

    return (        <div className={"gameStartContainer"}>
        <Grid>
            <Grid.Col span={5}>
                <Checkbox
                    defaultChecked
                    label="I agree to sell my privacy"
                />
                <Fieldset legend="Personal information">
                    <TextInput label="Your name" placeholder="Your name" />
                    <TextInput label="Email" placeholder="Email" mt="md" />
                </Fieldset>
                <Button.Group>
                    <Button variant="default">First</Button>
                    <Button variant="default">Second</Button>
                    <Button variant="default">Third</Button>
                </Button.Group>
            </Grid.Col>
            <Grid.Col span={7}>
            </Grid.Col>
        </Grid>


            <h1>{translate("gameStart")}</h1>
            <div className="field is-horizontal">
                <div className="field-label is-normal">
                    <label
                        className="label"
                        onClick={() => setFormState({
                            ...formState,
                            boardSize: getNextElementFromArray([6, 7, 8], formState.boardSize),
                        })}
                    >
                        {translate("boardSize")}
                    </label>
                </div>
                <div className="field-body">
                    <div className="buttons has-addons">
                        {[6, 7, 8].map(n => {
                            return (
                                <button
                                    key={n}
                                    className={classNames("button", {
                                        "is-info": formState.boardSize === n,
                                        "is-selected": formState.boardSize === n,
                                    })}
                                    onClick={() => setValueInFormState({ boardSize: n as BoardSize })}
                                >
                                    {n}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
            <div className="field is-horizontal">
                <div className="field-label">
                    <label
                        className="label"
                        onClick={() => setValueInFormState({ showProgress: !formState.showProgress })}
                    >
                        {translate("showProgress")}
                    </label>
                </div>
                <div className="field-body">
                    <div className="field is-narrow">
                        <div className="control">
                            <label className="radio">
                                <input
                                    type="checkbox"
                                    checked={formState.showProgress}
                                    onChange={() => setValueInFormState({ showProgress: !formState.showProgress })}
                                />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
            <div className="field is-horizontal">
                <div className="field-label is-normal">
                    <label className="label">{translate("gameName")}</label>
                </div>
                <div className="field-body">
                    <div className="field">
                        <div className="control">
                            <input data-role={"create_game_name"} className="input" type="text" value={props.name} readOnly={true} />
                        </div>
                    </div>
                </div>
            </div>
            <div className="field is-horizontal">
                <div className="field-label is-normal" />
                <div className="field-body">
                    <button
                        data-role={"create_game_submit"}
                        className="button is-link"
                        onClick={props.onStart}
                    >
                        {translate("gameStart")}
                    </button>
                </div>
            </div>
            <div></div>
        </div>
    );
}

export const GameStartFormConnected = connect<any, any, any, any>(undefined, { onStart: onGameStart })(CreateGameForm);

export function onGameStart(data: CreateGameFormFormState): Thunk {
    return async (dispatch, getState, { fetchJson }) => {
        const playerUuid = selectPlayerUuid(getState());
        const body: any = { ...data, adminUuid: playerUuid };
        const result = await fetchJson("http://localhost:8080/api/game", { body: JSON.stringify(body) });
        console.log(result);
        dispatch(setGenialState(immer.produce(getState(), state => {
            state.game = {
                ...result,
                finished: false,
                status: GameStatus.Lobby,
            };
            state.gameUuid = result.data.uuid;
        })));
        console.log("onGameStart", getState());
    };
}