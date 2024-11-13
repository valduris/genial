import { BoardHexyPair } from "./types";

export async function fetchJson(url: string, options?: Parameters<typeof fetch>[1]) {
    return await (await fetch(url, {
        method: options?.method ?? "POST",
        body: JSON.stringify(options?.body),
        mode: "cors",
        headers: {
            'Content-Type': 'application/json'
        },
        ...options,
    })).json();
}