import { Request } from "express";
import { prisma } from "../index.js";

import { PrismaClient } from "@prisma/client";

export async function prismaGames(prisma: PrismaClient) {
    return await prisma.game.findMany({
        where: {
            status: "Created",
        },
        select: {
            uuid: true,
            adminUuid: true,
            name: true,
            boardSize: true,
            playerCount: true,
            createdAt: true,
            players: {
                select: {
                    name: true,
                    uuid: true,
                },
            },
        },
    });
}

export async function listGames(req: Request<{}, {}, {}>, res) {
    return res.json(await prismaGames(prisma));
}