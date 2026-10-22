/**
 * JOJO: DIAMOND RUN! (Versão Corrigida)
 * Canvas 2D Engine com Movimento de Paralaxe Contínuo em Morioh,
 * Renderização Arredondada de Ângelo / Aqua Necklace e Detalhes de Josuke & Stand.
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const overlay = document.getElementById('gameOverlay');
    const overlayTitle = document.getElementById('overlayTitle');
    const overlayInstructions = document.getElementById('overlayInstructions');
    const scoreDisplayContainer = document.getElementById('scoreDisplayContainer');
    const finalScoreEl = document.getElementById('finalScore');
    const highScoreOverlayEl = document.getElementById('highScoreOverlay');
    const savedHighScoreEl = document.getElementById('savedHighScore');
    const startBtn = document.getElementById('startBtn');
    const soundToggle = document.getElementById('soundToggle');

    // Configurações do Jogo
    const GAME_HEIGHT = 400;
    const GAME_WIDTH = 900;
    const GROUND_Y = 320;
    const VICTORY_SCORE = 1000;

    let soundEnabled = true;
    let gameState = 'START'; // START, PLAYING, GAMEOVER, VICTORY
    let score = 0;
    let highScore = parseInt(localStorage.getItem('jojo_diamond_highscore')) || 0;
    let gameSpeed = 6;
    let frameCount = 0;

    savedHighScoreEl.textContent = highScore;

    // =========================================
    // SISTEMA DE ÁUDIO SINTÉTICO (Web Audio API)
    // =========================================
    let audioCtx = null;
    let bgmInterval = null;

    function initAudio() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }

    function playSound(type) {
        if (!soundEnabled || !audioCtx) return;
        const now = audioCtx.currentTime;

        if (type === 'jump') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(500, now + 0.15);
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'crazyDiamond') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.25);
            gain.gain.setValueAtTime(0.4, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } else if (type === 'hit') {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.linearRampToValueAtTime(30, now + 0.35);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.35);
        } else if (type === 'victory') {
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, idx) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.1);
                gain.gain.setValueAtTime(0.3, now + idx * 0.1);
                gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.1 + 0.3);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.3);
            });
        }
    }

    let bgmStep = 0;
    const bassNotes = [110, 110, 130.81, 110, 146.83, 130.81, 110, 164.81];
    function startBGM() {
        if (bgmInterval) clearInterval(bgmInterval);
        bgmStep = 0;
        bgmInterval = setInterval(() => {
            if (!soundEnabled || !audioCtx || gameState !== 'PLAYING') return;
            const now = audioCtx.currentTime;
            
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            const freq = bassNotes[bgmStep % bassNotes.length];
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.12);

            if (bgmStep % 2 === 1) {
                const gOsc = audioCtx.createOscillator();
                const gGain = audioCtx.createGain();
                gOsc.type = 'square';
                gOsc.frequency.setValueAtTime(440, now);
                gGain.gain.setValueAtTime(0.08, now);
                gGain.gain.linearRampToValueAtTime(0.01, now + 0.08);
                gOsc.connect(gGain);
                gGain.connect(audioCtx.destination);
                gOsc.start(now);
                gOsc.stop(now + 0.08);
            }

            bgmStep++;
        }, 150);
    }

    function stopBGM() {
        if (bgmInterval) {
            clearInterval(bgmInterval);
            bgmInterval = null;
        }
    }

    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
    });

    // =========================================
    // PROTAGONISTA: JOSUKE HIGASHIKATA & CRAZY DIAMOND
    // =========================================
    const player = {
        x: 100,
        y: GROUND_Y - 70,
        width: 45,
        height: 70,
        vy: 0,
        gravity: 0.75,
        jumpPower: -15,
        isGrounded: true,
        canDoubleJump: false,
        standActive: false,
        standTimer: 0,

        jump() {
            if (this.isGrounded) {
                this.vy = this.jumpPower;
                this.isGrounded = false;
                this.canDoubleJump = true;
                playSound('jump');
                createParticles(this.x + this.width / 2, this.y + this.height, '#00ffcc', 8);
                spawnTextEffect(this.x, this.y - 10, 'JUMP!');
            } else if (this.canDoubleJump) {
                this.vy = this.jumpPower * 0.85;
                this.canDoubleJump = false;
                this.standActive = true;
                this.standTimer = 25;
                playSound('crazyDiamond');
                createParticles(this.x + this.width / 2, this.y + this.height / 2, '#ff007f', 15);
                spawnTextEffect(this.x - 15, this.y - 25, 'DORARARA!');
            }
        },

        update() {
            this.vy += this.gravity;
            this.y += this.vy;

            if (this.y >= GROUND_Y - this.height) {
                this.y = GROUND_Y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            }

            if (this.standTimer > 0) {
                this.standTimer--;
                if (this.standTimer === 0) this.standActive = false;
            }
        },

        draw() {
            ctx.save();

            // Stand Crazy Diamond (Aura Flutuante Atrás do Jogador)
            if (this.standActive || !this.isGrounded) {
                ctx.save();
                ctx.shadowBlur = 18;
                ctx.shadowColor = '#ff007f';
                
                const cdX = this.x - 22 + Math.sin(frameCount * 0.2) * 4;
                const cdY = this.y - 30 + Math.cos(frameCount * 0.2) * 4;

                ctx.fillStyle = 'rgba(255, 0, 128, 0.45)';
                ctx.beginPath();
                ctx.ellipse(cdX + 25, cdY + 35, 30, 42, 0, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#00ffcc';
                ctx.fillRect(cdX + 15, cdY + 15, 20, 8);
                ctx.fillRect(cdX + 10, cdY + 30, 10, 15);
                ctx.restore();
            }

            // Sombra no Chão
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(this.x + this.width / 2, GROUND_Y, 20, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Josuke Higashikata - Uniforme Gakuran Azul Marinho
            ctx.fillStyle = '#0b132b';
            
            // Pernas
            if (this.isGrounded) {
                const legOffset = Math.sin(frameCount * 0.3) * 10;
                ctx.fillRect(this.x + 10 + legOffset, this.y + 45, 10, 25);
                ctx.fillRect(this.x + 25 - legOffset, this.y + 45, 10, 25);
            } else {
                ctx.fillRect(this.x + 8, this.y + 40, 12, 20);
                ctx.fillRect(this.x + 22, this.y + 45, 15, 15);
            }

            // Torso
            ctx.fillRect(this.x + 10, this.y + 18, 26, 28);

            // Detalhes Dourados (Broches de Coração/Âncora e Zíper)
            ctx.fillStyle = '#ffe600';
            ctx.fillRect(this.x + 14, this.y + 22, 5, 5);
            ctx.fillRect(this.x + 26, this.y + 22, 5, 5);
            ctx.fillRect(this.x + 22, this.y + 28, 3, 18);

            // Peitoral/Camiseta
            ctx.fillStyle = '#ff007f';
            ctx.fillRect(this.x + 18, this.y + 20, 8, 10);

            // Gola Alta do Gakuran
            ctx.fillStyle = '#0b132b';
            ctx.fillRect(this.x + 12, this.y + 12, 20, 8);

            // Rosto
            ctx.fillStyle = '#ffe0bd';
            ctx.fillRect(this.x + 16, this.y + 8, 16, 12);

            // Topete Pompadour Icônico de Josuke
            ctx.fillStyle = '#050814';
            ctx.fillRect(this.x + 12, this.y + 2, 22, 10);
            ctx.beginPath();
            ctx.ellipse(this.x + 28, this.y + 3, 16, 8, -0.2, 0, Math.PI * 2);
            ctx.fill();

            // Brilho Azul Metálico no Topete
            ctx.fillStyle = '#00ffcc';
            ctx.fillRect(this.x + 22, this.y + 1, 12, 3);

            ctx.restore();
        }
    };

    // =========================================
    // ESTRUTURA DO CENÁRIO DE MORIOH (Paralaxe Corrigido)
    // =========================================
    let bgOffset = 0;

    // Array fixo para paralaxe sem sobreposição
const buildings = [];
const NUM_BUILDINGS = 10;
const BUILDING_WIDTH = 130;

for (let i = 0; i < NUM_BUILDINGS; i++) {
    buildings.push({
        x: i * BUILDING_WIDTH,
        width: BUILDING_WIDTH,
        height: 120 + (i % 4) * 20,
        color: (i % 2 === 0) ? '#3a0066' : '#280048',
        signColor: (i % 3 === 0) ? '#ffe600' : (i % 3 === 1 ? '#00ffcc' : '#ff007f')
    });
}

function drawBackground() {
    // 1. Céu Degradê estilo JoJo
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, '#2a004f');
    grad.addColorStop(0.5, '#660066');
    grad.addColorStop(1, '#ff6600');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 2. Montanhas ao Fundo
    ctx.fillStyle = 'rgba(74, 0, 128, 0.4)';
    ctx.beginPath();
    const mountainOffset = (bgOffset * 0.15) % 200;
    for (let x = -mountainOffset - 200; x < GAME_WIDTH + 200; x += 200) {
        ctx.lineTo(x + 100, 160);
        ctx.lineTo(x + 200, 280);
        ctx.lineTo(x, 280);
    }
    ctx.fill();

    // 3. Movimento Contínuo dos Prédios de Morioh (Direita -> Esquerda)
    const speedRatio = 0.4;
    const totalWidth = NUM_BUILDINGS * BUILDING_WIDTH;

    buildings.forEach(b => {
        let renderX = (b.x - (bgOffset * speedRatio)) % totalWidth;
        if (renderX < -BUILDING_WIDTH) {
            renderX += totalWidth;
        }

        // Corpo do Prédio
        ctx.fillStyle = b.color;
        ctx.fillRect(renderX, GROUND_Y - b.height, b.width - 10, b.height);

        // Telhado
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(renderX - 4, GROUND_Y - b.height - 6, b.width - 2, 6);

        // Placa Comercial Japonesa
        ctx.fillStyle = b.signColor;
        ctx.fillRect(renderX + 15, GROUND_Y - b.height + 20, 25, 45);
    });

    // 4. Fiação Elétrica
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 170);
    ctx.lineTo(GAME_WIDTH, 170);
    ctx.stroke();

    // 5. Chão com Linhas Amarelas de Perspectiva
    ctx.fillStyle = '#ff007f';
    ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 4);

    ctx.fillStyle = '#1a0033';
    ctx.fillRect(0, GROUND_Y + 4, GAME_WIDTH, GAME_HEIGHT - GROUND_Y - 4);

    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const groundLineOffset = bgOffset % 40;
    for (let x = -groundLineOffset; x < GAME_WIDTH + 40; x += 40) {
        ctx.moveTo(x, GROUND_Y + 4);
        ctx.lineTo(x - 20, GAME_HEIGHT);
    }
    ctx.stroke();
}

    // =========================================
    // OBSTÁCULOS: INIMIGOS COM FORMATOS PRÓPRIOS
    // =========================================
    let obstacles = [];

    function spawnObstacle() {
    const types = ['angelo', 'akira', 'kira'];
    const chosen = types[Math.floor(Math.random() * types.length)];
    
    let width = 40;
    let height = 40;

    if (chosen === 'kira') {
        width = 44;
        height = 44; // Totalmente redondo (diâmetro = 44)
    } else if (chosen === 'angelo') {
        width = 40;
        height = 50; // Formato de gota (mais alto com a ponta para cima)
    } else if (chosen === 'akira') {
        width = 45;
        height = 45; // Quadrado
    }

    obstacles.push({
        x: GAME_WIDTH + 50,
        y: GROUND_Y - height,
        width: width,
        height: height,
        type: chosen,
        passed: false
    });
}

    let particles = [];
    let textEffects = [];

    function createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 6,
                vy: (Math.random() - 0.5) * 6,
                size: Math.random() * 5 + 2,
                color: color,
                life: 1
            });
        }
    }

    function spawnTextEffect(x, y, text) {
        textEffects.push({
            x: x,
            y: y,
            text: text,
            scale: 0.5,
            life: 1
        });
    }

    // =========================================
    // LOOP PRINCIPAL E REGRAS
    // =========================================

  function resetGame() {
    score = 0;
    gameSpeed = 6;
    bgOffset = 0;
    obstacles = [];
    particles = [];
    textEffects = [];
    player.y = GROUND_Y - player.height;
    player.vy = 0;
    player.isGrounded = true;
    player.canDoubleJump = false;
    player.standActive = false;
    player.standTimer = 0;
    frameCount = 0;
}

    function update() {
        if (gameState !== 'PLAYING') return;

        frameCount++;
        bgOffset += gameSpeed;
        score += 1;

        if (frameCount % 300 === 0) {
            gameSpeed += 0.5;
            spawnTextEffect(GAME_WIDTH / 2 - 50, 100, 'SPEED UP!');
        }

        const currentScoreVal = Math.floor(score / 5);
        if (currentScoreVal >= VICTORY_SCORE) {
            triggerVictory();
            return;
        }

        player.update();

        if (frameCount % Math.max(45, Math.floor(1100 / gameSpeed)) === 0 && Math.random() > 0.25) {
            spawnObstacle();
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            const obs = obstacles[i];
            obs.x -= gameSpeed;

            if (!obs.passed && obs.x + obs.width < player.x) {
                obs.passed = true;
                if (Math.random() > 0.5) {
                    const words = ['ORA!', 'DORA!', 'NICE!', 'GREAT!'];
                    spawnTextEffect(player.x, player.y - 30, words[Math.floor(Math.random() * words.length)]);
                }
            }

            // Colisão com Hitbox Ajustada
            const padding = 6;
            if (
                player.x + padding < obs.x + obs.width &&
                player.x + player.width - padding > obs.x &&
                player.y + padding < obs.y + obs.height &&
                player.y + player.height > obs.y
            ) {
                gameOver();
            }

            if (obs.x < -100) {
                obstacles.splice(i, 1);
            }
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            if (p.life <= 0) particles.splice(i, 1);
        }

        for (let i = textEffects.length - 1; i >= 0; i--) {
            const t = textEffects[i];
            t.y -= 1;
            t.scale = Math.min(1.2, t.scale + 0.05);
            t.life -= 0.02;
            if (t.life <= 0) textEffects.splice(i, 1);
        }
    }

    function render() {
        ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        drawBackground();

       // Renderização Correta dos Inimigos
obstacles.forEach(obs => {
    ctx.save();

    if (obs.type === 'kira') {
        // KIRA - FORMATO BOLINHA REDONDA
        const radius = obs.width / 2;
        const cx = obs.x + radius;
        const cy = obs.y + radius;

        // Corpo Redondo Rosa/Roxo
        ctx.fillStyle = '#ff007f';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Borda Roxa
        ctx.strokeStyle = '#1a0033';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Detalhe Interno / Símbolo da Caveira
        ctx.fillStyle = '#ffe600';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💀', cx, cy);

    } else if (obs.type === 'angelo') {
        // ANGELO (Aqua Necklace) - FORMATO GOTA D'ÁGUA / CRISTAL (Ponta para cima, base arredondada)
        const topX = obs.x + obs.width / 2;
        const topY = obs.y;
        const bottomY = obs.y + obs.height;
        const leftX = obs.x;
        const rightX = obs.x + obs.width;

        ctx.fillStyle = '#00ffcc';
        ctx.beginPath();
        ctx.moveTo(topX, topY); // Ponta no topo
        // Curva para o lado direito e base arredondada
        ctx.bezierCurveTo(rightX, topY + obs.height * 0.4, rightX, bottomY, topX, bottomY);
        // Curva para o lado esquerdo de volta à ponta
        ctx.bezierCurveTo(leftX, bottomY, leftX, topY + obs.height * 0.4, topX, topY);
        ctx.closePath();
        ctx.fill();

        // Borda e Reflexo da Gota
        ctx.strokeStyle = '#006699';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(topX - 4, topY + 12, 3, 0, Math.PI * 2);
        ctx.fill();

    } else if (obs.type === 'akira') {
        // AKIRA OTOISHI - FORMATO QUADRADO
        ctx.fillStyle = '#ffe600';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Borda Rosa
        ctx.strokeStyle = '#ff007f';
        ctx.lineWidth = 3;
        ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);

        // Ícone/Detalhe Elétrico
        ctx.fillStyle = '#1a0033';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', obs.x + obs.width / 2, obs.y + obs.height / 2);
    }

    ctx.restore();
});

        // Desenhar Josuke
        player.draw();

        // Desenhar Partículas
        particles.forEach(p => {
            ctx.save();
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            ctx.restore();
        });

        // Desenhar Onomatopéias
        textEffects.forEach(t => {
            ctx.save();
            ctx.globalAlpha = t.life;
            ctx.font = 'bold 28px Bangers';
            ctx.fillStyle = '#ffe600';
            ctx.strokeStyle = '#ff007f';
            ctx.lineWidth = 4;
            ctx.translate(t.x, t.y);
            ctx.scale(t.scale, t.scale);
            ctx.strokeText(t.text, 0, 0);
            ctx.fillText(t.text, 0, 0);
            ctx.restore();
        });

        // HUD de Pontuação
        if (gameState === 'PLAYING') {
            ctx.save();
            ctx.font = 'bold 28px Bangers';
            ctx.fillStyle = '#ffe600';
            ctx.shadowColor = '#ff007f';
            ctx.shadowBlur = 8;
            ctx.fillText(`MORIOH DISTANCE: ${Math.floor(score / 5)}m`, 20, 40);
            ctx.restore();
        }
    }

    function gameLoop() {
        update();
        render();
        requestAnimationFrame(gameLoop);
    }

    function startGame() {
        initAudio();
        resetGame();
        gameState = 'PLAYING';
        overlay.classList.remove('active');
        startBGM();
    }

    function gameOver() {
        gameState = 'GAMEOVER';
        stopBGM();
        playSound('hit');

        const finalScoreVal = Math.floor(score / 5);
        if (finalScoreVal > highScore) {
            highScore = finalScoreVal;
            localStorage.setItem('jojo_diamond_highscore', highScore);
            savedHighScoreEl.textContent = highScore;
        }

        overlayTitle.textContent = 'WRYYYY! FIM DE JOGO!';
        finalScoreEl.textContent = finalScoreVal;
        highScoreOverlayEl.textContent = highScore;
        scoreDisplayContainer.classList.remove('hidden');
        overlayInstructions.innerHTML = 'Josuke foi atingido por um usuário de Stand! Tente novamente.';
        startBtn.querySelector('.btn-text').textContent = 'JOGAR NOVAMENTE';
        overlay.classList.add('active');
    }

    function triggerVictory() {
        gameState = 'VICTORY';
        stopBGM();
        playSound('victory');

        const finalScoreVal = Math.floor(score / 5);
        if (finalScoreVal > highScore) {
            highScore = finalScoreVal;
            localStorage.setItem('jojo_diamond_highscore', highScore);
            savedHighScoreEl.textContent = highScore;
        }

        overlayTitle.textContent = 'VOCÊ CHEGOU AO FIM DE MORIOH!';
        finalScoreEl.textContent = finalScoreVal;
        highScoreOverlayEl.textContent = highScore;
        scoreDisplayContainer.classList.remove('hidden');
        overlayInstructions.innerHTML = '<strong style="color:#ffe600; font-size:1.4rem;">DIAMOND IS UNBREAKABLE!</strong><br>Yoshikage Kira foi encurralado por Josuke e Crazy Diamond!';
        startBtn.querySelector('.btn-text').textContent = 'JOGAR NOVAMENTE';
        overlay.classList.add('active');
    }

    // =========================================
    // CONTROLES (Teclado R, Espaço, Seta, Touch)
    // =========================================
    function handleAction() {
        if (gameState === 'PLAYING') {
            player.jump();
        }
    }

    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            if (gameState === 'START' || gameState === 'GAMEOVER' || gameState === 'VICTORY') {
                startGame();
            } else {
                handleAction();
            }
        } else if (e.code === 'KeyR') {
            if (gameState === 'PLAYING' || gameState === 'GAMEOVER' || gameState === 'VICTORY') {
                startGame();
            }
        }
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (gameState === 'PLAYING') {
            handleAction();
        }
    }, { passive: false });

    canvas.addEventListener('mousedown', () => {
        if (gameState === 'PLAYING') {
            handleAction();
        }
    });

    startBtn.addEventListener('click', () => {
        startGame();
    });

    gameLoop();
});
