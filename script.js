
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const victoryScreen = document.getElementById('victoryScreen');
const scoreDisplay = document.getElementById('scoreDisplay');
const livesDisplay = document.getElementById('livesDisplay');
const finalScoreDisplay = document.getElementById('finalScoreDisplay');
const victoryScoreDisplay = document.getElementById('victoryScoreDisplay');

const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const playAgainBtn = document.getElementById('playAgainBtn');

// Game Variables
let score = 0;
let lives = 3;
let isPlaying = false;
let animationId;
let particles = [];

// Colors
const brickColors = [
    '#ef4444', // Red
    '#f97316', // Orange
    '#eab308', // Yellow
    '#22c55e', // Green
    '#06b6d4', // Cyan
    '#8b5cf6'  // Purple
];

// Paddle properties
const paddle = {
    width: 120,
    height: 12,
    x: canvas.width / 2 - 60,
    y: canvas.height - 30,
    speed: 8,
    dx: 0,
    color: '#0ea5e9'
};

// Ball properties
const ball = {
    x: canvas.width / 2,
    y: canvas.height - 45,
    radius: 8,
    speed: 6,
    dx: 6,
    dy: -6,
    color: '#ffffff'
};

// Brick properties
const brickConfig = {
    rows: 6,
    columns: 10,
    width: 66,
    height: 22,
    padding: 10,
    offsetTop: 60,
    offsetLeft: 25
};

let bricks = [];

// Particle System for explosion effect
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 1;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function handleParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(ctx);
        if (particles[i].life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// Initialize Bricks
function initBricks() {
    bricks = [];
    for (let c = 0; c < brickConfig.columns; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickConfig.rows; r++) {
            bricks[c][r] = {
                x: 0,
                y: 0,
                status: 1,
                color: brickColors[r % brickColors.length]
            };
        }
    }
}

// Draw Paddle
function drawPaddle() {
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, 6);
    } else {
        ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height); // fallback
    }
    ctx.fillStyle = paddle.color;

    // Glow effect
    ctx.shadowBlur = 15;
    ctx.shadowColor = paddle.color;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset
    ctx.closePath();
}

// Draw Ball
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;

    // Glow effect
    ctx.shadowBlur = 10;
    ctx.shadowColor = ball.color;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset
    ctx.closePath();
}

// Draw Bricks
function drawBricks() {
    for (let c = 0; c < brickConfig.columns; c++) {
        for (let r = 0; r < brickConfig.rows; r++) {
            if (bricks[c][r].status === 1) {
                const brickX = (c * (brickConfig.width + brickConfig.padding)) + brickConfig.offsetLeft;
                const brickY = (r * (brickConfig.height + brickConfig.padding)) + brickConfig.offsetTop;

                bricks[c][r].x = brickX;
                bricks[c][r].y = brickY;

                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(brickX, brickY, brickConfig.width, brickConfig.height, 4);
                } else {
                    ctx.rect(brickX, brickY, brickConfig.width, brickConfig.height);
                }
                ctx.fillStyle = bricks[c][r].color;

                // Subtle glow for bricks
                ctx.shadowBlur = 5;
                ctx.shadowColor = bricks[c][r].color;
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.closePath();
            }
        }
    }
}

// Move Paddle
function movePaddle() {
    paddle.x += paddle.dx;

    // Wall detection
    if (paddle.x < 0) {
        paddle.x = 0;
    } else if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

// Move Ball
function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision (right/left)
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx *= -1;
    }

    // Wall collision (top)
    if (ball.y - ball.radius < 0) {
        ball.dy *= -1;
    }

    // Paddle collision
    if (
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.width &&
        ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height
    ) {
        // Put ball right above the paddle to prevent clipping/sticking inside it
        ball.y = paddle.y - ball.radius;

        // Reverse direction and adjust angle based on where it hit the paddle
        ball.dy = -ball.speed;

        // Add spin/angle based on hit position
        let hitPoint = ball.x - (paddle.x + paddle.width / 2);
        ball.dx = hitPoint * 0.15;

        // Normalize speed to prevent it from moving too fast or slow horizontally
        let speedMagnitude = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        ball.dx = (ball.dx / speedMagnitude) * ball.speed * 1.1;
        ball.dy = (ball.dy / speedMagnitude) * ball.speed * 1.1;
    }

    // Bottom collision (Lose life)
    if (ball.y + ball.radius > canvas.height) {
        lives--;
        livesDisplay.innerText = `Lives: ${lives}`;

        if (lives === 0) {
            gameOver();
        } else {
            resetBall();
        }
    }
}

// Brick Collision
function brickCollision() {
    let activeBricks = 0;

    for (let c = 0; c < brickConfig.columns; c++) {
        for (let r = 0; r < brickConfig.rows; r++) {
            const b = bricks[c][r];
            if (b.status === 1) {
                activeBricks++;

                if (
                    ball.x > b.x &&
                    ball.x < b.x + brickConfig.width &&
                    ball.y > b.y &&
                    ball.y < b.y + brickConfig.height
                ) {
                    // Reverse dy
                    ball.dy *= -1;
                    b.status = 0;
                    score += 10;
                    scoreDisplay.innerText = `Score: ${score}`;

                    // Particle explosion
                    createExplosion(ball.x, ball.y, b.color);
                }
            }
        }
    }

    // Check for victory
    if (activeBricks === 0) {
        victory();
    }
}

// Reset Ball and Paddle
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = paddle.y - 15;
    // Randomize initial direction slightly
    ball.dx = 4 * (Math.random() > 0.5 ? 1 : -1);
    ball.dy = -4;

    paddle.x = canvas.width / 2 - paddle.width / 2;
}

// Draw everything
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBricks();
    drawPaddle();
    drawBall();
    handleParticles();
}

// Update canvas
function update() {
    if (!isPlaying) return;

    movePaddle();
    moveBall();
    brickCollision();
    draw();

    animationId = requestAnimationFrame(update);
}

// Keydown event
document.addEventListener('keydown', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight') {
        paddle.dx = paddle.speed;
    } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
        paddle.dx = -paddle.speed;
    }
});

// Keyup event
document.addEventListener('keyup', (e) => {
    if (e.key === 'Right' || e.key === 'ArrowRight' || e.key === 'Left' || e.key === 'ArrowLeft') {
        paddle.dx = 0;
    }
});

// Mouse movement inside canvas bounding client rect
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    // Calculate scaling if canvas is resized via CSS
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    if (mouseX > 0 && mouseX < canvas.width) {
        paddle.x = mouseX - paddle.width / 2;

        // Wall detection for mouse
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
    }
});

// Game Over
function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    gameOverScreen.classList.remove('hidden');
    finalScoreDisplay.innerText = score;
}

// Victory
function victory() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    victoryScreen.classList.remove('hidden');
    victoryScoreDisplay.innerText = score;
}

// Start Game
function startGame() {
    initBricks();
    score = 0;
    lives = 3;
    scoreDisplay.innerText = `Score: ${score}`;
    livesDisplay.innerText = `Lives: ${lives}`;
    particles = [];
    resetBall();

    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    victoryScreen.classList.add('hidden');

    isPlaying = true;
    update();
}

// Event Listeners for Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
playAgainBtn.addEventListener('click', startGame);

// Initial draw
initBricks();
draw();

