import { Request } from "express";
import { object } from "superstruct";
import { PrismaClient } from "@prisma/client";

import { ServerSentEvent, TemporaryAny, Uuid4 } from "../types.js";
import { invalidRequest, isRequestValid, Uuid } from "../validators.js";
import { prisma } from "../index.js";
import { GENIAL_GLOBAL } from "../genialGlobal.js";

export interface JoinGameParams {
    gameUuid: Uuid4;
    playerUuid: Uuid4;
}

export  async function prismaJoinGame(prisma: PrismaClient, body: JoinGameParams) {
    return await prisma.game.update({
        where: { uuid: body.gameUuid },
        data: {
            players: {
                connectOrCreate: {
                    create: {
                        uuid: body.playerUuid,
                    },
                    where: {
                        uuid: body.playerUuid,
                    },
                },
            },
        },
        select: {
            uuid: true,
            adminUuid: true,
            players: {
                select: {
                    uuid: true,
                    name: true,
                },
            },
        },
    });
}

export async function joinGame(req: Request<{}, {}, JoinGameParams, {}>, res) {
    const validator = object({
        playerUuid: Uuid,
        gameUuid: Uuid,
    });

    if (!isRequestValid(req as TemporaryAny, validator)) {
        res.json(invalidRequest(req));
        return;
    }

    const game = await prisma.game.findUnique({
        where: { uuid: req.body.gameUuid },
        select: {
            uuid: true,
            playerCount: true,
            players: {
                select: {
                    uuid: true,
                },
            },
        },
    });

    if (game.players.length === game.playerCount) {
        res.json(invalidRequest());
        return;
    }

    const updatedGame = await prismaJoinGame(prisma, req.body);

    updatedGame.players.forEach(player => {
        if (GENIAL_GLOBAL.users[player.uuid]) {
            const data = { type: ServerSentEvent.PlayerJoined, data: updatedGame };
            GENIAL_GLOBAL.users[player.uuid].res?.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    });

    return res.json(updatedGame);
}