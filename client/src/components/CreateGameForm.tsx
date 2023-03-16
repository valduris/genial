import * as React from "react";
import { connect } from "react-redux";
import * as immer from "immer";

import { RadioSelect } from "./RadioSelect";
import { translate } from "../utils";
import { Game, GameStatus, GenialLobby, Thunk, Uuid4 } from "../types";
import { GamePostParams } from "../types/server";

import "./CreateGameForm.css";
import { setGenialState } from "../index";
import { selectPlayerUuid } from "../selectors";

export interface CreateGameFormOwnProps {
    visible: boolean;
}

export type CreateGameFormFormState = Pick<GamePostParams, "boardSize" | "playerCount" | "public" | "showProgress" | "name">;

export interface CreateGameFormDispatchProps {
    onSubmit: (data: CreateGameFormFormState) => void;
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
        playerCount: 3,
        public: true,
        showProgress: true,
        name: undefined,
    });

    const setValueInFormState = React.useCallback((value: Partial<Omit<GamePostParams, "authorId">>) => {
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

export function onCreateGameFormSubmit(data: CreateGameFormFormState): Thunk<GenialLobby> {
    return async (dispatch, getState, { fetchJson }) => {
        const playerUuid = selectPlayerUuid(getState());
        const body: GamePostParams = { ...data, adminUuid: playerUuid };
        const result = await fetchJson("http://localhost:3300/api/game", { body: JSON.stringify(body) });
        console.log(result);
        dispatch(setGenialState(immer.produce(getState(), state => {
            state.game = {
                ...result,
                finished: false,
                status: GameStatus.Lobby,
            };
        })));
        console.log("onCreateGameFormSubmit", getState());
    };
}