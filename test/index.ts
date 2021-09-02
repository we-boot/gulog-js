import { init, GulogProcess } from "gulog-js";

init({
    token: "pm6t6du6pCKgefUYdM",
    version: "1.0.0",
    endpoint: "http://localhost:3000",
});

async function delay(ms: number) {
    await new Promise((res) => setTimeout(res, ms));
}

async function main() {
    let process = new GulogProcess("calculate-math");
    process.log("starting...");

    let times = Math.random() * 10 + 2;
    for (let i = 0; i < times; i++) {
        process.log("calculating ...", i, times);
        await delay(1000);
    }

    process.log("calculating done");
    await delay(1000);

    process.end("ok");
}

main();
