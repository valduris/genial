import { define, Struct, validate } from "superstruct";
import isUuid from "is-uuid";
import isEmail from "is-email";
import { Request } from "express";
import { GENIAL_GLOBAL } from "./genialGlobal.js";

export const Email = define("Email", isEmail);
export const Uuid = define("Uuid", isUuid.v4);

export function isRequestValid(req: Pick<Request, "url" | "method" | "body">, validator: Struct): boolean {
    const [error] = validate(req.body, validator);

    if (error && process.env.BUILD_MODE === "development") {
        console.error(error);
    }

    return error === undefined;
}

export function invalidRequest(req?: Pick<Request, "body">) {
    if (GENIAL_GLOBAL.buildMode !== "production" && req) {
        return { error: `Invalid request parameters ${JSON.stringify(req.body)}` };
    }
    return { error: "Invalid request parameters" };
}
