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
    let process = new GulogProcess("calculate-math", { name: "stijn rogiest" });
    process.log("starting...");

    let times = Math.random() * 10 + 2;
    for (let i = 0; i < times; i++) {
        if (Math.random() < 0.4) {
            process.warn("calculate takes longer than expected");
            await delay(1000);
            if (Math.random() < 0.4) {
                process.error("could not calculate", { value: Math.random() });
                await delay(1000);
                continue;
            }
        }
        process.log("calculating ...", i, times);
        await delay(1000);
    }

    process.log("calculating done");
    await delay(1000);

    process.end("ok");
}

main();
main();
