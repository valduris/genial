import { GENIAL_GLOBAL } from "./global";
import { LogLevel } from "./types";

export type BuildMode = "production" | "development";

export function log(logLevel: LogLevel, message: Parameters<typeof console.log>): void {
    if (
        (logLevel <= GENIAL_GLOBAL.logLevel && !GENIAL_GLOBAL.exclusiveMode)
        || logLevel === LogLevel.Exclusive
    ) {
        console.log(...message);
    }
}

log.verbose = (...params: Parameters<typeof console.log>): void => {
    log(LogLevel.Verbose, params);
}

log.info = (...params: Parameters<typeof console.log>): void => {
    log(LogLevel.Info, params);
}

log.warn = (...params: Parameters<typeof console.log>): void => {
    log(LogLevel.Warn, params);
}

log.error = (...params: Parameters<typeof console.log>): void => {
    log(LogLevel.Error, params);
}

log.exclusive = (...params: Parameters<typeof console.log>): void => {
    if (GENIAL_GLOBAL.buildMode === "production") {
        throw new Error(`LogLevel.Exclusive is prohibited in production`);
    }
    GENIAL_GLOBAL.exclusiveMode = true;
    log(LogLevel.Exclusive, params);
}