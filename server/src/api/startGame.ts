import { Request } from "express";
import { ServerSentEvent, TemporaryAny, Uuid4 } from "../types.js";
import { object } from "superstruct";
import { invalidRequest, isRequestValid, Uuid } from "../validators.js";
import { prisma } from "../index.js";
import { PrismaClient } from "@prisma/client";
import { GENIAL_GLOBAL } from "../genialGlobal.js";

export interface StartGameParams {
    gameUuid: Uuid4;
    adminUuid: Uuid4;
}

export async function prismaStartGame(prisma: PrismaClient, params: StartGameParams) {
    return await prisma.game.update({
        where: { uuid: params.gameUuid },
        data: { status: "Started" },
        select: {
            status: true,
            uuid: true,
            players: {
                select: {
                    uuid: true,
                },
            },
        },
    })
}

export async function startGame(req: Request<{}, {}, StartGameParams, {}>, res) {
    const game = await prisma.game.findUnique({
        where: { uuid: req.body.gameUuid },
        select: { uuid: true, adminUuid: true },
    });

    const validator = object({
        playerUuid: Uuid,
        gameUuid: Uuid,
    });

    if (!isRequestValid(req as TemporaryAny, validator) || game.adminUuid !== req.body.adminUuid) {
        res.json(invalidRequest(req));
        return;
    }

    const updatedGame = await prismaStartGame(prisma, req.body);

    updatedGame.players.forEach(player => {
        if (GENIAL_GLOBAL.users[player.uuid]) {
            const data = { type: ServerSentEvent.GameStarted, data: game };
            GENIAL_GLOBAL.users[player.uuid].res?.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    });

    return res.json(updatedGame);
}