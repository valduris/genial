import { Request } from "express";
import { Uuid4 } from "../types";

export interface PlaceHexyParams {
    gameUuid: Uuid4;
    playerUuid: Uuid4;
}

export async function placeHexy(req: Request<{}, {}, {}, PlaceHexyParams>, res) {
//     /**
//      * 1) validate input & check if player had move
//      * 2) update game state - add hexy on board, calculate player"s progress
//      * 3) update state of all clients by sending updated server state, check for important differences if necessary
//      * 4) check if game over and publish results
//      */
//
//     console.log("playerUuid", req.query.playerUuid);
//     const player = await prisma.user.findUnique({
//         where: { uuid: req.query.playerUuid },
//         include: { game: true },
//     });
//
//     console.log("player" ,player);
//
//     return res.json(player);
}