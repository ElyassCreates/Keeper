const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let b = 0;
let lastTime = 0;

function render() {
    ctx.fillStyle = "#112";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.fillStyle = "hsl(" + b + "deg, 100%, 50%)";
    ctx.fillRect((WIDTH - 100) / 2, (HEIGHT - 100) / 2, 100, 100);
}

function mainLoop(currentTime) {
    if (lastTime == 0) {
        lastTime = currentTime;
    }
    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    b = (b + (360 / 5) * delta) % 360; // loop in 5 seconds

    render();

    requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);
