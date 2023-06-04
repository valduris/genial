import * as express from "express";
import * as cors from "cors";
import * as bodyParser from "body-parser";
import { PrismaClient } from "@prisma/client";

import { createGame, listGames, joinGame, leaveGame, startGame, pingPong, subscribePlayer, placeHexy } from "./api/index.js";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

// const options = {
//     origin: "http://localhost:3000",
// }
// if (process.env.BUILD_MODE === "development") {
//     app.use(cors(options))
// }

export const prisma = new PrismaClient();

app.get("/api/games", listGames);
app.get("/events/:playerUuid", subscribePlayer);

app.options("/api/game", cors()) // enable pre-flight request for POST request

app.post("/api/game", createGame);
app.post("/api/game/join", joinGame);
app.post("/api/game/leave", leaveGame);
app.post("/api/game/start", startGame);
app.post("/api/game/placeHexy", placeHexy);
app.post("/api/pong", pingPong);

app.listen(3300, () => {
    console.log(`Example app listening on port ${3300}`);
});