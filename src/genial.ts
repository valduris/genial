import './Genial.css';
import {
    BoardHexyPairs, Game, GameStatus, GameType, Player, PlayerHexyPairs, UnixTimestamp
} from "./types";
import { createPlayerHexyPair, getMenuOptionsByGameTypeAndStatus, randomColor } from "./utils";

export function createPlayer(args: { name: string; hexyPairs: PlayerHexyPairs }): Player {
    return {
        hexyPairs: args.hexyPairs,
        name: args.name,
        hoveredHexyCoords: undefined,
        turn: true,
        firstPlacedHexy: undefined,
        progress: {
            blue: 10,
            red: 1,
            green: 4,
            orange: 7,
            violet: 18,
            yellow: 9,
        },
    };
}

export function initializeGameState(params: {
    startTime: UnixTimestamp;
    hexyPairs: BoardHexyPairs;
    type: GameType;
    status: GameStatus;
}): Game {
    const team0Player0 = createPlayer({
        name: "Human player",
        hexyPairs: [
            createPlayerHexyPair("green", "blue"),
            createPlayerHexyPair("red", "green"),
            undefined,
            createPlayerHexyPair("red", "red"),
            createPlayerHexyPair("yellow", "green"),
            createPlayerHexyPair("orange", "orange"),
        ],
    });

    const team1player0 = createPlayer({
        name: "Computer",
        hexyPairs: [
            createPlayerHexyPair("green", "green"),
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
        ],
    });

    const initialGameState = {
        player: team0Player0,
        alliesAndOpponents: [team1player0],
        hexyPairs: [],
        boardSize: 6 as const,
        startTime: params.startTime,
        // history: [],
        menu: {
            open: false,
            entries: getMenuOptionsByGameTypeAndStatus(params.type, params.status),
            selectedEntryIndex: 0 as const,
        },
        type: params.type,
        status: params.status,
    };

    return initialGameState;
}

export function isRightButton(event: any): boolean {
    return (event.which && event.which === 3) || (event.button && event.button === 2);
}