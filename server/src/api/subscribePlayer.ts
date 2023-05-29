import { object, validate } from "superstruct";
import { Request } from "express";

import { invalidRequest, Uuid } from "../validators.js";
import { ServerSentEvent, Uuid4 } from "../types.js";
import { GENIAL_GLOBAL } from "../genialGlobal.js";
import { addTimeoutIdToList, removeTimeoutIdFromList } from "../utils.js";

export const PING_INTERVAL = 5000;

export async function subscribePlayer(req: Request<{ playerUuid: Uuid4; }>, res) {
    const [error] = validate(req.params, object({ playerUuid: Uuid }));

    if (error !== undefined) {
        console.error(error);
        res.json(invalidRequest(req));
        return;
    }

    if (!GENIAL_GLOBAL.users[req.params.playerUuid]) {
        GENIAL_GLOBAL.users[req.params.playerUuid] = {
            res: res,
            lastPongTime: Date.now(),
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

    while (true) {
        await new Promise<void>(resolve => {
            const timeoutId = global.setTimeout(() => {
                res.write(`data: ${JSON.stringify({ [ServerSentEvent.Ping]: true })}\n\n`);
                removeTimeoutIdFromList(timeoutId);
                resolve();
            }, PING_INTERVAL);
            addTimeoutIdToList(timeoutId);
        });
    }
}