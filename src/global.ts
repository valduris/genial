import { BuildMode } from "./log";
import { Game, LogLevel, PermanentAny, Rect } from "./types";

export interface GenialGlobal {
    logLevel: LogLevel;
    exclusiveMode: boolean;
    buildMode: BuildMode;
    game: Game | undefined;
}

export const GENIAL_GLOBAL: GenialGlobal = {
    logLevel: LogLevel.Verbose,
    exclusiveMode: false,
    buildMode: "development",
    game: undefined,
};

(window as PermanentAny).GENIAL_GLOBAL = GENIAL_GLOBAL;
