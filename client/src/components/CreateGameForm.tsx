import * as React from "react";
import { connect } from "react-redux";

import { RadioSelect } from "./RadioSelect";
import { translate } from "../utils";
import { Game, Thunk } from "../types";
import { CreateGameParams } from "../api";

import "./CreateGameForm.css";

export interface CreateGameFormOwnProps {
    visible: boolean;
}

export interface CreateGameFormDispatchProps {
    onSubmit: (data: Omit<CreateGameParams, "authorId">) => void;
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
    const [formState, setFormState] = React.useState<Omit<CreateGameParams, "authorId">>({
        boardSize: 6,
        playerCount: 3,
        public: true,
        showProgress: true,
        name: undefined,
    });

    const setValueInFormState = React.useCallback((value: Partial<Omit<CreateGameParams, "authorId">>) => {
        setFormState(prevState => ({ ...prevState, ...value }));
    }, [setFormState]);

    return (
        <div className={"create-game-form"}>
            <h1 className={"title"}>Create new game</h1>
            <div className={"form-row"}>
                <span
                    onClick={() => setFormState({
                        ...formState,
                        boardSize: getNextElementFromArray([6, 7, 8], formState.boardSize),
                    })}
                >
                    {translate("boardSize")}
                </span>
                <RadioSelect<Game["boardSize"]>
                    values={[6, 7, 8]}
                    onClick={(value) => setValueInFormState({ boardSize: value })}
                    selectedValue={formState.boardSize}
                />
            </div>
            <div className={"form-row"}>
                <span
                    onClick={() => setFormState({
                        ...formState,
                        playerCount: getNextElementFromArray([2, 3, 4], formState.playerCount),
                    })}
                >
                    {translate("playerCount")}
                </span>
                <RadioSelect<2 | 3 | 4>
                    values={[2, 3, 4]}
                    onClick={(value) => setValueInFormState({ playerCount: value })}
                    selectedValue={formState.playerCount}
                />
            </div>
            <div className={"form-row"}>
                <label htmlFor={"createGameFormPublic"}>{translate("public")}</label>
                <input
                    id={"createGameFormPublic"}
                    type={"checkbox"}
                    checked={formState.public}
                    onChange={event => setValueInFormState({ public: event?.target.checked })}
                />
            </div>
            <div className={"form-row"}>
                <label htmlFor={"createGameFormShowProgress"}>{translate("showProgress")}</label>
                <input
                    id={"createGameFormShowProgress"}
                    type={"checkbox"}
                    checked={formState.showProgress}
                    onChange={event => setValueInFormState({ showProgress: event?.target.checked })}
                />
            </div>
            <div className={"form-row"}>
                <label htmlFor={"createGameFormName"}>{translate("gameName")}</label>
                <input
                    id={"createGameFormName"}
                    type={"text"}
                    onChange={event => setValueInFormState({ name: event?.target.value })}
                />
            </div>
            <input
                className="submit"
                type="button"
                onClick={() => props.onSubmit(formState)}
                value={translate("createGame")}
            />
        </div>
    );
}

export const CreateGameFormConnected = connect<any, any, any, any>(undefined, { onSubmit: onCreateGameFormSubmit })(CreateGameForm);

export function onCreateGameFormSubmit(data: CreateGameParams): Thunk {
    return async (dispatch, getState, { Api }) => {
        const result = await Api.createGame({
            ...data,
            playerUuid: "7a118f32-c183-49d0-b06b-6353148fc162",
            authorId: 1,
            name: "customName",
        });
        console.log(result);
    };
}