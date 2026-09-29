const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let lastTime;
let lastTargetAngle = -Math.PI / 2;
let time = 0;

let mouse = { x: WIDTH / 2, y: 0 };
const glints = Array.from({ length: 250 }, () => ({
    // had to relearn how to do it without a for loop
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    len: 3 + Math.random() * 10,
    offset: Math.random() * Math.PI * 2, // full cylce with sin
    alpha: 0.2 + Math.random() * 0.5,
}));

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

    ctx.clip();
    drawGlints(time); // so they only appear in the cone clip, if they're enlightned
    drawBrightWaves(time); // same

    ctx.restore(); //reset composite and clip
}

function drawAmbientWaves(time) {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(40, 80, 110, 0.15)";

    for (let y = 0; y < HEIGHT; y += 20) {
        ctx.beginPath();

        for (let x = 0; x <= WIDTH; x += 10) {
            const waveY =
                y +
                Math.sin(x * 0.015 + time * 0.8 + y * 0.03) * 3 +
                Math.sin(x * 0.03 - time * 0.5) * 0.12;

            if (x == 0) {
                ctx.moveTo(x, waveY);
            } else {
                ctx.lineTo(x, waveY);
            }
        }
        ctx.stroke();
    }

    ctx.restore();
}

function drawBrightWaves(time) {
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(120, 210, 255, 0.25)";

    for (let y = 0; y < HEIGHT; y += 22) {
        ctx.beginPath();

        for (let x = 0; x <= WIDTH; x += 6) {
            const waveY =
                y +
                Math.sin(x * 0.02 + time * 1.5 + y * 0.04) * 3 +
                Math.sin(x * 0.04 - time * 0.9) * 1.5;

            if (x == 0) {
                ctx.moveTo(x, waveY);
            } else {
                ctx.lineTo(x, waveY);
            }
        }
        ctx.stroke();
    }
}

function drawGlints(time) {
    ctx.lineWidth = 1;

    for (const g of glints) {
        const x = (g.x + Math.sin(time * 0.5 + g.offset) * 6 + WIDTH) % WIDTH;
        const y = g.y + Math.sin(time * 0.7 + g.offset) * 2;

        const currentAlpha =
            g.alpha *
            (0.3 + 0.7 * Math.pow(Math.sin(time * 2.5 + g.offset), 2));

        ctx.strokeStyle = "rgba(255, 245, 200, " + currentAlpha + ")";
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + g.len, y - 0.5);
        ctx.stroke();
    }
}

function drawCoastlinePath(centerY, offset) {
    ctx.beginPath();
    ctx.moveTo(0, HEIGHT);

    for (let x = 0; x <= WIDTH; x += 15) {
        const shoreY =
            centerY +
            Math.sin(x * 0.003) * 50 +
            Math.cos(x * 0.012) * 20 +
            offset;
        ctx.lineTo(x, shoreY);
    }
    ctx.lineTo(WIDTH, HEIGHT);
    ctx.closePath();
}

function drawLand(centerY) {
    ctx.save()
    drawCoastlinePath(centerY, 0);
    ctx.fillStyle = "#3e3a38";
    ctx.fill();
    ctx.restore()
}

function renderGame() {
    const centerX = WIDTH / 2;
    const centerY = 960;

    
    // Waves
    drawAmbientWaves(time);
    
    // Beam
    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;
    let targetAngle = Math.atan2(dy, dx);
    if (targetAngle > 0) {
        targetAngle = targetAngle < Math.PI ? lastTargetAngle : -Math.PI;
    }
    lastTargetAngle = targetAngle;
    drawLightbeam(centerX, centerY, targetAngle);

    // Coastline land
    drawLand(centerY);

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
    time += delta;

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    render();

    requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);
