import { Request } from "express";
import { Uuid4 } from "../types.js";
import { object, validate } from "superstruct";
import { invalidRequest, Uuid } from "../validators.js";
import { GENIAL_GLOBAL } from "../genialGlobal.js";

export async function pingPong(req: Request<{}, {}, { playerUuid: Uuid4; }, {}>, res) {
    const [error] = validate(req.body, object({ playerUuid: Uuid }));

    if (error !== undefined) {
        console.error(error);
        res.json(invalidRequest(req));
        return;
    }

    if (GENIAL_GLOBAL.users[req.body.playerUuid]) {
        GENIAL_GLOBAL.users[req.body.playerUuid].lastPongTime = Date.now();
    }

    return res.json({ ok: true });
}