import { PROGRESS_COLORS } from "./consts";
import {
    BoardHexy,
    BoardHexyPair, BoardSize,
    Color,
    Game,
    GameStatus,
    GameType,
    HexColor,
    MenuOption,
    PermanentAny,
    Player,
    PlayerHexy,
    PlayerHexyPair,
    Point,
    Sound,
    Uuid4
} from "./types";

export function getProgressColor(progress: number): HexColor {
    return PROGRESS_COLORS[Math.floor(progress * 20)];
}

export interface CreatePromiseReturnType<T> {
    promise: Promise<T>;
    resolve: (t: T) => PromiseLike<T>;
    reject: (x: PermanentAny) => PromiseLike<T>;
}

export function createPromise<T>(): CreatePromiseReturnType<T> {
    let resolve;
    let reject;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });

    return {
        promise: promise,
        resolve: resolve as unknown as CreatePromiseReturnType<T>["resolve"],
        reject: reject as unknown as CreatePromiseReturnType<T>["reject"],
    }
}

export function uuid4(): Uuid4 {
    // @ts-ignore: TS2365
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, (c: number) =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}


const AUDIO_CACHE: Record<string, HTMLAudioElement> = {};

export function playSound(sound: Sound): void {
    if (!AUDIO_CACHE[sound]) {
        AUDIO_CACHE[sound] = new Audio(`./assets/sound/${sound}.mp3`);
    }
    AUDIO_CACHE[sound].play();
}

export function randomFromRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function clamp(min: number, x: number, max: number): number {
    return Math.min(Math.max(min, x), max);
}

// export interface ReplayV1 {
//     version: string,
//     hexys: Pick<Hexys, "id">;
// }
//
// export type Replay = ReplayV1;

// export function createReplayFileFromGameHistory(game: Pick<Game, "history" | "startTime" | "teams" | "hexys">): ReplayV1 {
//     return {
//         version: "0.0.1",
//         actions: game.history,
//         hexys: { id: game.hexys.id },
//     };
// }

export function translate(text: string): string {
    return text;
}

export function assertNever(x: never): never {
    throw new Error("Unexpected object: " + x);
}

export function getFullSeconds(time: number): number {
    return Math.floor(time / 1000);
}

export const COLORS: Color[] = ["red", "yellow", "orange", "blue", "green", "violet"];

export function randomColor(): Color {
    return COLORS[randomFromRange(0, COLORS.length - 1)];
}

export function createBoardHexy(x: BoardHexy["x"], y: BoardHexy["y"], color: BoardHexy["color"]): BoardHexy {
    return { x: x, y: y, color: color };
}

export function createPlayerHexyPair(color1: Color, color2: Color, selectedIndex?: 0 | 1): PlayerHexyPair {
    return [{ color: color1, selected: selectedIndex === 0 }, { color: color2, selected: selectedIndex === 1 }];
}

export function createBoardHexyPair(hexy1: BoardHexy, hexy2: BoardHexy): BoardHexyPair {
    return [hexy1, hexy2];
}

export function createHexy(x: number, y: number, color: Color): BoardHexy {
    return { x: x, y: y, color: color };
}

export function getMenuOptionsByGameTypeAndStatus(type: GameType, status: GameStatus): MenuOption[] {
    if (status === "loading") {
        return [];
    } else if (status === "mainMenu") {
        return ["newGame", "loadReplay", "quitGame"];
    } else if (status === "inProgress") {
        if (type === "replay") {
            return ["resume", "pause", "loadReplay", "quitGame"];
        }
        return ["resume", "pause", "saveReplay", "loadReplay", "quitGame"];
    }

    assertNever(status);
}

export function mapTimes<T>(n: number, mapper: (i: number) => T): T[] {
    const result = [];
    for (let i = 0; i < n; i++) {
        result.push(mapper(i))
    }
    return result;
}

export function getColsByRow(row: number, boardSize: BoardSize) {
    if (row <= boardSize) {
        return boardSize + row - 1;
    } else {
        return boardSize * 3 - row - 1;
    }
}

export function isBoardHexy(point: BoardHexy | Point): point is BoardHexy {
    return "color" in point;
}

export function getNeighboringHexysOf(of: Pick<BoardHexy, "x" | "y">, game: Pick<Game, "hexyPairs" | "boardSize">): (BoardHexy | Point)[] {
    const neighboringCoords: readonly (readonly [number, number])[] = ([
        [of.x - 1, of.y],
        [of.x + 1, of.y],
        [of.x, of.y - 1],
        [of.x, of.y + 1],
        of.y < game.boardSize ? [of.x + 1, of.y + 1] as const : [of.x - 1, of.y + 1] as const,
        of.y <= game.boardSize ? [of.x - 1, of.y - 1] as const : [of.x + 1, of.y - 1] as const,
    ] as const).filter(tuple => {
        return tuple[0] > 0 && tuple[1] > 0 && tuple[0] <= getColsByRow(tuple[1], game.boardSize) && tuple[1] < (game.boardSize * 2);
    });

    const neighbors = neighboringCoords.reduce((result: (BoardHexy | Point)[], coord) => {
        const boardHexy: BoardHexy | undefined = game.hexyPairs.reduce((memo: BoardHexy | undefined, hexyPair) => {
            return memo || hexyPair.find(hexy => hexy.x === coord[0] && hexy.y === coord[1]);
        }, undefined);

        result.push(boardHexy || { x: coord[0], y: coord[1] });

        return result;
    }, []);

    return neighbors;
}

export function isNeighborOf(of: BoardHexy | Point, game: Pick<Game, "hexyPairs" | "boardSize">, potentialNeighbor: Point): boolean {
    return getNeighboringHexysOf(of, game).some(hexy => hexy.x === potentialNeighbor.x && hexy.y === potentialNeighbor.y);
}
