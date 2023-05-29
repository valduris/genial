

// TODO clear this map on game end
import { Uuid4 } from "./types";

export const GAME_HEXY_PAIR_MAP: Record<Uuid4, HexyPairs> = {};

export function initializeHexyPairListForNewGame() {
    return
}

export function drawRandomHexyPair(gameId: Uuid4) {
    GAME_HEXY_PAIR_MAP[gameId]
}