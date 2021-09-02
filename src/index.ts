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

export type Severity = "info" | "warn" | "error";

function removeUndefinedFields(obj: any) {
    Object.keys(obj).forEach((key) => obj[key] === undefined && delete obj[key]);
}

export class GulogProcess {
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
    constructor(type: string, initiator?: any, parentProcess?: GulogProcess, overrideSettings?: GulogSettings) {
        this.type = type;
        this.parent = parentProcess;
        this.processId = null;
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
            body: JSON.stringify({
                softwareVersion: this.settings.version,
                token: this.settings.token,
                initiatorData: initiator,
                userAgent: agent,
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                this.processId = data.processId;
            });
    }

    private customLog(severity: Severity, data: any[]) {
        this.spawnTask.then(() =>
            fetch(this.settings.endpoint + "/api/log", {
                method: "POST",
                body: JSON.stringify({
                    data: data.length === 0 ? data[0] : data,
                    severity: severity,
                    processId: this.processId,
                    token: this.settings.token,
                }),
            })
        );
    }

    log(data: any, ...moreData: any[]) {
        this.customLog("info", [data, ...moreData]);
        if (!this.settings.muteConsole) {
            console.log(`[${this.tag()} ${this.type}] info`, data, ...moreData);
        }
    }

    info(data: any, ...moreData: any[]) {
        this.customLog("info", [data, ...moreData]);
        if (!this.settings.muteConsole) {
            console.info(`[${this.tag()} ${this.type}] info`, data, ...moreData);
        }
    }

    error(data: any, ...moreData: any[]) {
        this.customLog("error", [data, ...moreData]);
        if (!this.settings.muteConsole) {
            console.error(`[${this.tag()} ${this.type}] error`, data, ...moreData);
        }
    }

    warn(data: any, ...moreData: any[]) {
        this.customLog("warn", [data, ...moreData]);
        if (!this.settings.muteConsole) {
            console.warn(`[${this.tag()} ${this.type}] warn`, data, ...moreData);
        }
    }

    /**
     * @param exitCode An exit code describing the process' exit cause, examples: `user-create-failed`, `failed`, `ok`
     */
    end(exitCode: string) {
        console.log(`[${this.tag()} ${this.type}] end!`);
        this.spawnTask.then(() =>
            fetch(this.settings.endpoint + "/api/process", {
                method: "PUT",
                body: JSON.stringify({
                    processId: this.processId,
                    token: globalSettings.token,
                    exitCode: exitCode,
                }),
            })
        );
    }

    tag(): string {
        if (this.parent) {
            return this.parent.tag() + " > " + (this.processId || "?");
        } else {
            return String(this.processId || "?");
        }
    }
}
