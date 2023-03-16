import { SET_GENIAL_UI_STATE } from "./consts";
import { Api, fetchJson } from "./api";

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

export type ProgressValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

export type PlayerHexyPairIndex = 0 | 1 | 2 | 3 | 4 | 5;

export type Progress = Record<Color, ProgressValue>;

export type Direction = [-1, 0] | [0, -1] | [1, 0] | [-1, 1] | [0, 1] | [1, -1];

export interface Player {
    name: string;
    hoveredHexyCoords: Point | undefined;
    hexyPairs: PlayerHexyPairs;
    firstPlacedHexy: BoardHexy | undefined;
    movesInTurn: number;
    progress: Progress;
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

export type PlayerCount = 2 | 3 | 4;

export type MenuOption = "resume" | "pause" | "quitGame"; // "saveReplay" | "loadReplay"

export enum GameStatus {
    MainMenu = "mainMenu",
    InProgress = "inProgress",
    Lobby = "lobby",
}

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

export interface DrawableHexy {
    color: Color;
}

export type DrawableHexyPair = [DrawableHexy, DrawableHexy];

export type DrawableHexyPairs = DrawableHexyPair[];

export type SpecialCorners = [BoardHexy, BoardHexy, BoardHexy, BoardHexy, BoardHexy, BoardHexy];

export interface GenialInProgress extends GenialCommon {
    game: Game;
    player: Player;
}

export interface LobbyGame {
    uuid: Uuid4;
    players: [{
        name: string;
    }];
    name: string;
    boardSize: BoardSize;
    playerCount: 2 | 3 | 4;
}

export type LobbyGames = LobbyGame[];

export type GamesLoadingState = "noGames" | "loading" | "loaded";

export interface Game {
    authorId: number;
    boardSize: BoardSize;
    createdAt: "2023-01-18T09:42:39.417Z";
    finished: false;
    players: Array<{
        id: number;
        name: string;
    }>;
    name: string;
    playerCount: PlayerCount;
    public: boolean;
    showProgress: boolean;
    status: "Created";
    uuid: "eb6a6aa6-4cbe-459f-bee7-c78478a95c36"
}

export interface GenialLobby extends GenialCommon {
    games: LobbyGames;
    status: GameStatus.Lobby;
    loadingState: GamesLoadingState;
    game?: Game;
}

export enum EventSourceState {
    CONNECTING = 0,
    OPEN = 1,
    CLOSED = 2,
}

export interface GenialCommon {
    eventSourceState: EventSourceState;
    authenticated: boolean;
    playerUuid: Uuid4;
    menu: {
        open: boolean;
        entries: MenuOption[];
        selectedEntryIndex: number;
    },
}

export type Genial = GenialInProgress | GenialLobby;

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

export enum LocalStorageKey {
    PlayerUuid = "playerUuid",
}

export interface ThunkExtraArguments {
    Api: typeof Api;
    fetchJson: typeof fetchJson,
}

export type Dispatch<S = Genial, E = ThunkExtraArguments, R = void> = (
    action: { type: typeof SET_GENIAL_UI_STATE; payload: Genial; } | Thunk<S, E>
) => R;

export type Thunk<S = Genial, E = ThunkExtraArguments, R = void> = (
    dispatch: Dispatch<S, E, R>,
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
