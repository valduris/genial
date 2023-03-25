import { Game, PrismaClient } from "@prisma/client";

export type GamePostParams = Pick<Game, "boardSize" | "name" | "public" | "showProgress" | "playerCount"> & Required<Pick<Game, "adminUuid">>;

export function apiPostGame(prisma: PrismaClient, body: GamePostParams) {
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