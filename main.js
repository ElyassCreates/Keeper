const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let lastTime;
let lastTargetAngle = -Math.PI/2;

let mouse = { x: WIDTH / 2, y: 0 };

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    // css doesn't always display exactly the original canvas size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
});

function drawLightbeam(centerX, centerY, angle) {
    const beamLength = 1360; // pythagorean theorem
    const beamAngle = Math.PI / 9; // 20 deg, why does js use radians

    ctx.save();

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(
        centerX,
        centerY,
        beamLength,
        angle - beamAngle / 2,
        angle + beamAngle / 2,
    );
    ctx.closePath();

    const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        70,
        centerX,
        centerY,
        beamLength,
    );
    gradient.addColorStop(0, "rgba(254, 238, 174, 0.8)");
    gradient.addColorStop(0.3, "rgba(255, 220, 120, 0.3)"); //absolutely necessary
    gradient.addColorStop(1, "rgba(255, 200, 100, 0)");

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.restore(); // to not change the other drawings styles (globalCompositeOperation)
}

function renderGame() {
    const centerX = WIDTH / 2;
    const centerY = 960;

    // Beam
    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;
    let targetAngle = Math.atan2(dy, dx);
    if (targetAngle > 0) {
        targetAngle = targetAngle < Math.PI ? lastTargetAngle : -Math.PI;
    }
    lastTargetAngle = targetAngle
    
    drawLightbeam(centerX, centerY, targetAngle);

    // Lighthouse
    ctx.fillStyle = "#600";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 70, 0, Math.PI * 2);
    ctx.fill();
}

function render() {
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    renderGame();
}

function mainLoop(currentTime) {
    if (!lastTime) {
        lastTime = currentTime;
    }
    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    render();

    requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);
