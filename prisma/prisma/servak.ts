import { PrismaClient, Game } from "@prisma/client"
import express, { Request, json } from "express"
import cors from "cors";
import { define, object, string, size, number, boolean, validate, Struct } from "superstruct"
import isUuid from "is-uuid"
import isEmail from "is-email"
import { Progress, Uuid4 } from "../types";

const app = express();
const prisma = new PrismaClient();

app.use(json());
app.use(cors())

export interface GenialGlobal {
    serverSentEventsClientCount: number;
}

export const GENIAL_GLOBAL: GenialGlobal = {
    serverSentEventsClientCount: 0,
}

export type GamePostParams = Pick<Game, "boardSize" | "name" | "public" | "showProgress" | "authorId" | "playerCount"> & { playerUuid: string };

const Email = define("Email", isEmail)
const Uuid = define("Uuid", isUuid.v4)

export type Method = "GET" | "POST" | "DELETE" | "OPTIONS" | "PATCH" | "PUT";

export type Validators = { [key in Method]: Record<string, Struct>; };

// export interface PostApiGameJoinParams {
//     playerUuid: Uuid4;
//     gameUuid: Uuid4;
// }

export const VALIDATORS: Validators = {
    PUT: {},
    DELETE: {},
    GET: {},
    OPTIONS: {},
    PATCH: {},
    POST: {
        "/api/game": object({
            authorId: number(),
            playerCount: size(number(), 2, 4),
            playerUuid: Uuid,
            public: boolean(),
            showProgress: boolean(),
            name: size(string(), 1, 50),
            boardSize: size(number(), 6, 8),
        }),
        "/api/game/join": object({
            playerUuid: Uuid,
            gameUuid: Uuid,
        }),
    },
};

export function isRequestValid(req: Pick<Request, "url" | "method" | "body">): boolean {
    const validator = VALIDATORS[req.method][req.url];

    if (!validator) {
        console.error(`Validator not found for ${req.method} ${req.url}`);
        return false;
    }

    const [error] = validate(req.body, validator);

    if (error && process.env.BUILD_MODE === "development") {
        console.error(error);
    }

    return error === undefined;
}

// const options = {
//     origin: "http://localhost:3000",
// }
// if (process.env.BUILD_MODE === "development") {
//     app.use(cors(options))
// }

app.options("/api/game", cors()) // enable pre-flight request for POST request

app.post("/api/game", async (req: Request<{}, {}, GamePostParams, {}>, res) => {
    if (!isRequestValid(req)) {
        res.json({ error: "Invalid request parameters" });
    }

    const game = await prisma.game.create({
        data: {
            authorId: req.body.authorId,
            public: req.body.public,
            showProgress: req.body.showProgress,
            name: req.body.name,
            boardSize: req.body.boardSize,
            playerCount: req.body.playerCount,
            players: {
                connectOrCreate: {
                    where: { uuid: req.body.playerUuid },
                    create: { uuid: req.body.playerUuid },
                },
            },
        },
    });

    return res.json(game);
});

app.post("/api/game/join", async (req: Request<{}, {}, { gameUuid: Uuid4; playerUuid: Uuid4; }, {}>, res) => {
    if (!isRequestValid(req)) {
        res.json({ error: "Invalid request parameters" });
    }

    const game = await prisma.game.update({
        where: {
            uuid: req.body.gameUuid,
        },
        data: {
            players: {
                connectOrCreate: {
                    where: { uuid: req.body.playerUuid },
                    create: { uuid: req.body.playerUuid },
                },
            },
        },
        select: {
            authorId: true,
            boardSize: true,
            createdAt: true,
            finished: true,
            players: {
                select: {
                    id: true,
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

app.get("/api/games", async (req: Request<{}, {}, {}, {}>, res) => {
    res.json(await prisma.game.findMany({
        where: {
            status: "Created",
        },
        select: {
            uuid: true,
            name: true,
            boardSize: true,
            playerCount: true,
            players: {
                select: {
                    id: true,
                    name: true,
                },
            },
        },
    }));
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

app.post("/api/game/placeHexy", cors(), async (req: Request<{}, {}, {}, { playerUuid: string; gameUuid: Uuid4; }>, res) => {
    /**
     * 1) validate input & check if player had move
     * 2) update game state - add hexy on board, calculate player's progress
     * 3) update state of all clients by sending updated server state, check for important differences if necessary
     * 4) check if game over and publish results
     */

    console.log("playerUuid", req.query.playerUuid);
    const player = await prisma.user.findUnique({
        where: { uuid: req.query.playerUuid },
        include: { game: true },
    });

    console.log("player" ,player);

    return res.json(player);
});

app.listen(3300, () => {
    console.log("Server is running on http://localhost:3300");
});
