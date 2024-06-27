import { connect } from "react-redux";
import * as immer from "immer";
import classNames from "classnames";
import * as React from "react";

import { translate } from "../utils";
import { BoardSize, Game, GameStatus, Genial, PlayerCount, Thunk } from "../types";

import { setGenialState } from "../index";
import { selectPlayerUuid } from "../selectors";

export interface CreateGameFormOwnProps {
    visible: boolean;
}

export interface CreateGameFormFormState {
    board_size: Game["boardSize"];
    player_count: Game["playerCount"];
    public: Game["public"];
    show_progress: Game["showProgress"];
    name: Game["name"];
}

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
        board_size: 6,
        player_count: 3,
        public: true,
        show_progress: true,
        name: "",
    });

    const setValueInFormState = React.useCallback((value: Partial<CreateGameFormFormState>) => {
        setFormState(prevState => ({ ...prevState, ...value }));
    }, [setFormState]);

    return (
        <div className={"createGameContainer"}>
            <h1>{translate("createGame")}</h1>
            <div className="field is-horizontal">
                <div className="field-label is-normal">
                    <label
                        className="label"
                        onClick={() => setFormState({
                            ...formState,
                            player_count: getNextElementFromArray([2, 3, 4], formState.player_count),
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
                                        "is-info": formState.player_count === n,
                                        "is-selected": formState.player_count === n,
                                    })}
                                    onClick={() => setValueInFormState({ player_count: n as PlayerCount })
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
                            board_size: getNextElementFromArray([6, 7, 8], formState.board_size),
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
                                        "is-info": formState.board_size === n,
                                        "is-selected": formState.board_size === n,
                                    })}
                                    onClick={() => setValueInFormState({ board_size: n as BoardSize })}
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
                        onClick={() => setValueInFormState({ show_progress: !formState.show_progress })}
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
                                    checked={formState.show_progress}
                                    onChange={() => setValueInFormState({ show_progress: !formState.show_progress })}
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
                            <input
                                data-role={"create_game_name"}
                                className="input"
                                type="text"
                                value={formState.name}
                                onChange={(event) => setValueInFormState({ name: event.target.value })}
                            />
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
                        onClick={() => props.onSubmit(formState)}
                    >
                        {translate("createGame")}
                    </button>
                </div>
            </div>
        </div>
    );
}

export const CreateGameFormConnected = connect<any, any, any, any>(undefined, { onSubmit: onCreateGameFormSubmit })(CreateGameForm);

export function onCreateGameFormSubmit(data: CreateGameFormFormState): Thunk<Genial> {
    return async (dispatch, getState, { fetchJson }) => {
        const playerUuid = selectPlayerUuid(getState());
        const body: any = { ...data, admin_uuid: playerUuid };
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
        console.log("onCreateGameFormSubmit", getState());
    };
}