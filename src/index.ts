import fetch from "node-fetch";

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
    muteConsole?: boolean;
    endpoint?: string;
}

let globalSettings: Required<GulogSettings>;

export function init(settings: GulogSettings) {
    removeUndefinedFields(settings);
    globalSettings = {
        endpoint: "https://gulog.io",
        muteConsole: false,
        ...settings,
    };
}

export enum Severity {
    Info = 0,
    Success = 5,
    Warn = 10,
    Error = 20,
    Critical = 30,
}

function removeUndefinedFields(obj: any) {
    Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);
}

export class GulogProcess<T extends string = string> {
    processId: number | null;
    spawnTask!: Promise<void>;
    type: string;
    parent?: GulogProcess;
    settings: Required<GulogSettings>;

    /**
     * @param type The type of process to create, for example:  `user-create`, `project-edit` ...
     * @param initiator Custom data about the initiator of this process. Examples: user, token
     * @param parentProcess The parent process that initiated this process.
     */
    constructor(type: T, initiator?: object, parentProcess?: GulogProcess, overrideSettings: Partial<GulogSettings> = {}) {
        this.type = type;
        this.parent = parentProcess;
        this.processId = null;

        if (!globalSettings) {
            throw new Error("Please call Gulog.init() before spawning any process");
        }
        removeUndefinedFields(overrideSettings);
        this.settings = {
            ...globalSettings,
            ...overrideSettings,
        };

        let agent = "";
        if ("navigator" in globalThis && "userAgent" in globalThis.navigator) {
            agent = globalThis.navigator.userAgent;
        }

        this.spawnTask = fetch(this.settings.endpoint + "/api/process", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: type,
                softwareVersion: this.settings.version,
                token: this.settings.token,
                initiatorData: initiator,
                userAgent: agent,
            }),
        }).then(async (res) => {
            if (res.ok) {
                let data = await res.json();
                this.processId = data.processId;
            } else {
                console.error("could not create gulog process: " + (await res.text()));
            }
        });
    }

    private customLog(severity: Severity, data: any[]) {
        this.spawnTask
            .then(() =>
                fetch(this.settings.endpoint + "/api/log", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        data: data.length === 0 ? data[0] : data,
                        severity: severity,
                        processId: this.processId,
                        token: this.settings.token,
                    }),
                })
            )
            .then(async (res) => {
                if (!res.ok) {
                    console.warn("could not log to gulog:", await res.text(), res.status);
                }
            })
            .finally(() => {
                if (!this.settings.muteConsole) {
                    switch (severity) {
                        default:
                        case Severity.Info:
                            console.log(`[${this.toString()}] info`, ...data);
                            return;
                        case Severity.Warn:
                            console.warn(`[${this.toString()}] warn`, ...data);
                            return;
                        case Severity.Error:
                            console.error(`[${this.toString()}] error`, ...data);
                            return;
                    }
                }
            });
        return this;
    }

    log(data: any, ...moreData: any[]) {
        this.customLog(Severity.Info, [data, ...moreData]);
        return this;
    }

    info(data: any, ...moreData: any[]) {
        this.customLog(Severity.Info, [data, ...moreData]);
        return this;
    }

    error(data: any, ...moreData: any[]) {
        this.customLog(Severity.Error, [data, ...moreData]);
        return this;
    }

    warn(data: any, ...moreData: any[]) {
        this.customLog(Severity.Warn, [data, ...moreData]);
        return this;
    }

    /**
     * @param exitCode An exit code describing the process' exit cause, examples: `user-create-failed`, `failed`, `ok`
     */
    end(exitCode: string) {
        console.log(`[${this.toString()}] end!`);
        this.spawnTask.then(() =>
            fetch(this.settings.endpoint + "/api/process", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    processId: this.processId,
                    token: this.settings.token,
                    exitCode: exitCode,
                }),
            }).then(async (res) => {
                if (!res.ok) {
                    console.warn("could not end gulog process:", await res.text());
                }
            })
        );
    }

    toString(): string {
        if (this.parent) {
            return this.parent.toString() + " > " + `${this.type}#${this.processId || "?"}`;
        } else {
            return `${this.type}#${this.processId || "?"}`;
        }
    }
}

/**
 * @param type The type of process to create, for example:  `user-create`, `project-edit` ...
 * @param initiator Custom data about the initiator of this process. Examples: user, token
 * @param parentProcess The parent process that initiated this process.
 */
export function spawn<T extends string = string>(
    type: T,
    initiator?: object,
    parentProcess?: GulogProcess,
    overrideSettings: Partial<GulogSettings> = {}
) {
    return new GulogProcess<T>(type, initiator, parentProcess, overrideSettings);
}
