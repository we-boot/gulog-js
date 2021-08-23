const { init } = require("gulog-api");

init({
    muteConsole: false,
    token: "asdfasdf",
    version: "1.0.0",
});

async function test() {
    let testId = Math.floor(Math.random() * 100);

    console.log("started", testId);
    await new Promise((res) => setTimeout(res, Math.random() * 2000 + 600));
    console.log("ended", testId);
}

test();
test();
test();
test();
