const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const centerX = WIDTH / 2;
const centerY = 960;

let lastTime;
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

let oil = 100;
let score = 0;
let gameOver = false;
let gameWon = false;
let gameTimer = 60;

function makeContact({
    id,
    name,
    bearingDeg,
    distance,
    spawnAt,
    resolveTime,
    windowTime,
}) {
    return {
        id,
        name,
        angle: -Math.PI + (bearingDeg / 180) * Math.PI,
        distance,
        spawnAt,
        resolveTime,
        windowTime,
        oilRate: 4 + distance / 50,
        // runtime state
        spawned: false,
        resolveProgress: 0,
        timeLeft: windowTime,
        state: "pending",
        pulsePhase: 0,
        litGlow: 0,
    };
}

const night1Script = [
    makeContact({
        id: "unknown-1",
        name: null,
        bearingDeg: 110,
        distance: 350,
        spawnAt: 0,
        resolveTime: 5,
        windowTime: 10,
    }),
    makeContact({
        id: "merrow",
        name: "MERROW",
        bearingDeg: 50,
        distance: 250,
        spawnAt: 25,
        resolveTime: 4,
        windowTime: 18,
    }),
];

let activeContacts = [];
let spawnTimer = 0;
let reloadTriggered = false;

function updateSpawns(dt) {
    spawnTimer -= dt;
    if (spawnTimer <= 0) {
        const bearingDeg = 20 + Math.random() * 140;
        const newShip = makeContact({
            id: "ship-" + Math.random(),
            name: "NAV",
            bearingDeg: bearingDeg,
            distance: 200 + Math.random() * 400,
            spawnAt: 0,
            resolveTime: 3 + Math.random() * 2,
            windowTime: 7 + Math.random() * 5,
        });
        newShip.state = "active"
        activeContacts.push(newShip)
        spawnTimer = 3 + Math.random() * 3;
    }
}

function contactPosition(c, centerX, centerY) {
    return {
        x: centerX + c.distance * Math.cos(c.angle),
        y: centerY + c.distance * Math.sin(c.angle),
    };
}

const BEAM_HALF_ANGLE = Math.PI / 9 / 2;

function isBeamOnContact(beamAngle, contactAngle) {
    let diff = Math.abs(beamAngle - contactAngle);
    if (diff > Math.PI) {
        diff = Math.PI * 2 - diff;
    }
    return diff <= BEAM_HALF_ANGLE;
}

function updateContacts(dt, beamAngle) {
    for (const c of activeContacts) {
        if (c.state !== "active") continue;

        c.timeLeft -= dt;
        if (c.timeLeft <= 0) {
            c.state = "lost"; // what have you done
            continue;
        }

        const urgency = 1 - c.timeLeft / c.windowTime;
        const pulseSpeed = 2 + urgency * 6;
        c.pulsePhase += pulseSpeed * dt;

        const lit = isBeamOnContact(beamAngle, c.angle);
        if (lit) {
            c.resolveProgress += dt / c.resolveTime;
            c.litGlow = Math.min(1, c.litGlow + dt * 5);
            // drain oil later
            if (c.resolveProgress >= 1) {
                c.state = "resolved";
            }
        } else {
            c.resolveProgress = Math.max(
                0,
                c.resolveProgress - (dt / c.resolveTime) * 0.5,
            );
            c.litGlow = Math.max(0, c.litGlow - dt * 5);
        }
    }
   activeContacts = activeContacts.filter((c) => c.state == "active" || (c.state == "resolved" && !c.counted));
}

function drawContact(c, centerX, centerY) {
    const { x, y } = contactPosition(c, centerX, centerY);
    const pulse = 0.5 + 0.5 * Math.sin(c.pulsePhase);

    const urgency = 1 - c.timeLeft / c.windowTime;
    const dotRadius = 10 + c.resolveProgress * 18;
    const dotAlpha = 0.2 + 0.3 * pulse;

    const r = Math.round(200 + c.resolveProgress * 55);
    const g = Math.round(210 + c.resolveProgress * 30);
    const b = Math.round(210 - c.resolveProgress * 60);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    const dotGrad = ctx.createRadialGradient(x, y, 0, x, y, dotRadius);
    dotGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${dotAlpha})`); // I'm not doing + for all of this
    dotGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = dotGrad;
    ctx.beginPath();
    ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    if (c.litGlow > 0.01) {
        // const boatAlpha = c.litGlow * (0.5 + 0.5 * c.resolveProgress);
        ctx.globalCompositeOperation = "source-over"; // default so it doesn't get transparent
        ctx.fillStyle = "rgba(10, 10, 20, 0.9)"; 
        // boat silhouete
        ctx.beginPath();
        ctx.arc(x, y + 2, 16, 0, Math.PI, false);
        ctx.fill();

        ctx.fillRect(x - 8, y - 9, 11, 12);
    }
    ctx.restore();
}

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

    gradient.addColorStop(0, "rgba(255, 215, 120, 0.45)");
    gradient.addColorStop(0.25, "rgba(255, 180, 80, 0.2)");
    gradient.addColorStop(1, "rgba(255, 140, 50, 0)");

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.clip();
    drawGlints(time); // so they only appear in the cone clip, if they're enlightned
    drawBrightWaves(time); // same

    ctx.restore(); //reset composite and clip
}

function updateGameLogic(dt, targetAngle) {
    if (gameOver || gameWon) {
        return;
    }

    gameTimer -= dt;
    if (gameTimer <= 0) {
        gameWon = true;
        triggerReload();
        return;
    }

    let isAnyContactLit = false;
    for (const c of activeContacts) {
        if (isBeamOnContact(targetAngle, c.angle)) {
            isAnyContactLit = true;
            break;
        }
    }

    const drainRate = isAnyContactLit ? 4 : 1;
    oil = Math.max(0, oil - drainRate * dt);
    if (oil <= 0) {
        gameOver = true;
    }

    for (const c of activeContacts) {
    if (c.state === "resolved" && !c.counted) {
        score += 100;
        oil = Math.min(100, oil + 10);
        c.counted = true;
    }
}
}

function triggerReload() {
    if (reloadTriggered) return;
    reloadTriggered = true;
    setTimeout(() => window.location.reload(), 3000);
}

function drawHUD() {
    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.font = "16px monospace";

    ctx.fillText("oil: " + Math.round(oil) + "%", 20, 30);
    ctx.fillText(
        "time remaining: " + Math.ceil(Math.max(0, gameTimer)) + "s",
        20,
        55,
    );
    ctx.fillText("score: " + score, 20, 80);

    if (gameOver) {
        ctx.fillStyle = "rgba(0, 0,0,0.8)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "#7a1a1a";
        ctx.font = "32px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LIGHTS OUT", WIDTH / 2, HEIGHT / 2); // just game over doesn't mean something else
        ctx.font = "14px monospace";
        ctx.fillText("RESTARTING IN 3s...", WIDTH / 2, HEIGHT / 2 + 40);
    } else if (gameWon) {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        ctx.fillStyle = "#208755";
        ctx.font = "32px monospace";
        ctx.textAlign = "center";
        ctx.fillText("THE NIGHT ENDED, THE LIGHT RISES", WIDTH / 2, HEIGHT / 2); // that the best I could find
        ctx.font = "14px monospace";
        ctx.fillText("RESTARTING IN 3s...", WIDTH / 2, HEIGHT / 2 + 40);
    }
    ctx.restore();
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
    ctx.save();
    drawCoastlinePath(centerY, 0);
    ctx.fillStyle = "#3e3a38";
    ctx.fill();
    ctx.restore();
}

function renderGame(targetAngle) {
    // Waves
    drawAmbientWaves(time);

    // Beam
    drawLightbeam(centerX, centerY, targetAngle);

    for (const c of activeContacts) {
        drawContact(c, centerX, centerY);
    }

    // Coastline land
    drawLand(centerY);

    // Lighthouse
    ctx.fillStyle = "#600";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 70, 0, Math.PI * 2);
    ctx.fill();
}

function render(targetAngle) {
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    renderGame(targetAngle);
    drawHUD();
}

function mainLoop(currentTime) {
    if (!lastTime) {
        lastTime = currentTime;
    }
    const delta = (currentTime - lastTime) / 1000;
    lastTime = currentTime;
    time += delta;

    const dx = mouse.x - centerX;
    const dy = mouse.y - centerY;
    let targetAngle;
    if (dy >= 0) {
        targetAngle = dx >= 0 ? -0.001 : -Math.PI + 0.001;
    } else {
        targetAngle = Math.atan2(dy, dx);
    }

    if (!gameOver && !gameWon) {
        updateSpawns(delta);
        updateContacts(delta, targetAngle);
        updateGameLogic(delta, targetAngle);
    }

    ctx.clearRect(0, 0, WIDTH, HEIGHT);

    render(targetAngle);

    requestAnimationFrame(mainLoop);
}

requestAnimationFrame(mainLoop);
