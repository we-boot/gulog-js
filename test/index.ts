import { init, GulogProcess } from "gulog-js";

init({
    token: "pm6t6du6pCKgefUYdM",
    version: "1.0.0",
    endpoint: "http://localhost:3000"
});

async function delay(ms: number) {
    await new Promise((res) => setTimeout(res, ms));
}

async function main() {
    let process = new GulogProcess("calculate-math");
    process.log("starting...");

    await delay(1000);

    process.log("calculating done");

    process.end("ok");
}

main();