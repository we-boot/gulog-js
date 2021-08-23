import { init, GulogProcess, spawn, getCurrentProcess } from "gulog-api";

init({
    muteConsole: false,
    token: "asdfasdf",
    version: "1.0.0",
});

async function delay(ms: number) {
    await new Promise((res) => setTimeout(res, ms));
}

spawn("create-math", async () => {
    getCurrentProcess()!.log("calculating...");
    await delay(1000);

    await Promise.all([
        spawn("more-math", async () => {
            await delay(500);
            return ["ok"];
        }),
        spawn("more-math", async () => {
            await delay(500);
            return ["ok"];
        }),
    ]);

    getCurrentProcess()!.log("calculating done");

    return ["oof", 1];
});
