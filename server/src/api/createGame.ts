import { Request } from "express";
import { prisma } from "../index.js";
import { TemporaryAny } from "../types";
import { isRequestValid, Uuid } from "../validators.js";
import { Game, PrismaClient } from "@prisma/client";
import { boolean, number, object, size, string } from "superstruct";

export type GamePostParams = Pick<Game, "boardSize" | "name" | "public" | "showProgress" | "playerCount"> & Required<Pick<Game, "adminUuid">>;

export function prismaCreateGame(prisma: PrismaClient, body: GamePostParams) {
    return prisma.game.create({
        data: {
            public: body.public,
            showProgress: body.showProgress,
            name: body.name,
            boardSize: body.boardSize,
            playerCount: body.playerCount,
            adminUuid: body.adminUuid,
            players: {
                connectOrCreate: {
                    where: { uuid: body.adminUuid || undefined },
                    create: { uuid: body.adminUuid || undefined },
                },
            },
        },
        select: {
            public: true,
            showProgress: true,
            name: true,
            boardSize: true,
            playerCount: true,
            players: true,
        },
    })
}

export async function createGame(req: Request<{}, {}, GamePostParams, {}>, res) {
    const validator = object({
        playerCount: size(number(), 2, 4),
        adminUuid: Uuid,
        public: boolean(),
        showProgress: boolean(),
        name: size(string(), 1, 50),
        boardSize: size(number(), 6, 8),
    });

    if (!isRequestValid(req as TemporaryAny, validator)) {
        return res.json({ error: "Invalid request parameters" });
    }

    return res.json(await prismaCreateGame(prisma, req.body));
}