import express, { Request } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client"
import { isRequestValid, Uuid, VALIDATORS } from "./validators.js";
import { Uuid4 } from "./types";
import { apiPostGame, GamePostParams } from "./queries/gamePost.js";
import { apiGames } from "./queries/games.js";
import { object, validate } from "superstruct";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

export type BuildMode = "development" | "production" | "e2e";

export interface GenialGlobal {
    buildMode: BuildMode;
    serverSentEventsClientCount: number;
    users: Record<Uuid4, {
        res?: {
            write: (...args: any) => any;
        };
    }>;
}

export const GENIAL_GLOBAL: GenialGlobal = {
    serverSentEventsClientCount: 0,
    buildMode: process.env.BUILD_MODE as BuildMode,
    users: {},
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

export function invalidRequest(req?: Pick<Request, "body">) {
    if (GENIAL_GLOBAL.buildMode !== "production" && req) {
        return { error: `Invalid request parameters ${JSON.stringify(req.body)}` };
    }
    return { error: "Invalid request parameters" };
}

app.post("/api/game/join", async (req: Request<{}, {}, { gameUuid: Uuid4; playerUuid: Uuid4; }, {}>, res) => {
    if (!isRequestValid(req as TemporaryAny)) {
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

    const updatedGame = await prisma.game.update({
        where: { uuid: req.body.gameUuid },
        data: {
            players: {
                connectOrCreate: {
                    create: {
                        uuid: req.body.playerUuid,
                    },
                    where: {
                        uuid: req.body.playerUuid,
                    },
                },
            },
        },
        select: {
            ...["boardSize", "createdAt", "finished", "name", "playerCount", "public", "showProgress", "status", "uuid", "adminUuid"].reduce((m, c) => {
                return { ...m, [c]: true };
            }, {}),
            players: {
                select: {
                    uuid: true,
                    name: true,
                },
            },
        },
    });

    updatedGame.players.forEach(player => {
        if (GENIAL_GLOBAL.users[player.uuid]) {
            const data = { type: GameEvent.PlayerJoined, data: game };
            GENIAL_GLOBAL.users[player.uuid].res?.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    });

    return res.json(updatedGame);
});

app.post("/api/game/start", async (req: Request<{}, {}, { gameUuid: Uuid4; adminUuid: Uuid4; }, {}>, res) => {
    const game = await prisma.game.findUnique({
        where: { uuid: req.body.gameUuid },
        select: { uuid: true, adminUuid: true },
    });

    if (!isRequestValid(req as TemporaryAny) || game.adminUuid !== req.body.adminUuid) {
        res.json(invalidRequest(req));
        return;
    }

    const updatedGame = await prisma.game.update({
        where: {
            uuid: req.body.gameUuid
        },
        data: {
            status: "Started"
        },
        select: {
            status: true,
            uuid: true,
            players: {
                select: {
                    uuid: true,
                },
            },
        },
    });

    updatedGame.players.forEach(player => {
        if (GENIAL_GLOBAL.users[player.uuid]) {
            const data = { type: GameEvent.PlayerJoined, data: game };
            GENIAL_GLOBAL.users[player.uuid].res?.write(`data: ${JSON.stringify(data)}\n\n`);
        }
    });

    return res.json(updatedGame);
});

app.get("/events/:playerUuid", async (req, res) => {
    const [error] = validate(req.params, object({ playerUuid: Uuid }));

    if (error !== undefined) {
        console.error(error);
        res.json(invalidRequest(req));
        return;
    }

    if (!GENIAL_GLOBAL.users[req.params.playerUuid]) {
        GENIAL_GLOBAL.users[req.params.playerUuid] = {
            res: res,
        };
    }

    res.set({ "Cache-Control": "no-cache", "Content-Type": "text/event-stream", "Connection": "keep-alive" });
    res.flushHeaders();
    res.write("retry: 5000\n\n");
    res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);
    res.on("close", () => {
        delete GENIAL_GLOBAL.users[req.params.playerUuid];
        res.end();
    });
});

export enum GameEvent {
    "Started" = "started",
    "Finished" = "finished",
    "PlayerJoined" = "playerJoined",
    "PlayerLeft" = "playerLeft",
    "HexyPlaced" = "hexyPlaced",
}

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