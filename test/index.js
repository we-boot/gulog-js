const { init, GulogProcess } = require("gulog-api");
const { AsyncLocalStorage } = require("async_hooks");

init({
    muteConsole: false,
    token: "asdfasdf",
    version: "1.0.0",
});

// async function test() {
//     let testId = Math.floor(Math.random() * 100);

//     spawn("calculate-test");

//     getCurrentProcess().log("starting", testId);

//     // console.log("started", testId, hooks.executionAsyncId());
//     await new Promise((res) => setTimeout(res, Math.random() * 2000 + 600));
//     // console.log("ended", testId, hooks.executionAsyncId());

//     getCurrentProcess().log("ended", testId);

//     end("ok");

//     if (Math.random() < 0.3) {
//         test();
//         //        test();
//     }
// }

// test();
// test();
// test();

// console.log(contextMap);

class State {
    parent;
    value;

    constructor(value, parent) {
        this.value = value;
        this.parent = parent;
    }
}

let storage = new AsyncLocalStorage();

async function log(...args) {
    console.log(`[${storage.getStore().join(">")}]`, ...args);
}

async function delay(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

async function test() {
    let r = Math.random();
    log("generating...", r);

    await delay(Math.random() * 1000);

    if (storage.getStore()[0] === 4) {
        begin();
        log("calc four");
        await delay(1000);
        log("four done");
        end();
    }

    log("done", r);
}

let counter = 0;

function begin() {
    let current = storage.getStore() || [];
    counter++;
    storage.enterWith([...current, counter]);
}

function end() {
    let current = storage.getStore();
    storage.enterWith(current.slice(0, -1));
}

begin();
test();
end();

begin();
test();
end();

begin();
test();
end();

begin();
test();
end();
