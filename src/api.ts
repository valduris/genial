import { BoardHexyPair } from "./types";

export const Api = {
    placeHexyPairOnBoard
} as const;

async function placeHexyPairOnBoard(params: {
    playerId: number,
    gameId: string,
    hexy: BoardHexyPair,
}) {
    const fetchResult = await fetch('http://localhost:3300/api/placeHexyPairOnBoard');
    const result = await fetchResult.json();

    console.log(result);

    return result;
}