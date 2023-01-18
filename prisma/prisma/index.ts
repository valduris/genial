// import { Ok, Err, Result } from 'ts-results';
// import { PrismaClient } from "@prisma/client"
//
// export const prisma = new PrismaClient();
//
// async function createGame(params: {
//     players: number[];
//     boardSize: 6 | 7 | 8 | 9;
// }): Promise<Result<any, any>> {
//     if (params.players.length < 2) {
//         return Err("At least 2 players are necessary to start a game");
//     }
//
//     if (![6, 7, 8].includes(params.boardSize)) {
//         return Err("Board size must be either 6, 7 or 8");
//     }
//
//     await prisma.game.create({
//         data: {
//             boardSize: params.boardSize,
//             name: "public death match",
//             public: true,
//             authorId: 1,
//             players: {
//                 connect: params.players.reduce((memo, id) => {
//                     return memo.concat([{ id: id }]);
//                 }, []),
//             },
//         }
//     });
//
//     const result = await prisma.user.findMany({
//         include: {
//             game: true,
//             Profile: true,
//         },
//     })
//
//     return Ok(result);
// }
//
// createGame({ boardSize: 6, players: [1, 2, 3] })
//     .then(async (result) => {
//         console.log(result.val);
//         await prisma.$disconnect()
//     })
//     .catch(async (e) => {
//         console.error(e)
//         await prisma.$disconnect()
//         process.exit(1)
//     });