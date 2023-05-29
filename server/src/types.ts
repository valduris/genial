export type PermanentAny = any;

export interface BoardHexy {
    x: number;
    y: number;
    color: Color;
}

export enum ServerSentEvent {
    GameStarted = "started",
    GameFinished = "finished",
    PlayerJoined = "playerJoined",
    PlayerLeft = "playerLeft",
    HexyPlaced = "hexyPlaced",
    Ping = "ping",
}

export type Color = "red" | "yellow" | "orange" | "blue" | "green" | "violet";

export type TemporaryAny = any;

export type BoardSize = 6 | 7 | 8;

export type ProgressValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18;

export type GameType = "singlePlayer" | "multiPlayer" | "replay";

export type BoardHexyPair = [BoardHexy, BoardHexy];

export type BoardHexyPairs = BoardHexyPair[];

export interface Hexy {
    color: Color;
}

export type HexyPair = [Hexy, Hexy];

export type HexyPairs = HexyPair[];

export type PlayerHexyPairs = [
    HexyPair | undefined,
    HexyPair | undefined,
    HexyPair | undefined,
    HexyPair | undefined,
    HexyPair | undefined,
    HexyPair | undefined,
];

export interface Player {
    name: string;
    hexyPairs: PlayerHexyPairs;
    movesInTurn: number;
    progress: Progress;
}

export interface Game {
    players: Player[];
    boardHexyPairs: BoardHexyPairs;
}

export type Direction = [-1, 0] | [0, -1] | [1, 0] | [-1, 1] | [0, 1] | [1, -1];

export type PlayerCount = 2 | 3 | 4;

export interface Game {
    authorId: number;
    boardSize: BoardSize;
    createdAt: string; // "2023-01-18T09:42:39.417Z";
    finished: false;
    players: Player[];
    name: string;
    playerCount: PlayerCount;
    public: boolean;
    showProgress: boolean;
    status: "Created";
    uuid: "eb6a6aa6-4cbe-459f-bee7-c78478a95c36"
}

export type SpecialCorners = [BoardHexy, BoardHexy, BoardHexy, BoardHexy, BoardHexy, BoardHexy];

export type HexColor = string;

export type Progress = Record<Color, ProgressValue>;

export type Uuid4 = string;

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
