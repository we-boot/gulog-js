import fetch from "node-fetch";

export type InitiatorData = {
    /**
     * When userAgent, gulog will detect device type, model ... from this
     */
    userAgent?: string;
    [key: string]: any;
};

export interface Settings {
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

let globalSettings: Required<Settings>;

export function init(settings: Settings) {
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

export class Process<T extends string = string> {
    processId?: number;
    softwareId?: number;
    spawnTask!: Promise<void>; // this promise will fill in processId and softwareId
    settings: Required<Settings>;

    /**
     * @param type The type of process to create, for example:  `user-create`, `project-edit` ...
     * @param initiator Custom data about the initiator of this process. Examples: user, token
     * @param parentProcess The parent process that initiated this process.
     */
    constructor(public type: T, public initiator?: InitiatorData, public parentProcess?: Process, overrideSettings: Partial<Settings> = {}) {
        if (!globalSettings) {
            throw new Error("Please call Gulog.init() before spawning any process");
        }
        removeUndefinedFields(overrideSettings);
        this.settings = {
            ...globalSettings,
            ...overrideSettings,
        };

        let timestamp = new Date().getTime();
        if (parentProcess) {
            this.spawnTask = parentProcess.spawnTask.then(() => this.spawn(timestamp));
        } else {
            this.spawnTask = this.spawn(timestamp);
        }
    }

    private async spawn(timestamp: number) {
        let agent = "";
        if ("navigator" in globalThis && "userAgent" in globalThis.navigator) {
            agent = globalThis.navigator.userAgent;
        }

        let res = await fetch(this.settings.endpoint + "/api/process", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                timestamp,
                name: this.type,
                parentProcessId: this.parentProcess?.processId,
                parentSoftwareId: this.parentProcess?.softwareId,
                softwareVersion: this.settings.version,
                token: this.settings.token,
                initiatorData: { userAgent: agent, ...this.initiator },
            }),
        });

        if (res.ok) {
            let data = await res.json();
            this.processId = data.processId;
            this.softwareId = data.softwareId;
        } else {
            console.error("could not create gulog process: " + (await res.text()));
        }

        if (!this.settings.muteConsole) {
            console.log(`[${this.toString()}] spawned`);
        }
    }

    private async customLog(severity: Severity, data: any[]) {
        let timestamp = new Date().getTime();

        // Wait for processId
        await this.spawnTask;

        if (!this.settings.muteConsole) {
            switch (severity) {
                default:
                case Severity.Info:
                    console.log(`[${this.toString()}] info`, ...data);
                    break;
                case Severity.Warn:
                    console.warn(`[${this.toString()}] warn`, ...data);
                    break;
                case Severity.Error:
                    console.error(`[${this.toString()}] error`, ...data);
                    break;
            }
        }

        let res = await fetch(this.settings.endpoint + "/api/log", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                timestamp,
                data: data.length === 0 ? data[0] : data,
                severity: severity,
                processId: this.processId,
                token: this.settings.token,
            }),
        });

        if (!res.ok) {
            console.warn("could not log to gulog:", await res.text(), res.status);
        }
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
     * @param exitCode An exit code describing the process exit cause, examples: `user-create-failed`, `failed`, `ok` or its number id.
     */
    end(exitCode: string | number) {
        let timestamp = new Date().getTime();
        this.spawnTask.then(() =>
            fetch(this.settings.endpoint + "/api/process", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    timestamp,
                    processId: this.processId,
                    token: this.settings.token,
                    exitCode: exitCode,
                }),
            })
                .then(async (res) => {
                    if (!res.ok) {
                        console.warn("could not end gulog process:", await res.text());
                    }
                })
                .finally(() => {
                    if (!this.settings.muteConsole) {
                        console.log(`[${this.toString()}] ended (${exitCode})`);
                    }
                })
        );
    }

    /**
     * Creates a new process, with this process set as its parent
     * @param type The type of process to create, for example: `user-create`, `project-edit` ...
     * @param initiator Custom data about the initiator of this process. Examples: user, token
     */
    fork<T extends string = string>(type: T, initiator?: InitiatorData): Process<T> {
        return new Process(type, initiator, this);
    }

    toString(): string {
        if (this.parentProcess) {
            return this.parentProcess.toString() + ">" + `${this.type}:${this.processId || "?"}`;
        } else {
            return `${this.type}:${this.processId || "?"}`;
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
    initiator?: InitiatorData,
    parentProcess?: Process,
    overrideSettings: Partial<Settings> = {}
) {
    return new Process<T>(type, initiator, parentProcess, overrideSettings);
}
