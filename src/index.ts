import hooks from "async_hooks";

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

export function init(settings: GulogSettings) {
    globalSettings = settings;

    if (hooks) {
        console.log("[gulog] Detected nodejs: using async_hooks to create 'thread-local' storage.");
    }
}

export type Severity = "info" | "warn" | "error";

export class GulogProcess {
    pid: number | undefined;
    spawnTask: Promise<{ pid: number }>;
    type: string;

    /**
     * @param type The type of process to create, for example:  `user-create`, `project-edit` ...
     * @param initiator Custom data about the initiator of this process. Examples: user, token
     */
    constructor(type: string, initiator?: any) {
        this.type = type;

        let agent = "";
        if ("navigator" in globalThis && "userAgent" in globalThis.navigator) {
            agent = globalThis.navigator.userAgent;
        }

        this.spawnTask = fetch(`https://gulog.io/api/process`, {
            method: "POST",
            body: JSON.stringify({
                softwareVersion: globalSettings.version,
                token: globalSettings.token,
                initiatorData: initiator,
                userAgent: agent,
            }),
        }).then((res) => res.json());
    }

    private customLog(severity: Severity, data: any[]) {
        let str = data.map((e) => (typeof data === "object" ? JSON.stringify(e) : String(e))).join(" ");
        this.spawnTask.then(({ pid }) =>
            fetch("https://gulog.io/api/log", {
                method: "POST",
                body: JSON.stringify({
                    data: str,
                    severity: severity,
                    processId: pid,
                    token: globalSettings.token,
                }),
            })
        );
    }

    log(data: any, ...moreData: any[]) {
        this.customLog("info", [data, ...moreData]);
        if (!globalSettings.muteConsole) {
            console.log(data, ...moreData);
        }
    }

    info(data: any, ...moreData: any[]) {
        this.customLog("info", [data, ...moreData]);
        if (!globalSettings.muteConsole) {
            console.info(data, ...moreData);
        }
    }

    error(data: any, ...moreData: any[]) {
        this.customLog("error", [data, ...moreData]);
        if (!globalSettings.muteConsole) {
            console.error(data, ...moreData);
        }
    }

    warn(data: any, ...moreData: any[]) {
        this.customLog("warn", [data, ...moreData]);
        if (!globalSettings.muteConsole) {
            console.warn(data, ...moreData);
        }
    }

    /**
     *
     * @param exitCode An exit code describing the process' exit cause, examples: `user-create-failed`, `failed`, `ok`
     */
    end(exitCode: string) {
        this.spawnTask.then(({ pid }) =>
            fetch("https://gulog.io/api/process", {
                method: "PUT",
                body: JSON.stringify({
                    processId: pid,
                    token: globalSettings.token,
                    exitCode: exitCode,
                }),
            })
        );
    }
}
