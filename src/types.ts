import { SET_GENIAL_UI_STATE } from "./consts";

export type PermanentAny = any;

export interface BoardHexy {
    x: number;
    y: number;
    color: Color;
}

export interface PlayerHexy {
    color: Color;
    selected: boolean;
}

export type Color = "red" | "yellow" | "orange" | "blue" | "green" | "violet";

export type BoardSize = 6 | 7 | 8;

type ProgressValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

export type PlayerHexyPairIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface Player {
    name: string;
    hoveredHexyCoords: Point | undefined;
    hexyPairs: PlayerHexyPairs;
    firstPlacedHexy: BoardHexy | undefined;
    turn: boolean;
    progress: Record<Color, ProgressValue>
}

export interface Point {
    x: number;
    y: number;
}

export interface Rect extends Point {
    width: number;
    height: number;
}

export type UnixTimestamp = number;

export type Uuid4 = string;

export type MenuOption = "resume" | "pause" | "saveReplay" | "loadReplay" | "quitGame" | "newGame";

export type GameStatus = "mainMenu" | "loading" | "inProgress";

export type GameType = "singlePlayer" | "multiPlayer" | "replay";

export type BoardHexyPair = [BoardHexy, BoardHexy];

export type PlayerHexyPair = [PlayerHexy, PlayerHexy];

export type BoardHexyPairs = BoardHexyPair[];

export type PlayerHexyPairs = [
    PlayerHexyPair | undefined,
    PlayerHexyPair | undefined,
    PlayerHexyPair | undefined,
    PlayerHexyPair | undefined,
    PlayerHexyPair | undefined,
    PlayerHexyPair | undefined,
];

export interface Game {
    hexyPairs: BoardHexyPairs;
    player: Player;
    alliesAndOpponents: Player[];
    boardSize: BoardSize;
    startTime: UnixTimestamp;
    // history: Action[];
    menu: {
        open: boolean;
        entries: MenuOption[];
        selectedEntryIndex: number;
    },
    type: GameType;
    status: GameStatus;
}

export type HexColor = string;

export enum Sound {
    Place = "place",
}

export enum LogLevel {
    Verbose = 4,
    Info = 3,
    Warn = 2,
    Error = 1,
    Exclusive = 0,
}

export interface GenialUiState {
    game: Game;
}

export interface ThunkExtraArguments {}

export type Dispatch<S = GenialUiState, E = ThunkExtraArguments> = (
    action: { type: typeof SET_GENIAL_UI_STATE; payload: GenialUiState; } | Thunk<S, E>
) => void;

export type Thunk<S = GenialUiState, E = ThunkExtraArguments> = (
    dispatch: Dispatch<S, E>,
    getState: () => S,
    extraArguments: E,
) => void;

type DeepPick3<A, B extends keyof A, C extends keyof A[B]> = { [BK in B]: Pick<A[B], C> };

type DeepPick4<A, B extends keyof A, C extends keyof A[B], D extends keyof A[B][C]> = {
    [BK in B]: {
        [CK in C]: Pick<A[B][C], D>;
    };
};

type DeepPick5<
    A,
    B extends keyof A,
    C extends keyof A[B],
    D extends keyof A[B][C],
    E extends keyof A[B][C][D],
> = {
    [BK in B]: {
        [CK in C]: {
            [DK in D]: Pick<A[B][C][D], E>;
        }
    };
};

export type DeepPick<A, B extends keyof A, C extends keyof A[B], D = {}, E = {}> =
    D extends keyof A[B][C]
        ? E extends keyof A[B][C][D]
            ? DeepPick5<A, B, C, D, E>
            : DeepPick4<A, B, C, D>
        : DeepPick3<A, B, C>;

type Fn = (...params: any) => any;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

export type FirstParam<G> = G extends Fn[]
    ? UnionToIntersection<G[number] extends (...args: infer P) => any
        ? P[0]
        : never>
    : G extends (...args: infer P) => any
        ? P[0]
        : never;
