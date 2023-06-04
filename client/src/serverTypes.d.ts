/// <reference types="express" />
/// <reference types="node" />
declare module "types" {
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
        Ping = "ping"
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
        HexyPair | undefined
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
        createdAt: string;
        finished: false;
        players: Player[];
        name: string;
        playerCount: PlayerCount;
        public: boolean;
        showProgress: boolean;
        status: "Created";
        uuid: "eb6a6aa6-4cbe-459f-bee7-c78478a95c36";
    }
    export type SpecialCorners = [BoardHexy, BoardHexy, BoardHexy, BoardHexy, BoardHexy, BoardHexy];
    export type HexColor = string;
    export type Progress = Record<Color, ProgressValue>;
    export type Uuid4 = string;
    type DeepPick3<A, B extends keyof A, C extends keyof A[B]> = {
        [BK in B]: Pick<A[B], C>;
    };
    type DeepPick4<A, B extends keyof A, C extends keyof A[B], D extends keyof A[B][C]> = {
        [BK in B]: {
            [CK in C]: Pick<A[B][C], D>;
        };
    };
    type DeepPick5<A, B extends keyof A, C extends keyof A[B], D extends keyof A[B][C], E extends keyof A[B][C][D]> = {
        [BK in B]: {
            [CK in C]: {
                [DK in D]: Pick<A[B][C][D], E>;
            };
        };
    };
    export type DeepPick<A, B extends keyof A, C extends keyof A[B], D = {}, E = {}> = D extends keyof A[B][C] ? E extends keyof A[B][C][D] ? DeepPick5<A, B, C, D, E> : DeepPick4<A, B, C, D> : DeepPick3<A, B, C>;
    type Fn = (...params: any) => any;
    export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
    export type FirstParam<G> = G extends Fn[] ? UnionToIntersection<G[number] extends (...args: infer P) => any ? P[0] : never> : G extends (...args: infer P) => any ? P[0] : never;
}
declare module "genialGlobal" {
    import { Uuid4 } from "types";
    export type BuildMode = "development" | "production" | "e2e";
    export interface GenialGlobal {
        buildMode: BuildMode;
        serverSentEventsClientCount: number;
        users: Record<Uuid4, {
            lastPongTime: number;
            res?: {
                write: (...args: any) => any;
            };
        }>;
    }
    export const GENIAL_GLOBAL: GenialGlobal;
}
declare module "validators" {
    import { Struct } from "superstruct";
    import { Request } from "express";
    export const Email: Struct<unknown, null>;
    export const Uuid: Struct<unknown, null>;
    export function isRequestValid(req: Pick<Request, "url" | "method" | "body">, validator: Struct): boolean;
    export function invalidRequest(req?: Pick<Request, "body">): {
        error: string;
    };
}
declare module "api/leaveGame" {
    import { Request } from "express";
    import { TemporaryAny, Uuid4 } from "types";
    import { PrismaClient } from "@prisma/client";
    export interface LeaveGameParams {
        gameUuid: Uuid4;
        playerUuid: Uuid4;
    }
    export function prismaLeaveGame(prisma: PrismaClient, params: LeaveGameParams): Promise<{
        players: import(".prisma/client").User[];
    }>;
    export function leaveGame(req: Request<{}, {}, LeaveGameParams, {}>, res: TemporaryAny): Promise<void>;
}
declare module "api/createGame" {
    import { Request } from "express";
    import { Game, PrismaClient } from "@prisma/client";
    export type GamePostParams = Pick<Game, "boardSize" | "name" | "public" | "showProgress" | "playerCount"> & Required<Pick<Game, "adminUuid">>;
    export function prismaCreateGame(prisma: PrismaClient, body: GamePostParams): import(".prisma/client").Prisma.Prisma__GameClient<{
        name: string;
        public: boolean;
        players: import(".prisma/client").User[];
        boardSize: number;
        playerCount: number;
        showProgress: boolean;
    }, never>;
    export function createGame(req: Request<{}, {}, GamePostParams, {}>, res: any): Promise<any>;
}
declare module "api/listGames" {
    import { Request } from "express";
    import { PrismaClient } from "@prisma/client";
    export function prismaGames(prisma: PrismaClient): Promise<{
        name: string;
        players: {
            name: string;
            uuid: string;
        }[];
        uuid: string;
        createdAt: Date;
        boardSize: number;
        playerCount: number;
        adminUuid: string;
    }[]>;
    export function listGames(req: Request<{}, {}, {}>, res: any): Promise<any>;
}
declare module "api/placeHexy" {
    import { Request } from "express";
    import { Uuid4 } from "types";
    export interface PlaceHexyParams {
        gameUuid: Uuid4;
        playerUuid: Uuid4;
    }
    export function placeHexy(req: Request<{}, {}, {}, PlaceHexyParams>, res: any): Promise<void>;
}
declare module "utils" {
    import { BoardHexy, Color } from "types";
    export function removeTimeoutIdFromList(timeoutId: NodeJS.Timeout): void;
    export function addTimeoutIdToList(timeoutId: NodeJS.Timeout): void;
    export function clearTimeouts(): void;
    export function createHexy(x: number, y: number, color: Color): BoardHexy;
    export const NEIGHBORING_SPECIAL_CORNER_COLORS: {
        red: any[];
        yellow: any[];
        orange: any[];
        blue: any[];
        green: any[];
        violet: any[];
    };
    export function getNeighboringSpecialCornerColors(color: Color): void;
}
declare module "api/subscribePlayer" {
    import { Request } from "express";
    import { Uuid4 } from "types";
    export const PING_INTERVAL = 5000;
    export function subscribePlayer(req: Request<{
        playerUuid: Uuid4;
    }>, res: any): Promise<void>;
}
declare module "api/startGame" {
    import { Request } from "express";
    import { Uuid4 } from "types";
    import { PrismaClient } from "@prisma/client";
    export interface StartGameParams {
        gameUuid: Uuid4;
        adminUuid: Uuid4;
    }
    export function prismaStartGame(prisma: PrismaClient, params: StartGameParams): Promise<{
        status: import(".prisma/client").GameStatus;
        players: {
            uuid: string;
        }[];
        uuid: string;
    }>;
    export function startGame(req: Request<{}, {}, StartGameParams, {}>, res: any): Promise<any>;
}
declare module "api/pingPong" {
    import { Request } from "express";
    import { Uuid4 } from "types";
    export function pingPong(req: Request<{}, {}, {
        playerUuid: Uuid4;
    }, {}>, res: any): Promise<any>;
}
declare module "api/index" {
    export { leaveGame } from "api/leaveGame";
    export { joinGame } from "api/joinGame";
    export { createGame } from "api/createGame";
    export { listGames } from "api/listGames";
    export { placeHexy } from "api/placeHexy";
    export { subscribePlayer } from "api/subscribePlayer";
    export { startGame } from "api/startGame";
    export { pingPong } from "api/pingPong";
}
declare module "index" {
    import { PrismaClient } from "@prisma/client";
    export const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import(".prisma/client").Prisma.RejectOnNotFound | import(".prisma/client").Prisma.RejectPerOperation>;
}
    import { Request } from "express";
    import { PrismaClient } from "@prisma/client";
    import { Uuid4 } from "types";
export interface JoinGameParams {
    gameUuid: Uuid4;
    playerUuid: Uuid4;
}
export function prismaJoinGame(prisma: PrismaClient, body: JoinGameParams): Promise<{
    players: {
        name: string;
        uuid: string;
    }[];
    uuid: string;
    adminUuid: string;
}>;
export function joinGame(req: Request<{}, {}, JoinGameParams, {}>, res: any): Promise<any>;
declare module "api/typesForClient" {
    export { type prismaJoinGame } from "api/joinGame";
    export { type prismaGames } from "api/listGames";
    export { type prismaStartGame } from "api/startGame";
}

export module "api/joinGame";