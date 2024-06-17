import { BoardHexyPair } from "./types";

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
} as const;

async function placeHexyPairOnBoard(params: {
    playerId: number,
    gameId: string,
    hexy: BoardHexyPair,
}) {
    const fetchResult = await fetch("http://localhost:8080/api/game/placeHexy");
    const result = await fetchResult.json();

    return result;
}