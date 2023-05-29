import { BoardHexy, Color } from "./types";

const DISPOSABLE_TIMEOUTS: NodeJS.Timeout[] = [];

export function removeTimeoutIdFromList(timeoutId: NodeJS.Timeout): void {
    const index = DISPOSABLE_TIMEOUTS.indexOf(timeoutId);
    if (index !== -1) {
        DISPOSABLE_TIMEOUTS.splice(index, 1);
    }
}

export function addTimeoutIdToList(timeoutId: NodeJS.Timeout): void {
    DISPOSABLE_TIMEOUTS.push(timeoutId);
}

export function clearTimeouts() {
    DISPOSABLE_TIMEOUTS.forEach(timeoutId => {
        global.clearTimeout(timeoutId);
    });
}

export function createHexy(x: number, y: number, color: Color): BoardHexy {
    return { x: x, y: y, color: color };
}

export const NEIGHBORING_SPECIAL_CORNER_COLORS = {
    "red": [],
    "yellow": [],
    "orange": [],
    "blue": [],
    "green": [],
    "violet": [],
}

export function getNeighboringSpecialCornerColors(color: Color) {
}