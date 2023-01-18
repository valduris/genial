import { Request } from "express"
import express from "express"
import bodyParser from "body-parser"
import cors from "cors"
import { PrismaClient } from "@prisma/client"
import { BoardSize } from "../types";

// import { prisma } from "./index";

// console.log("express");
// console.log(express);

const app = express();

app.use(bodyParser.json())

const prisma = new PrismaClient();

app.get("/api/placeHexyPairOnBoard2", cors(), async (req, res) => {
    const result = await prisma.user.findMany({
        include: {
            game: true,
            profile: true,
        },
    });

    return res.json(result);
})

export interface GamePostParams {
    boardSize: BoardSize;
    name: string;
    public: boolean;
    showProgress: boolean;
    playerUuid: string;
}

app.post("/api/game", cors(), async (req: Request<{}, {}, GamePostParams, {}>, res) => {
    const { boardSize, name, public, playerUuid, showProgress } = req.params;

    if (
        ![6, 7, 8].includes(boardSize)
        || name.length > 128
        || typeof public !== "boolean"
        || typeof showProgress !== "boolean"
        || !(typeof playerUuid === "string" && playerUuid.length > 128) // TODO isUuid util
    ) {
        res.json({ error: "Invalid request parameters" });
    }


    const game = await prisma.game.create({
        data: {
            boardSize: boardSize,
            name: name,
            public: public,
            authorId: playerUuid,
            showProgress: showProgress,
            players: {
                connect: [{ uuid: playerUuid }]
            },
        },
    });

    return res.json(game);
})

app.get("/api/placeHexyPairOnBoard", cors(), async (req: Request<{}, {}, {}, { playerUuid: string; }>, res) => {
    console.log("playerUuid", req.query.playerUuid);
    const player = await prisma.user.findUnique({
        where: { uuid: req.query.playerUuid },
        include: { game: true },
    });

    return res.json(player);


    // if (
    //     user.extendedPetsData &&
    //     typeof user.extendedPetsData === 'object' &&
    //     !Array.isArray(user.extendedPetsData)
    // ) {
    //     const petsObject = user.extendedPetsData as Prisma.JsonObject
    //
    //     const i = petsObject['insurances']
    //
    //     if (i && typeof i === 'object' && Array.isArray(i)) {
    //         const insurancesArray = i as Prisma.JsonArray
    //
    //         insurancesArray.forEach((i) => {
    //             if (i && typeof i === 'object' && !Array.isArray(i)) {
    //                 const insuranceObject = i as Prisma.JsonObject
    //
    //                 insuranceObject['status'] = 'expired'
    //             }
    //         })
    //
    //         const whereClause = Prisma.validator<Prisma.UserWhereInput>()({
    //             id: user.id,
    //         })
    //
    //         const dataClause = Prisma.validator<Prisma.UserUpdateInput>()({
    //             extendedPetsData: petsObject,
    //         })
    //
    //         userQueries.push(
    //             prisma.user.update({
    //                 where: whereClause,
    //                 data: dataClause,
    //             })
    //         )
    //     }
    // }
});

app.post("/api/joinGame", cors(), async (req: Request<{}, {}, { uuid: string; }, {}>, res) => {
    const game = await prisma.game.findUnique({
        where: { uuid: req.body.uuid } as any,
        include: { players: true },
    });

    // game.

    return res.json(game);
});

    // const result = await prisma.createUser({
    //     ...req.body,
    // })
    // res.json(result);

// app.post(`/post`, async (req, res) => {
//     const { title, content, authorEmail } = req.body
//     const result = await prisma.createPost({
//         title: title,
//         content: content,
//         author: { connect: { email: authorEmail } },
//     })
//     res.json(result)
// })
//
// app.put("/publish/:id", async (req, res) => {
//     const { id } = req.params
//     const post = await prisma.updatePost({
//         where: { id },
//         data: { published: true },
//     })
//     res.json(post)
// })
//
// app.delete(`/post/:id`, async (req, res) => {
//     const { id } = req.params
//     const post = await prisma.deletePost({ id })
//     res.json(post)
// })
//
// app.get(`/post/:id`, async (req, res) => {
//     const { id } = req.params
//     const post = await prisma.post({ id })
//     res.json(post)
// })
//
// app.get("/feed", async (req, res) => {
//     const posts = await prisma.post({ where: { published: true } })
//     res.json(posts)
// })
//
// app.get("/filterPosts", async (req, res) => {
//     const { searchString } = req.query
//     const draftPosts = await prisma.post({
//         where: {
//             OR: [
//                 {
//                     title_contains: searchString,
//                 },
//                 {
//                     content_contains: searchString,
//                 },
//             ],
//         },
//     })
//     res.json(draftPosts)
// })

app.listen(3300, () => {
    console.log("Server is running on http://localhost:3300");
});
