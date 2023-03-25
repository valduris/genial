import { boolean, define, number, object, size, string, Struct, validate } from "superstruct";
import isUuid from "is-uuid";
import isEmail from "is-email";

export type Method = "GET" | "POST" | "DELETE" | "OPTIONS" | "PATCH" | "PUT";

export type Validators = { [key in Method]: Record<string, Struct>; };

export const Email = define("Email", isEmail);
export const Uuid = define("Uuid", isUuid.v4);

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

export const VALIDATORS: Validators = {
    PUT: {},
    DELETE: {},
    GET: {},
    OPTIONS: {},
    PATCH: {},
    POST: {
        "/api/game": object({
            playerCount: size(number(), 2, 4),
            adminUuid: Uuid,
            public: boolean(),
            showProgress: boolean(),
            name: size(string(), 1, 50),
            boardSize: size(number(), 6, 8),
        }),
        "/api/game/join": object({
            playerUuid: Uuid,
            gameUuid: Uuid,
        }),
        "/api/game/start": object({
            playerUuid: Uuid,
            gameUuid: Uuid,
        }),
    },
};

