import { PrismaClient } from "@prisma/client";

export async function apiGames(prisma: PrismaClient) {
    const result = await prisma.game.findMany({
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
    console.log(result);
    return result;
}