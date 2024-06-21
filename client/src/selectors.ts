import {
    BoardHexy,
    Color,
    DeepPick,
    FirstParam,
    Genial,
    PlayerHexyPair,
    Point, Uuid4
} from "./types";
import { getNeighboringHexysOf, getSpecialCornerColorByPoint, areNeighbors, isPointSpecialCorner } from "./utils";

export function selectPlayerSelectedHexyPair(state: DeepPick<Genial, "player", "hexyPairs">): PlayerHexyPair | undefined {
    return state.player.hexyPairs.find(hexyPair => hexyPair?.some(hexy => hexy.selected));
}

export function selectPlayerSelectedHexyPairHexyColor(state: DeepPick<Genial, "player", "hexyPairs">): Color | undefined {
    return state.player.hexyPairs.reduce((memo: Color | undefined, hexyPair) => {
        if (memo || !hexyPair) {
            return memo;
        }

        const selectedHexyColor = hexyPair.find(hexy => hexy.selected)?.color;

        if (selectedHexyColor) {
            return selectedHexyColor;
        }

        return memo;
    }, undefined);
}

export function selectIsHexyPreviewed<T extends Point>(
    state: DeepPick<Genial, "player", "hoveredHexyCoords"> & FirstParam<typeof selectPlayerSelectedHexyPair>
        & FirstParam<typeof selectPlayerSelectedHexyPairHexyColor>,
    point: T,
): boolean {
    const hoveredHexyCoords = state.player.hoveredHexyCoords;
    const playerSelectedHexyPair = selectPlayerSelectedHexyPair(state);
    const specialCornerColor = getSpecialCornerColorByPoint(point);
    const isHovered = hoveredHexyCoords?.x === point.x && hoveredHexyCoords.y === point.y;
    const preview = isHovered && playerSelectedHexyPair && (
        !specialCornerColor || specialCornerColor === selectPlayerSelectedHexyPairHexyColor(state)
    );

    return !!preview;
}

export function selectFirstPlacedHexy(state: DeepPick<Genial, "player", "firstPlacedHexy">): BoardHexy | undefined {
    return state.player.firstPlacedHexy;
}

export interface HexyStyle {
    circle: {
        color: Color | undefined;
    };
    hex: {
        fill: string;
        strokeWidth: number;
    };
    preview: boolean;
}

export type SelectHexyStyleByPointState = FirstParam<typeof selectFirstPlacedHexy> & FirstParam<typeof selectPlayerSelectedHexyPair>
    & FirstParam<typeof selectIsHexyPreviewed> & FirstParam<typeof selectPlayerSelectedHexyPairHexyColor>;

export function selectHexyStyleByPoint(state: SelectHexyStyleByPointState, point: Point): HexyStyle {
    const specialCornerColor = getSpecialCornerColorByPoint(point);
    const preview = selectIsHexyPreviewed(state, point);
    const firstPlacedHexy = selectFirstPlacedHexy(state);
    const isFirstPlacedHexy = firstPlacedHexy && firstPlacedHexy.x === point.x && firstPlacedHexy.y === point.y;

    return {
        hex: {
            fill: isFirstPlacedHexy
                ? "#444"
                : preview
                    ? "#777"
                    : "#fff",
            strokeWidth: isFirstPlacedHexy ? 3 : 1,
        },
        circle: {
            color: isFirstPlacedHexy
                ? firstPlacedHexy.color
                : preview
                    ? selectPlayerSelectedHexyPairHexyColor(state)
                    : specialCornerColor,
        },
        preview: preview,
    };
}

// => hover
//     => unhover
//     => click
//         => cancel
//         => click
//            => confirm
//            => cancel
export type SelectIsPointAllowedToReceiveHoverState = FirstParam<[typeof selectFirstPlacedHexy]> & FirstParam<typeof selectPlayerSelectedHexyPair>
    & FirstParam<typeof selectIsPointCoveredWithHexy> & FirstParam<typeof selectPlayerSelectedHexyPairHexyColor>
    & Pick<Genial, "game">;

export function selectIsPointAllowedToReceiveHover(state: SelectIsPointAllowedToReceiveHoverState, point: Point): boolean {
    const firstPlacedHexy = selectFirstPlacedHexy(state);
    const pointIsSpecialCorner = isPointSpecialCorner(point);
    const playerSelectedHexyPair = selectPlayerSelectedHexyPair(state);

    if (!playerSelectedHexyPair || selectIsPointCoveredWithHexy(state, point)) {
        return false;
    }

    if (firstPlacedHexy !== undefined) {
        return areNeighbors(firstPlacedHexy, point)
            && (
                !pointIsSpecialCorner
                || (
                    pointIsSpecialCorner
                    && getSpecialCornerColorByPoint(point) === selectPlayerSelectedHexyPairHexyColor(state)
                )
            );
    }

    const neighboringPoints = getNeighboringHexysOf(point, state.game).filter(hexyOrPoint => {
        return !selectIsPointCoveredWithHexy(state, hexyOrPoint);
    });

    if (neighboringPoints.length === 1 && isPointSpecialCorner(neighboringPoints[0])) {
        const isZerothSelected = playerSelectedHexyPair[0].selected;
        const cornerColor = getSpecialCornerColorByPoint(neighboringPoints[0]);
        const selectedHexySiblingColor = playerSelectedHexyPair[isZerothSelected ? 1 : 0].color;

        return selectedHexySiblingColor === cornerColor;
    }

    return true;
}

export function selectIsPointCoveredWithHexy(state: Pick<Genial, "game">, point: Point): boolean {
    return state.game.hexyPairs.some(hexyPair => {
        return hexyPair.some(hexy => hexy.x === point.x && hexy.y === point.y);
    });
}

export function selectPlayerUuid(state: Pick<Genial, "playerUuid">): Uuid4 {
    return state.playerUuid;
}