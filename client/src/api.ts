import { BoardHexyPair, BoardSize, PlayerCount, Uuid4 } from "./types";

export async function fetchJson(url: string, options?: Parameters<typeof fetch>[1]) {
    return await (await fetch(url, {
        method: options?.method ?? "POST",
        body: JSON.stringify(options?.body),
        mode: "cors",
        headers: {
            'Content-Type': 'application/json'
        },
        ...options,
    })).json();
}

export const Api = {
    placeHexyPairOnBoard: placeHexyPairOnBoard,
    createGame: createGame,
    joinGame: joinGame,
} as const;

async function placeHexyPairOnBoard(params: {
    playerId: number,
    gameId: string,
    hexy: BoardHexyPair,
}) {
    const fetchResult = await fetch("http://localhost:3300/api/game/placeHexy");
    const result = await fetchResult.json();

    return result;
}

// TOOD types unification
export interface CreateGameParams {
    boardSize: BoardSize;
    playerCount: PlayerCount;
    public: boolean;
    showProgress: boolean;
    name?: string;
    authorId?: number;
    playerUuid?: string;
}

export async function createGame(params: CreateGameParams) {
    return await fetchJson("http://localhost:3300/api/game", { body: JSON.stringify(params) });
}

export async function joinGame(params: { gameUuid: Uuid4; playerUuid: Uuid4; }) {
    return await fetchJson("http://localhost:3300/api/game/join", { body: JSON.stringify(params) });
}