import { Request } from "express";
import { object } from "superstruct";

import { TemporaryAny, Uuid4 } from "../types.js";
import { invalidRequest, isRequestValid, Uuid } from "../validators.js";

export interface LeaveGameParams {
    gameUuid: Uuid4;
    playerUuid: Uuid4;
}

export async function drawHexyPair(req: Request<{}, {}, LeaveGameParams, {}>, res: TemporaryAny) {
    const validator = object({ gameUuid: Uuid, playerUuid: Uuid });

    if (!isRequestValid(req as TemporaryAny, validator)) {
        res.json(invalidRequest(req));
        return;
    }

    const hexyPair = drawRandomHexyPair(req.body.gameUuid)

    return res.json(hexyPair);
}