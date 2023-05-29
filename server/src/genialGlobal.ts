import { Uuid4 } from "./types";

export type BuildMode = "development" | "production" | "e2e";

export interface GenialGlobal {
    buildMode: BuildMode;
    serverSentEventsClientCount: number;
    users: Record<Uuid4, {
        lastPongTime: number,
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