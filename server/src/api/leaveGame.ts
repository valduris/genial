import { Request } from "express";
import { object } from "superstruct";

import { ServerSentEvent, TemporaryAny, Uuid4 } from "../types.js";
import { invalidRequest, isRequestValid, Uuid } from "../validators.js";
import { prisma } from "../index.js";
import { PrismaClient } from "@prisma/client";
import { GENIAL_GLOBAL } from "../genialGlobal.js";

export interface LeaveGameParams {
    gameUuid: Uuid4;
    playerUuid: Uuid4;
}

export async function prismaLeaveGame(prisma: PrismaClient, params: LeaveGameParams) {
    return await prisma.game.update({
        where: { uuid: params.gameUuid },
        data: {
            players: {
                disconnect: {
                    uuid: params.playerUuid,
                },
            },
        },
        select: {
            players: {
                // uuid: true,
            },
        },
    })
}

export async function leaveGame(req: Request<{}, {}, LeaveGameParams, {}>, res: TemporaryAny) {
    const validator = object({ gameUuid: Uuid, playerUuid: Uuid });

    if (!isRequestValid(req as TemporaryAny, validator)) {
        res.json(invalidRequest(req));
        return;
    }

    // const game = await prisma.game.findUnique({
    //     where: { uuid: req.body.gameUuid },
    //     select: {
    //         uuid: true,
    //         playerCount: true,
    //         players: {
    //             select: {
    //                 uuid: true,
    //             },
    //         },
    //     },
    // });
    //
    // const updatedGame = await prismaLeaveGame(prisma, req.body);
    //
    // updatedGame.players.forEach(player => {
    //     if (GENIAL_GLOBAL.users[player.uuid]) {
    //         const data = { type: ServerSentEvent.PlayerLeft, data: game };
    //         GENIAL_GLOBAL.users[player.uuid].res?.write(`data: ${JSON.stringify(data)}\n\n`);
    //     }
    // });

    // return res.json(updatedGame);
}