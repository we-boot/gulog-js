import { init, GulogProcess } from "gulog-js";

init({
    token: "asdfasdf",
    version: "1.0.0",
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
