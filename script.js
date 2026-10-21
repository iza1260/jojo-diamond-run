/**
 * JOJO: DIAMOND RUN!
 * Motor em Canvas 2D com Josuke, Crazy Diamond, Inimigos da Parte 4 e Trilha Funk/Guitarra
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

    // Configurações
    const GAME_HEIGHT = 400;
    const GAME_WIDTH = 900;
    const GROUND_Y = 320;
    const VICTORY_SCORE = 1000; // Pontuação para encontrar Yoshikage Kira e vencer

    let soundEnabled = true;
    let gameState = 'START'; // START, PLAYING, GAMEOVER, VICTORY
    let score = 0;
    let highScore = parseInt(localStorage.getItem('jojo_diamond_highscore')) || 0;
    let gameSpeed = 6;
    let frameCount = 0;

    savedHighScoreEl.textContent = highScore;

    // =========================================
    // TRILHA SONORA & SINTETIZADOR (Web Audio API)
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
            // Impacto dramático com ruído e onda de serra (DORARARA!)
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
            // Fanfarra de Vitória
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

    // Loop de BGM estilo Funk/Bass de JoJo
    let bgmStep = 0;
    const bassNotes = [110, 110, 130.81, 110, 146.83, 130.81, 110, 164.81]; // A2, C3, D3, E3
    function startBGM() {
        if (bgmInterval) clearInterval(bgmInterval);
        bgmStep = 0;
        bgmInterval = setInterval(() => {
            if (!soundEnabled || !audioCtx || gameState !== 'PLAYING') return;
            const now = audioCtx.currentTime;
            
            // Linha de Baixo
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

            // Stabs de Guitarra nos tempos pares
            if (bgmStep % 2 === 1) {
                const gOsc = audioCtx.createOscillator();
                const gGain = audioCtx.createGain();
                gOsc.type = 'square';
                gOsc.frequency.setValueAtTime(440, now); // A4
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

            // Stand Crazy Diamond (Quando ativado no pulo duplo ou no especial)
            if (this.standActive || !this.isGrounded) {
                ctx.save();
                ctx.shadowBlur = 18;
                ctx.shadowColor = '#ff007f';
                
                const cdX = this.x - 22 + Math.sin(frameCount * 0.2) * 4;
                const cdY = this.y - 30 + Math.cos(frameCount * 0.2) * 4;

                // Silhueta/Aura do Crazy Diamond (Rosa e Ciano)
                ctx.fillStyle = 'rgba(255, 0, 128, 0.45)';
                ctx.beginPath();
                ctx.ellipse(cdX + 25, cdY + 35, 30, 42, 0, 0, Math.PI * 2);
                ctx.fill();

                // Detalhes da armadura de Crazy Diamond
                ctx.fillStyle = '#00ffcc';
                ctx.fillRect(cdX + 15, cdY + 15, 20, 8); // Capacete/Visor
                ctx.fillRect(cdX + 10, cdY + 30, 10, 15); // Ombreira
                ctx.restore();
            }

            // Sombra no Chão
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(this.x + this.width / 2, GROUND_Y, 20, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Desenhando Josuke Higashikata
            // 1. Uniforme Gakuran Azul Marinho
            ctx.fillStyle = '#0b132b';
            
            // Pernas (Corrida)
            if (this.isGrounded) {
                const legOffset = Math.sin(frameCount * 0.3) * 10;
                ctx.fillRect(this.x + 10 + legOffset, this.y + 45, 10, 25);
                ctx.fillRect(this.x + 25 - legOffset, this.y + 45, 10, 25);
            } else {
                ctx.fillRect(this.x + 8, this.y + 40, 12, 20);
                ctx.fillRect(this.x + 22, this.y + 45, 15, 15);
            }

            // Torso (Jaqueta Aberta)
            ctx.fillRect(this.x + 10, this.y + 18, 26, 28);

            // Detalhes Dourados (Broches de Coração/Âncora e Zíper)
            ctx.fillStyle = '#ffe600';
            ctx.fillRect(this.x + 14, this.y + 22, 5, 5); // Broche 1
            ctx.fillRect(this.x + 26, this.y + 22, 5, 5); // Broche 2
            ctx.fillRect(this.x + 22, this.y + 28, 3, 18); // Zíper Dourado

            // Camiseta/Peitoral por baixo
            ctx.fillStyle = '#ff007f';
            ctx.fillRect(this.x + 18, this.y + 20, 8, 10);

            // Gola Alta do Uniforme
            ctx.fillStyle = '#0b132b';
            ctx.fillRect(this.x + 12, this.y + 12, 20, 8);

            // Rosto
            ctx.fillStyle = '#ffe0bd';
            ctx.fillRect(this.x + 16, this.y + 8, 16, 12);

            // 2. Cabelo Pompadour Icônico de Josuke
            ctx.fillStyle = '#050814';
            // Base do Cabelo
            ctx.fillRect(this.x + 12, this.y + 2, 22, 10);
            // Topete Pompadour Projetado para Frente
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
    // OBSTÁCULOS: INIMIGOS DA PARTE 4
    // =========================================
    let obstacles = [];

    function spawnObstacle() {
        const types = ['angelo', 'akira', 'kira'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        
        let width = 40;
        let height = 50;

        if (chosen === 'angelo') {
            width = 38;
            height = 48;
        } else if (chosen === 'akira') {
            width = 42;
            height = 55;
        } else if (chosen === 'kira') {
            width = 35;
            height = 60;
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

    // Partículas e Efeitos Onomatopéicos
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
    // CENÁRIO DE MORIOH (Parallax)
    // =========================================
    let bgOffset = 0;

    function drawBackground() {
        // Céu Amarelo/Roxo estilo Mangá de Morioh
        const grad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        grad.addColorStop(0, '#2a004f');
        grad.addColorStop(0.5, '#660066');
        grad.addColorStop(1, '#ff6600');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Montanhas de Morioh (Fundo Distante)
        ctx.fillStyle = 'rgba(74, 0, 128, 0.4)';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const mx = ((i * 200) - (bgOffset * 0.1)) % (GAME_WIDTH + 200) - 100;
            ctx.lineTo(mx + 100, 160);
            ctx.lineTo(mx + 200, 280);
            ctx.lineTo(mx, 280);
        }
        ctx.fill();

        // Casario e Lojas de Morioh (Camada Média)
        for (let i = 0; i < 8; i++) {
            const bx = ((i * 140) - (bgOffset * 0.4)) % (GAME_WIDTH + 140) - 70;
            // Prédio
            ctx.fillStyle = '#3a0066';
            ctx.fillRect(bx, 190, 110, 130);
            // Telhado
            ctx.fillStyle = '#ff007f';
            ctx.fillRect(bx - 5, 180, 120, 10);
            // Placa Japonesa
            ctx.fillStyle = '#ffe600';
            ctx.fillRect(bx + 15, 210, 20, 45);
        }

        // Postes de Luz e Fiação de Rua
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 170);
        ctx.lineTo(GAME_WIDTH, 170);
        ctx.stroke();

        // Chão e Asfalto
        ctx.fillStyle = '#ff007f';
        ctx.fillRect(0, GROUND_Y, GAME_WIDTH, 4);

        ctx.fillStyle = '#1a0033';
        ctx.fillRect(0, GROUND_Y + 4, GAME_WIDTH, GAME_HEIGHT - GROUND_Y - 4);

        // Linhas de perspectiva amarela no chão
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = -(bgOffset % 40); x < GAME_WIDTH; x += 40) {
            ctx.moveTo(x, GROUND_Y + 4);
            ctx.lineTo(x - 20, GAME_HEIGHT);
        }
        ctx.stroke();
    }

    // =========================================
    // LOOP DO JOGO E REGRAS
    // =========================================

    function resetGame() {
        score = 0;
        gameSpeed = 6;
        obstacles = [];
        particles = [];
        textEffects = [];
        player.y = GROUND_Y - player.height;
        player.vy = 0;
        player.isGrounded = true;
        frameCount = 0;
    }

    function update() {
        if (gameState !== 'PLAYING') return;

        frameCount++;
        bgOffset += gameSpeed;
        score += 1;

        // Aumento progressivo da velocidade
        if (frameCount % 300 === 0) {
            gameSpeed += 0.5;
            spawnTextEffect(GAME_WIDTH / 2 - 50, 100, 'SPEED UP!');
        }

        // Checar Vitória ao chegar no final de Morioh (Kira)
        const currentScoreVal = Math.floor(score / 5);
        if (currentScoreVal >= VICTORY_SCORE) {
            triggerVictory();
            return;
        }

        // Atualizar Jogador
        player.update();

        // Gerar Inimigos
        if (frameCount % Math.max(45, Math.floor(1100 / gameSpeed)) === 0 && Math.random() > 0.25) {
            spawnObstacle();
        }

        // Atualizar Inimigos
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

            // Colisão
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

        // Partículas
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.03;
            if (p.life <= 0) particles.splice(i, 1);
        }

        // Textos
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

        // Desenhando Inimigos de Morioh
        obstacles.forEach(obs => {
            ctx.save();
            if (obs.type === 'angelo') {
                // Angelo / Aqua Necklace (Aquático/Azul)
                ctx.fillStyle = '#00ffcc';
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                ctx.fillStyle = '#006699';
                ctx.fillRect(obs.x + 5, obs.y + 10, obs.width - 10, obs.height - 15);
                ctx.fillStyle = '#fff';
                ctx.fillText('💧', obs.x + 10, obs.y + 30);
            } else if (obs.type === 'akira') {
                // Akira Otoishi / Red Hot Chili Pepper (Elétrico/Amarelo)
                ctx.fillStyle = '#ffe600';
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                ctx.fillStyle = '#ff007f';
                ctx.fillRect(obs.x + 8, obs.y + 8, obs.width - 16, obs.height - 16);
                ctx.fillStyle = '#fff';
                ctx.fillText('⚡', obs.x + 12, obs.y + 35);
            } else if (obs.type === 'kira') {
                // Yoshikage Kira / Killer Queen (Elegante/Caveira)
                ctx.fillStyle = '#ff007f';
                ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
                ctx.fillStyle = '#1a0033';
                ctx.fillRect(obs.x + 6, obs.y + 12, obs.width - 12, obs.height - 20);
                ctx.fillStyle = '#ffe600';
                ctx.fillText('💀', obs.x + 8, obs.y + 35);
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

        // Desenhar Textos Onomatopéicos
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
