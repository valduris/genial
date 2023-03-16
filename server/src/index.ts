import express, { Request } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client"
import { isRequestValid } from "./validators.js";
import { Uuid4 } from "./types";
import { apiPostGame, GamePostParams } from "./queries/gamePost.js";
import { apiGames } from "./queries/games.js";

const app = express();
app.use(bodyParser());
app.use(cors());

export type BuildMode = "development" | "production" | "e2e";

export interface GenialGlobal {
    buildMode: BuildMode;
    serverSentEventsClientCount: number;
}

export const GENIAL_GLOBAL: GenialGlobal = {
    serverSentEventsClientCount: 0,
    buildMode: process.env.BUILD_MODE as BuildMode,
}

export const prisma = new PrismaClient();

app.get("/api/games", async (req: Request<{}, {}, {}>, res) => {
    return res.json(await apiGames(prisma));
});

// const options = {
//     origin: "http://localhost:3000",
// }
// if (process.env.BUILD_MODE === "development") {
//     app.use(cors(options))
// }

app.options("/api/game", cors()) // enable pre-flight request for POST request

type TemporaryAny = any;

app.post("/api/game", async (req: Request<{}, {}, GamePostParams, {}>, res) => {
    if (!isRequestValid(req as TemporaryAny)) {
        return res.json({ error: "Invalid request parameters" });
    }
    return res.json(await apiPostGame(prisma, req.body));
});

export function invalidRequest(req: Pick<Request, "body">) {
    if (GENIAL_GLOBAL.buildMode !== "production") {
        return { error: `Invalid request parameters ${JSON.stringify(req.body)}` };
    }
    return { error: `Invalid request parameters` };
}

app.post("/api/game/join", async (req: Request<{}, {}, { gameUuid: Uuid4; playerUuid: Uuid4; }, {}>, res) => {
    if (!isRequestValid(req as TemporaryAny)) {
        res.json(invalidRequest(req));
    }

    const game = await prisma.game.update({
        where: {
            uuid: req.body.gameUuid,
        },
        data: {
            players: {
                connect: {
                    uuid: req.body.playerUuid,
                },
            },
        },
        select: {
            boardSize: true,
            createdAt: true,
            finished: true,
            players: {
                select: {
                    uuid: true,
                    name: true,
                },
            },
            name: true,
            playerCount: true,
            public: true,
            showProgress: true,
            status: true,
            uuid: true,
        },
    });

    return res.json(game);
});

app.get("/events", async function(req, res) {
    GENIAL_GLOBAL.serverSentEventsClientCount += 1;

    console.log("GENIAL_GLOBAL.serverSentEventsClientCount", GENIAL_GLOBAL.serverSentEventsClientCount);
    res.set({
        "Cache-Control": "no-cache",
        "Content-Type": "text/event-stream",
        "Connection": "keep-alive",
    });
    res.flushHeaders();
    res.write("retry: 5000\n\n");

    let count = 0;
    let timerId;

    res.on("close", () => {
        GENIAL_GLOBAL.serverSentEventsClientCount -= 1;
        console.log("GENIAL_GLOBAL.serverSentEventsClientCount", GENIAL_GLOBAL.serverSentEventsClientCount);
        console.log("client dropped me");
        clearTimeout(timerId);
        res.end();
    });

    while (true) {
        await new Promise<void>(resolve => {
            timerId = global.setTimeout(() => {
                console.log("Emit", ++count);
                res.write(`data: ${JSON.stringify({countYes: count})}\n\n`);
                resolve();
            }, 1000);
        })
    }
});

// app.post("/api/game/placeHexy", cors(), async (req: Request<{}, {}, {}, { playerUuid: string; gameUuid: Uuid4; }>, res) => {
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
// });

app.listen(3300, () => {
    console.log(`Example app listening on port ${3300}`);
});