import * as React from "react";
import { connect } from "react-redux";

import { RadioSelect } from "./RadioSelect";
import { translate } from "../utils";
import { Game, Thunk } from "../types";

import "./CreateGameForm.css";

export interface CreateGameFormOwnProps {
    visible: boolean;
}

export interface CreateGameFormDispatchProps {
    onSubmit: (data: FormState) => void;
}

export type CreateGameFormProps = CreateGameFormOwnProps & CreateGameFormDispatchProps;

export interface FormState {
    boardSize: Game["boardSize"];
    playerCount: 2 | 3 | 4;
    public: boolean;
    showProgress: boolean;
    name?: string;
}

export function CreateGameForm(props: CreateGameFormProps) {
    const [formState, setFormState] = React.useState<FormState>({
        boardSize: 6,
        playerCount: 3,
        public: true,
        showProgress: true,
        name: undefined,
    });

    const setValueInFormState = React.useCallback((value: Partial<FormState>) => {
        setFormState(prevState => ({ ...prevState, ...value }));
    }, [setFormState]);

    return (
        <div className={"create-game-form"}>
            <h1 className={"title"}>Create new game</h1>
            <div className={"form-row"}>
                <span>{translate("boardSize")}</span>
                <RadioSelect<Game["boardSize"]>
                    values={[6, 7, 8]}
                    onClick={(value) => setValueInFormState({ boardSize: value })}
                    selectedValue={formState.boardSize}
                />
            </div>
            <div className={"form-row"}>
                <span>{translate("playerCount")}</span>
                <RadioSelect<2 | 3 | 4>
                    values={[2, 3, 4]}
                    onClick={(value) => setValueInFormState({ playerCount: value })}
                    selectedValue={formState.playerCount}
                />
            </div>
            {/*name*/}
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
                <label htmlFor={"createGameFormName"}>{translate("name")}</label>
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

export function onCreateGameFormSubmit(data: FormState): Thunk {
    return (dispatch, getState) => {
        console.log(data);
    };
}