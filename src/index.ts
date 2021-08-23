import { AsyncLocalStorage } from "async_hooks";

let hooks: typeof import("async_hooks");
try {
    hooks = require("async_hooks");
} catch (ex) {}

export interface GulogSettings {
    /**
     * The token (created on the gulog panel) for this software
     */
    token: string;
    /**
     * The version of this software, semver format (major.minor.patch)
     */
    version: string;
    /**
     * Set to true if you want to disable console logging.
     */
    muteConsole: boolean;
}

let globalSettings: GulogSettings;

const asyncStorage = new AsyncLocalStorage();

export function init(settings: GulogSettings) {
    globalSettings = settings;

    if (hooks) {
        console.log("[gulog] Detected nodejs: using AsyncLocalStorage to create 'thread-local' storage.");
    }
}

export type Severity = "info" | "warn" | "error";

let pidCounter = 0;

export class GulogProcess {
    pid: number | undefined;
    spawnTask!: Promise<{ pid: number }>;
    type: string;
    parent?: GulogProcess;

    /**
     * @param type The type of process to create, for example:  `user-create`, `project-edit` ...
     * @param initiator Custom data about the initiator of this process. Examples: user, token
     * @param parentProcess The parent process that initiated this process.
     */
    constructor(type: string, initiator?: any, parentProcess?: GulogProcess) {
        this.type = type;
        this.parent = parentProcess;

        let agent = "";
        if ("navigator" in globalThis && "userAgent" in globalThis.navigator) {
            agent = globalThis.navigator.userAgent;
        }
        this.pid = ++pidCounter;
        console.log(`[${this.tag()} ${this.type}] start!`);

        // this.spawnTask = fetch(`https://gulog.io/api/process`, {
        //     method: "POST",
        //     body: JSON.stringify({
        //         softwareVersion: globalSettings.version,
        //         token: globalSettings.token,
        //         initiatorData: initiator,
        //         userAgent: agent,
        //     }),
        // }).then((res) => res.json());
    }

    private customLog(severity: Severity, data: any[]) {
        let str = data.map((e) => (typeof data === "object" ? JSON.stringify(e) : String(e))).join(" ");
        // this.spawnTask.then(({ pid }) =>
        //     fetch("https://gulog.io/api/log", {
        //         method: "POST",
        //         body: JSON.stringify({
        //             data: str,
        //             severity: severity,
        //             processId: pid,
        //             token: globalSettings.token,
        //         }),
        //     })
        // );
    }

    log(data: any, ...moreData: any[]) {
        this.customLog("info", [data, ...moreData]);
        if (!globalSettings.muteConsole) {
            console.log(`[${this.tag()} ${this.type}] info`, data, ...moreData);
        }
    }

    info(data: any, ...moreData: any[]) {
        this.customLog("info", [data, ...moreData]);
        if (!globalSettings.muteConsole) {
            console.info(`[${this.tag()} ${this.type}] info`, data, ...moreData);
        }
    }

    error(data: any, ...moreData: any[]) {
        this.customLog("error", [data, ...moreData]);
        if (!globalSettings.muteConsole) {
            console.error(`[${this.tag()} ${this.type}] error`, data, ...moreData);
        }
    }

    warn(data: any, ...moreData: any[]) {
        this.customLog("warn", [data, ...moreData]);
        if (!globalSettings.muteConsole) {
            console.warn(`[${this.tag()} ${this.type}] warn`, data, ...moreData);
        }
    }

    /**
     *
     * @param exitCode An exit code describing the process' exit cause, examples: `user-create-failed`, `failed`, `ok`
     */
    end(exitCode: string) {
        console.log(`[${this.tag()} ${this.type}] end!`);
        // this.spawnTask.then(({ pid }) =>
        //     fetch("https://gulog.io/api/process", {
        //         method: "PUT",
        //         body: JSON.stringify({
        //             processId: pid,
        //             token: globalSettings.token,
        //             exitCode: exitCode,
        //         }),
        //     })
        // );
    }

    tag(): string {
        if (this.parent) {
            return this.parent.tag() + " > " + this.pid;
        } else {
            return String(this.pid);
        }
    }
}

export async function spawn<T>(type: string, callback: () => Promise<[string, T?]>, initiator?: any): Promise<T> {
    let currentProcess = asyncStorage.getStore() as GulogProcess | undefined;

    let process;
    if (currentProcess === undefined) {
        process = new GulogProcess(type, initiator);
    } else {
        process = new GulogProcess(type, initiator, currentProcess);
    }

    let exitCode, result;
    try {
        [exitCode, result] = await asyncStorage.run(process, callback);

        process.end(exitCode);
        return result!;
    } catch (ex) {
        process.end("error");
        throw ex;
    }
}

export function getCurrentProcess() {
    return asyncStorage.getStore() as GulogProcess | undefined;
}
