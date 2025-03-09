import { COLORS, DIRECTIONS, SPECIAL_CORNERS } from "./consts";
import {
    BoardHexy,
    BoardHexyPair,
    BoardHexyPairs,
    BoardSize,
    Color,
    Direction,
    DrawableHexyPair,
    DrawableHexyPairs,
    Game,
    PermanentAny,
    PlayerHexyPair,
    Point,
    Progress,
    Sound, Thunk,
    Uuid4,
} from "./types";
import { translations } from "./translations/en";
import { setGenialState } from "./index";

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
        /* eslint-disable-next-line no-mixed-operators */
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

export function assertNever(x: never): never {
    throw new Error("Unexpected object: " + x);
}

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

export function mapTimes<T>(n: number, mapper: (i: number) => T): T[] {
    const result = [];
    for (let i = 0; i < n; i++) {
        result.push(mapper(i))
    }
    return result;
}

export function getColsByRow(row: number, boardSize: BoardSize) {
    return boardSize * 2 - 1 + (row * ((row > 0) ? -1 : 1));
}

export function getNextPointInDirection(point: Point, direction: Direction): Point {
    return {
        x: point.x + 1 * direction[0],
        y: point.y + 1 * direction[1],
    };
}

export function createEmptyProgress(): Progress {
    return COLORS.reduce((m: Progress, c) => {
        m[c] = 0;
        return m;
    }, {} as Progress);
}

export function createDrawableHexyPairs(): DrawableHexyPairs {
    return COLORS.reduce((memo: DrawableHexyPairs, color) => {
        COLORS.forEach(innerColor => {
            memo = memo.concat(mapTimes(2, () => {
                return [{ color: color }, { color: innerColor }] as DrawableHexyPair;
            }));
        });
        return memo;
    }, []);
}

export function calulateProgressGained(game: Pick<Game, "hexyPairs">, hexyPair: BoardHexyPair): Progress {
    const progressGained: Progress = hexyPair.reduce((outerMemo: Progress, hexy) => {
        return DIRECTIONS.reduce((progress, direction) => {
            for (
                let tempPoint: Point = getNextPointInDirection(hexy, direction),
                    color = getColorByPoint(game.hexyPairs, tempPoint);
                color === hexy.color;
                progress[color] += 1,
                tempPoint = getNextPointInDirection(tempPoint, direction),
                color = getColorByPoint(game.hexyPairs, tempPoint)
            );
            return progress;
        }, outerMemo);
    }, createEmptyProgress());

    return progressGained;
}

export function isCoordinateValid(point: Point, boardSize: BoardSize): boolean {
    const col = point.x;
    const row = point.y;

    if (row > boardSize || row < -boardSize) {
        return false;
    }

    const xMin = row <= 0 ? -(boardSize) - row : -(boardSize);
    const xMax = getColsByRow(row, boardSize) - Math.abs(xMin) + 1;

    return col >= xMin && col <= xMax;
}

export function getNeighboringPoints(of: Point, boardSize: BoardSize): readonly Point[] {
    return DIRECTIONS.reduce((memo, direction) => {
        const point: Point = { x: of.x + direction[0], y: of.y + direction[1] };
        return memo.concat(isCoordinateValid(point, boardSize) ? [point] : []);
    }, [] as Point[]);
}

export function getNeighboringHexysOf(of: Pick<BoardHexy, "x" | "y">, game: Pick<Game, "hexyPairs" | "boardSize">): (BoardHexy | Point)[] {
    return DIRECTIONS.reduce((memo: (BoardHexy | Point)[], direction) => {
        const point = { x: of.x + direction[0], y: of.y + direction[1] };
        const boardHexy: BoardHexy | undefined = game.hexyPairs.reduce((memo: BoardHexy | undefined, hexyPair) => {
            return memo || hexyPair.find(hexy => hexy.x === point.x && hexy.y === point.y);
        }, undefined);
        return memo.concat(boardHexy ? [boardHexy] : isCoordinateValid(point, game.boardSize) ? [point] : []);
    }, []);
}

export function areNeighbors(first: BoardHexy | Point, second: Point): boolean {
    return DIRECTIONS.some(direction => {
        return first.x === (second.x + direction[0]) && first.y === (second.y + direction[1]);
    })
}

export function getXyCoordsByRowCol(params: { row: number; col: number; boardSize: BoardSize }): { x: number; y: number; } {
    // const xUnit = params.boardSize === 6 ? 85 : params.boardSize === 7 ? 73.7 : 63.75;
    // const yUnit = params.boardSize === 6 ? 78 : params.boardSize === 7 ? 66.86 : 58.5;
    const x = Math.abs(params.boardSize + params.row + params.boardSize) * 85 / 2 + 85 * params.col + 5;
    const y = (params.row + params.boardSize) * 78 + 3;

    return { x: x, y: y };
}

export function getSpecialCornerColorByPoint<T extends Point>(point: T): Color | undefined {
    return SPECIAL_CORNERS.find(cornerHexy => {
        return cornerHexy.x === point.x && cornerHexy.y === point.y;
    })?.color;
}

export function getColorByPoint<T extends Point>(boardHexyPairs: BoardHexyPairs, point: T): Color | undefined {
    const color = boardHexyPairs.reduce((color: Color | undefined, pair) => {
        return color || pair.find(hexy => hexy.x === point.x && hexy.y === point.y)?.color;
    }, undefined);

    return color || getSpecialCornerColorByPoint(point);
}

export function debugAssert(message: string) {
    throw new Error(message);
}

export function isPointSpecialCorner(point: Point): boolean {
    return SPECIAL_CORNERS.some(specialCorner => specialCorner.x === point.x && specialCorner.y === point.y);
}

export function isRightButton(event: any): boolean {
    return (event.which && event.which === 3) || (event.button && event.button === 2);
}

export function translate(what: keyof typeof translations): string {
    return translations[what];
}

export function handleFetchResult(result: { status: "ok" | "error"; type: string; }): Thunk {
    return (dispatch) => {
        if (result.status !== "ok") {
            dispatch(setGenialState({ error: "An error occurred while fetching data..." }));
        }
    }
}