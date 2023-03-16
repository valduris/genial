import { connect } from "react-redux";
import * as immer from "immer";
import * as classNames from "classnames";
import * as React from "react";

import { translate } from "../utils";
import { GameStatus, GenialLobby, Thunk } from "../types";
import { GamePostParams } from "../types/server";

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
        <>
            <div className="field is-horizontal">
                <div className="field-label is-normal">
                    <label
                        className="label"
                        onClick={() => setFormState({
                            ...formState,
                            playerCount: getNextElementFromArray([2, 3, 4], formState.playerCount),
                        })}
                    >
                        {translate("playerCount")}
                    </label>
                </div>
                <div className="field-body">
                    <div className="buttons has-addons">
                        {[2, 3, 4].map(n => {
                            return (
                                <button
                                    key={n}
                                    className={classNames("button", {
                                        "is-info": formState.playerCount === n,
                                        "is-selected": formState.playerCount === n,
                                    })}
                                    onClick={() => setValueInFormState({ playerCount: n })
                                }>
                                    {n}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
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
                                    onClick={() => setValueInFormState({ boardSize: n })}
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
                        onClick={() => setValueInFormState({ public: !formState.public })}
                    >
                        {translate("public")}
                    </label>
                </div>
                <div className="field-body">
                    <div className="field is-narrow">
                        <div className="control">
                            <label className="radio">
                                <input
                                    type="checkbox"
                                    checked={formState.public}
                                    onChange={() => setValueInFormState({ public: !formState.public })}
                                />
                            </label>
                        </div>
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
                            <input className="input" type="text" />
                        </div>
                    </div>
                </div>
            </div>
            <div className="field is-horizontal">
                <div className="field-label is-normal" />
                <div className="field-body">
                    <button
                        className="button is-link"
                        onClick={() => props.onSubmit(formState)}
                        value={formState.name}
                    >
                        {translate("createGame")}
                    </button>
                </div>
            </div>
        </>
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