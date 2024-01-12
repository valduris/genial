import type { Store } from "redux";
import { BuildMode } from "./log";
import { LogLevel, PermanentAny } from "./types";

export interface GenialGlobal {
    logLevel: LogLevel;
    exclusiveMode: boolean;
    buildMode: BuildMode;
    store: Store | undefined;
}

export const GENIAL_GLOBAL: GenialGlobal = {
    logLevel: LogLevel.Verbose,
    exclusiveMode: false,
    buildMode: "development",
    store: undefined,
};

(window as PermanentAny).GENIAL_GLOBAL = GENIAL_GLOBAL;
