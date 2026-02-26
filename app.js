/**
 * app.js — Orchestration Layer (DOE)
 * Buriram GP MotoGP Circuit Simulator
 * NOTE: Corner data is embedded inline (no fetch) so the app works
 * by directly opening index.html — no local server required.
 */

'use strict';

// ─── Embedded Corner Data (source of truth: directives/circuit-data.md) ──────
const CORNERS_DATA = [
    { id: 1, number: 1, name: "Start Hairpin", direction: "right", character: "Heavy braking hairpin after the start/finish straight", entrySpeed: 290, exitSpeed: 80, gear: 1, brakingDifficulty: 9, brakingDistance: 250, decelG: 1.5, tip: "Frena presto e difendi la linea interna — questo è il primo punto di sorpasso.\nArrivo dal lungo rettilineo start/finish.", landmark: "Rettilineo Start/Finish", mapX: 72, mapY: 22 },
    { id: 2, number: 2, name: "Kink Left", direction: "left", character: "Fast chicane exit, near full throttle", entrySpeed: 180, exitSpeed: 210, gear: 3, brakingDifficulty: 3, brakingDistance: 50, decelG: 0.4, tip: "Frenata minima — è un kink fluido che si apre sulla seconda zona di accelerazione. Rimani largo in entrata.", landmark: "Dopo la prima accelerazione", mapX: 85, mapY: 34 },
    { id: 3, number: 3, name: "The Hammer", direction: "right", character: "Il punto di frenata più duro del calendario MotoGP", entrySpeed: 327, exitSpeed: 77, gear: 1, brakingDifficulty: 10, brakingDistance: 293, decelG: 1.8, tip: "327→77 km/h in 293 metri. I piloti applicano 5.2 kg di forza sulla leva del freno e subiscono 1.8G di decelerazione. Dopo il rettilineo da 1000m. Frenare tardi = gloria o ghiaia.", landmark: "Fine rettilineo lungo (~1000m)", mapX: 88, mapY: 62 },
    { id: 4, number: 4, name: "Second Apex", direction: "left", character: "Chicane con T3 — apice stretto", entrySpeed: 130, exitSpeed: 150, gear: 2, brakingDifficulty: 5, brakingDistance: 80, decelG: 0.8, tip: "Parte del complesso chicane T3-T4. Apice a sinistra stretto per impostare la zona di accelerazione. Uscita in 2ª marcia.", landmark: "Complesso chicane T3-T4", mapX: 80, mapY: 72 },
    { id: 5, number: 5, name: "Thai Tight", direction: "right", character: "Zona tecnica di frenata con marcatore a riga bianca", entrySpeed: 240, exitSpeed: 100, gear: 2, brakingDifficulty: 8, brakingDistance: 180, decelG: 1.4, tip: "Cerca la riga bianca sul lato destro della pista come punto di frenata. Vai il più stretto possibile — tienila in 2ª marcia.", landmark: "Riga bianca come marcatore", mapX: 65, mapY: 82 },
    { id: 6, number: 6, name: "Flowing Left", direction: "left", character: "Curvone ad alta velocità — porta velocità massima", entrySpeed: 220, exitSpeed: 205, gear: 4, brakingDifficulty: 2, brakingDistance: 30, decelG: 0.3, tip: "Una delle curve più veloci del circuito. Frenata minimale — lascia scorrere la moto. Bilanciamento del telaio e temperatura gomme sono cruciali qui.", landmark: "Inizio settore fluido", mapX: 48, mapY: 78 },
    { id: 7, number: 7, name: "Back Entry", direction: "right", character: "Apre il settore centrale, alimenta la sezione posteriore", entrySpeed: 200, exitSpeed: 185, gear: 3, brakingDifficulty: 3, brakingDistance: 60, decelG: 0.5, tip: "Una destra a media velocità che ti porta nel settore più tecnico interno. Entrata fluida — non sacrificare la velocità in uscita.", landmark: "Ingresso infield", mapX: 35, mapY: 68 },
    { id: 8, number: 8, name: "Sweeper", direction: "left", character: "Curva a raggio costante ad alta velocità", entrySpeed: 210, exitSpeed: 195, gear: 4, brakingDifficulty: 2, brakingDistance: 30, decelG: 0.3, tip: "Una sinistra lunga e fluida. Impegna presto e mantieni una traiettoria costante. Buon grip qui — fidati della gomma.", landmark: "Curvone posteriore", mapX: 22, mapY: 60 },
    { id: 9, number: 9, name: "Inner Loop", direction: "right", character: "Sezione tecnica lenta nell'infield — imbocca T10", entrySpeed: 140, exitSpeed: 120, gear: 2, brakingDifficulty: 6, brakingDistance: 100, decelG: 1.0, tip: "Tienila in 2ª marcia attraverso T9 e T10. Velocità costante in questo tratto. La traiettoria di uscita da T10 è fondamentale per il settore finale.", landmark: "Loop tecnico infield", mapX: 20, mapY: 42 },
    { id: 10, number: 10, name: "Inner Exit", direction: "left", character: "Stretto seguito di T9 che collega al settore finale", entrySpeed: 120, exitSpeed: 130, gear: 2, brakingDifficulty: 5, brakingDistance: 70, decelG: 0.8, tip: "Parte del loop T9-T10. Ottieni una buona uscita qui — hai bisogno di forte trazione per il tratto veloce verso T11.", landmark: "Loop infield T9-T10", mapX: 32, mapY: 32 },
    { id: 11, number: 11, name: "Fast Right", direction: "right", character: "Destra veloce ad alto grip prima del complesso finale", entrySpeed: 220, exitSpeed: 200, gear: 4, brakingDifficulty: 3, brakingDistance: 60, decelG: 0.5, tip: "Una destra fluida e veloce che porta alla chicane finale. La trazione è essenziale — questa alimenta direttamente la zona di frenata di T12.", landmark: "Ingresso settore finale", mapX: 50, mapY: 22 },
    { id: 12, number: 12, name: "Glory Corner", direction: "left", character: "Prime last-lap overtaking spot — the decisive corner", entrySpeed: 290, exitSpeed: 90, gear: 1, brakingDifficulty: 9, brakingDistance: 213, decelG: 1.6, tip: "Il board arancione sul muro sinistro è il marcatore di frenata. 213 metri di frenata. Con il traguardo così vicino, un attacco qui all'ultimo giro può vincere o perdere la gara. Tardi = ghiaia.", landmark: "Board arancione, muro pneumatici sinistro", mapX: 60, mapY: 22 }
];

// ─── State ───────────────────────────────────────────────────────────────────
const App = {
    corners: [],
    mode: 'explore',
    selectedCorner: null,
    walkStep: 0,
    walkTimer: null,
    quizRound: 0,
    quizScore: 0,
    quizCorrect: null,
    quizMaxRounds: 6,
    engine: null,
};

// ─── Boot ─────────────────────────────────────────────────────────────────────
function boot() {
    App.corners = CORNERS_DATA;

    buildMapMarkers();
    switchMode('explore');
    selectCorner(App.corners[0]);

    document.getElementById('btn-ride').addEventListener('click', () => switchMode('ride'));
    document.getElementById('btn-explore').addEventListener('click', () => switchMode('explore'));
    document.getElementById('btn-walk').addEventListener('click', () => switchMode('walkthrough'));
    document.getElementById('btn-quiz').addEventListener('click', () => switchMode('quiz'));

    document.getElementById('btn-prev').addEventListener('click', () => navCorner(-1));
    document.getElementById('btn-next').addEventListener('click', () => navCorner(+1));

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && App.mode === 'ride') switchMode('explore');
        if ((e.key === 'r' || e.key === 'R') && App.mode !== 'ride') switchMode('ride');
        if (e.key === 'ArrowLeft' && App.mode === 'explore') navCorner(-1);
        if (e.key === 'ArrowRight' && App.mode === 'explore') navCorner(+1);
    });

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
}

// ─── Mode Router ─────────────────────────────────────────────────────────────
function switchMode(mode) {
    if (App.mode === 'ride' && App.engine) {
        App.engine.stop();
        App.engine = null;
    }
    if (App.walkTimer) {
        clearInterval(App.walkTimer);
        App.walkTimer = null;
    }

    App.mode = mode;

    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${mode === 'walkthrough' ? 'walk' : mode}`)?.classList.add('active');

    document.getElementById('ride-section').style.display = mode === 'ride' ? 'flex' : 'none';
    document.getElementById('map-section').style.display = mode !== 'ride' ? 'flex' : 'none';
    document.getElementById('corner-panel').style.display = (mode === 'explore' || mode === 'walkthrough') ? 'flex' : 'none';
    document.getElementById('quiz-panel').style.display = mode === 'quiz' ? 'flex' : 'none';

    const walkBar = document.getElementById('walk-bar-wrap');
    if (walkBar) walkBar.style.display = mode === 'walkthrough' ? 'block' : 'none';

    if (mode === 'ride') startRide();
    if (mode === 'walkthrough') startWalkthrough();
    if (mode === 'quiz') startQuiz();
    if (mode === 'explore') { clearMapHighlights(); if (App.selectedCorner) selectCorner(App.selectedCorner); }
}

// ─── RIDE MODE ───────────────────────────────────────────────────────────────
function startRide() {
    // Wait for DOM reflow
    requestAnimationFrame(() => {
        resizeCanvas();
        const canvas = document.getElementById('ride-canvas');
        App.engine = new RideEngine();
        App.engine.init(canvas, App.corners);
        App.engine.onLapComplete = () => {
            const el = document.getElementById('lap-flash');
            if (el) { el.style.opacity = 1; setTimeout(() => el.style.opacity = 0, 1800); }
        };
        App.engine.start();
    });
}

function resizeCanvas() {
    const canvas = document.getElementById('ride-canvas');
    if (!canvas) return;
    // Fallback to window dimensions if offsetHeight is 0
    canvas.width = canvas.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || (window.innerHeight - 90);
}

// ─── SVG MAP ─────────────────────────────────────────────────────────────────
function buildMapMarkers() {
    const svg = document.getElementById('track-svg');
    if (!svg) return;
    App.corners.forEach(c => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('id', `corner-g-${c.number}`);
        g.setAttribute('class', 'corner-marker');
        g.style.cursor = 'pointer';

        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', c.mapX);
        ring.setAttribute('cy', c.mapY);
        ring.setAttribute('r', 5);
        ring.setAttribute('class', 'corner-ring');
        ring.setAttribute('id', `ring-${c.number}`);

        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', c.mapX);
        dot.setAttribute('cy', c.mapY);
        dot.setAttribute('r', 3);
        dot.setAttribute('class', 'corner-dot');
        dot.setAttribute('id', `dot-${c.number}`);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', c.mapX + 7);
        text.setAttribute('y', c.mapY + 4);
        text.setAttribute('class', 'corner-label');
        text.textContent = c.number;

        g.appendChild(ring);
        g.appendChild(dot);
        g.appendChild(text);
        g.addEventListener('click', () => {
            if (App.mode === 'quiz') handleQuizAnswer(c.number);
            else selectCorner(c);
        });
        g.addEventListener('mouseenter', () => hoverCorner(c.number, true));
        g.addEventListener('mouseleave', () => hoverCorner(c.number, false));
        svg.appendChild(g);
    });
}

function clearMapHighlights() {
    document.querySelectorAll('.corner-dot').forEach(d => d.classList.remove('active'));
    document.querySelectorAll('.corner-ring').forEach(r => r.classList.remove('active'));
}

function hoverCorner(num, on) {
    const dot = document.getElementById(`dot-${num}`);
    const ring = document.getElementById(`ring-${num}`);
    if (!dot || !ring) return;
    if (on) { dot.classList.add('hover'); ring.classList.add('hover'); }
    else { dot.classList.remove('hover'); ring.classList.remove('hover'); }
}

// ─── EXPLORE MODE ────────────────────────────────────────────────────────────
function selectCorner(corner) {
    App.selectedCorner = corner;
    clearMapHighlights();
    const dot = document.getElementById(`dot-${corner.number}`);
    const ring = document.getElementById(`ring-${corner.number}`);
    if (dot) dot.classList.add('active');
    if (ring) ring.classList.add('active');
    renderPanel(corner);
}

function navCorner(dir) {
    if (!App.selectedCorner) return;
    const idx = App.corners.findIndex(c => c.number === App.selectedCorner.number);
    const next = App.corners[(idx + dir + App.corners.length) % App.corners.length];
    selectCorner(next);
}

function renderPanel(corner) {
    const el = id => document.getElementById(id);

    el('panel-num').textContent = `T${corner.number}`;
    el('panel-name').textContent = corner.name;

    const dirEl = el('panel-direction');
    dirEl.textContent = corner.direction === 'right' ? '↪ RIGHT' : '↩ LEFT';
    dirEl.className = `dir-badge ${corner.direction}`;

    el('panel-entry').textContent = `${corner.entrySpeed} km/h`;
    el('panel-exit').textContent = `${corner.exitSpeed} km/h`;
    el('panel-gear').textContent = `${corner.gear}`;

    const bv = corner.brakingDifficulty;
    el('brake-fill').style.width = `${bv * 10}%`;
    el('brake-fill').style.background = bv >= 9 ? '#e8003d' : bv >= 7 ? '#f5a623' : '#00d4aa';
    el('brake-value').textContent = `${bv}/10`;

    el('panel-character').textContent = corner.character;
    el('panel-tip').textContent = corner.tip;
    el('panel-landmark').textContent = corner.landmark;

    renderCockpit(corner);
    el('corner-panel').classList.add('visible');
}

function renderCockpit(corner) {
    const canvas = document.getElementById('cockpit-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Sky gradient
    const skyG = ctx.createLinearGradient(0, 0, 0, H * 0.6);
    skyG.addColorStop(0, '#0d0d1e');
    skyG.addColorStop(1, '#1a1a4a');
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, W, H);

    const horizon = H * 0.52;
    const vanishX = W / 2 + (corner.direction === 'right' ? 55 : -55);

    // Grass
    ctx.fillStyle = '#1a4a1a';
    ctx.fillRect(0, horizon, W, H - horizon);

    // Road trapezoid
    ctx.fillStyle = '#2d2d3a';
    ctx.beginPath();
    ctx.moveTo(0, H);
    ctx.lineTo(vanishX - 5, horizon);
    ctx.lineTo(vanishX + 5, horizon);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();

    // Rumble strips
    ctx.fillStyle = '#e8003d';
    [[0, W * 0.06, vanishX - 7, vanishX - 5], [W, W * 0.94, vanishX + 7, vanishX + 5]].forEach(([x1, x2, vx1, vx2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, H); ctx.lineTo(vx1, horizon);
        ctx.lineTo(vx2, horizon); ctx.lineTo(x2, H);
        ctx.closePath(); ctx.fill();
    });

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 35; i++) {
        ctx.fillRect(
            (Math.sin(i * 137.5) * 0.5 + 0.5) * W,
            (Math.sin(i * 73.1) * 0.5 + 0.5) * H * 0.48,
            1.5, 1.5
        );
    }

    // Horizon glow
    const glow = ctx.createRadialGradient(vanishX, horizon, 0, vanishX, horizon, 70);
    glow.addColorStop(0, 'rgba(245,166,35,0.35)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Speed colour wash
    const speedHue = corner.exitSpeed < 120 ? '#e8003d' : corner.exitSpeed < 200 ? '#f5a623' : '#00d4aa';
    const wash = ctx.createLinearGradient(0, H * 0.75, 0, H);
    wash.addColorStop(0, 'rgba(0,0,0,0)');
    wash.addColorStop(1, speedHue + '44');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);

    // Corner badge
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(W - 58, H - 38, 52, 30);
    ctx.fillStyle = speedHue;
    ctx.font = `bold 20px 'Rajdhani', monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`T${corner.number}`, W - 32, H - 18);
    ctx.textAlign = 'left';
}

// ─── WALKTHROUGH MODE ─────────────────────────────────────────────────────────
function startWalkthrough() {
    App.walkStep = 0;
    selectCorner(App.corners[0]);
    updateWalkProgress(0, App.corners.length);
    App.walkTimer = setInterval(() => {
        App.walkStep = (App.walkStep + 1) % App.corners.length;
        selectCorner(App.corners[App.walkStep]);
        updateWalkProgress(App.walkStep, App.corners.length);
    }, 4000);
}

function updateWalkProgress(step, total) {
    const el = document.getElementById('walk-progress');
    if (el) el.style.width = `${((step + 1) / total) * 100}%`;
}

// ─── QUIZ MODE ────────────────────────────────────────────────────────────────
function startQuiz() {
    App.quizRound = 0;
    App.quizScore = 0;
    nextQuizQuestion();
}

function nextQuizQuestion() {
    if (App.quizRound >= App.quizMaxRounds) { showQuizResult(); return; }
    App.quizRound++;
    clearMapHighlights();
    document.getElementById('quiz-feedback').className = 'quiz-feedback';
    document.getElementById('quiz-feedback').textContent = '';

    const correct = App.corners[Math.floor(Math.random() * App.corners.length)];
    App.quizCorrect = correct;

    const clueTypes = ['name', 'speed', 'braking', 'direction', 'character'];
    const clue = clueTypes[Math.floor(Math.random() * clueTypes.length)];

    let q = '';
    switch (clue) {
        case 'name': q = `Dove si trova <strong>"${correct.name}"</strong>? Clicca la curva sulla mappa.`; break;
        case 'speed': q = `La curva con velocità di uscita <strong>${correct.exitSpeed} km/h</strong> — quale numero?`; break;
        case 'braking': q = `Difficoltà frenata <strong>${correct.brakingDifficulty}/10</strong>, <strong>${correct.gear}ª marcia</strong> in uscita — che curva è?`; break;
        case 'direction': q = `La curva nº <strong>${correct.number}</strong> — è a destra o sinistra? Clicca la giusta.`; break;
        case 'character': q = `<em>"${correct.character.split('—')[0].trim()}"</em> — di quale curva si tratta?`; break;
    }

    document.getElementById('quiz-question').innerHTML =
        `<div class="quiz-round">Turno ${App.quizRound}/${App.quizMaxRounds}</div><p>${q}</p>`;
    document.getElementById('quiz-score-display').textContent = `Score: ${App.quizScore}/${App.quizRound - 1}`;
}

function handleQuizAnswer(clickedNum) {
    if (!App.quizCorrect) return;
    const correct = App.quizCorrect.number;
    const fb = document.getElementById('quiz-feedback');

    const style = (num, cls) => {
        const d = document.getElementById(`dot-${num}`);
        const r = document.getElementById(`ring-${num}`);
        if (d) d.classList.add(cls);
        if (r) r.classList.add(cls);
    };

    if (clickedNum === correct) {
        App.quizScore++;
        fb.className = 'quiz-feedback correct';
        fb.textContent = `✅ Esatto! T${correct} — ${App.quizCorrect.name}`;
        style(correct, 'quiz-correct');
    } else {
        fb.className = 'quiz-feedback wrong';
        fb.textContent = `❌ Era T${correct} — ${App.quizCorrect.name}`;
        style(clickedNum, 'quiz-wrong');
        style(correct, 'quiz-correct');
    }

    document.getElementById('quiz-score-display').textContent = `Score: ${App.quizScore}/${App.quizRound}`;
    App.quizCorrect = null;
    setTimeout(() => {
        document.querySelectorAll('.quiz-correct, .quiz-wrong').forEach(el =>
            el.classList.remove('quiz-correct', 'quiz-wrong')
        );
        nextQuizQuestion();
    }, 2200);
}

function showQuizResult() {
    const pct = Math.round((App.quizScore / App.quizMaxRounds) * 100);
    const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '🏍' : '📚';
    const msg = pct >= 80 ? 'Sei pronto per guardare la gara da esperto!' :
        pct >= 50 ? 'Buon lavoro, continua ad allenarti!' :
            'Torna al Walkthrough per imparare meglio!';
    document.getElementById('quiz-question').innerHTML = `
    <div class="quiz-result">
      <div class="quiz-result-emoji">${emoji}</div>
      <h2>${App.quizScore}/${App.quizMaxRounds} — ${pct}%</h2>
      <p>${msg}</p>
      <button class="mode-btn active" onclick="startQuiz()" style="margin-top:12px">🔄 Riprova</button>
    </div>`;
    document.getElementById('quiz-feedback').textContent = '';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot);
