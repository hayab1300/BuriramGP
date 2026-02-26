/**
 * ride3d.js — Pseudo-3D Road Engine (OutRun/F-Zero technique)
 * Chang International Circuit — Buriram, Thailand
 * DOE Layer: EXECUTION
 */

'use strict';

const RideEngine = (() => {

  // ─── Constants ──────────────────────────────────────────────────────────────
  const SEGMENT_LENGTH = 200;       // world units per segment
  const ROAD_WIDTH = 2000;      // half-road width in world units
  const CAMERA_HEIGHT = 1500;      // camera elevation
  const CAMERA_DEPTH = 0.84;      // field-of-view depth  
  const DRAW_DISTANCE = 200;       // segments visible ahead
  const RUMBLE_LENGTH = 3;         // alternating stripe every N segments
  const FOG_DENSITY = 5;
  const MAX_SPEED = 440;       // km/h top speed (in world units/frame)
  const ACCELERATION = 3.5;
  const BRAKING = 9;
  const DECEL = 2;
  const CENTRIFUGAL = 0.3;
  const OFFROAD_DECEL = 0.99;

  // ─── Colors ─────────────────────────────────────────────────────────────────
  const COLOR = {
    SKY_TOP: '#0d0d1e',
    SKY_BOT: '#1a1a3e',
    GRASS1: '#1a4a1a',
    GRASS2: '#0f3a0f',
    ROAD1: '#333340',
    ROAD2: '#2d2d3a',
    RUMBLE1: '#e8003d',
    RUMBLE2: '#ffffff',
    STRIPE1: '#ffffff',
    STRIPE2: '#333340',
    BARRIER1: '#e8003d',
    BARRIER2: '#ffffff',
    START_END: '#f5a623',
    FOG: 'rgba(10,10,20,',
  };

  // ─── Track Definition (Buriram Chang International Circuit) ─────────────────
  // Each segment group: { curve, length, corner (null or corner index 1-12) }
  // curve: positive = right bend, negative = left bend, 0 = straight
  // length in segments

  function buildTrack() {
    const segments = [];
    let id = 0;

    function addSegments(count, curve, cornerIndex = null, camber = 0) {
      for (let i = 0; i < count; i++) {
        segments.push({
          index: id++,
          curve,
          camber,
          cornerIndex,
          color: Math.floor(id / RUMBLE_LENGTH) % 2,
          startY: 0,
          endY: 0,
        });
      }
    }

    // ── LAP START: Start/Finish straight ──────────────────────────────────────
    // START LINE
    addSegments(20, 0);     // start zone straight
    // T1: Start Hairpin (right) — brake from 290 km/h
    addSegments(8, 0.5, 1);   // T1 approach curve starts
    addSegments(12, 2.5, 1);   // T1 tight hairpin
    addSegments(8, 1.0, 1);   // T1 exit

    // Short run between T1 and T2
    addSegments(15, 0);
    // T2: Kink Left — fast, minimal braking
    addSegments(5, -0.8, 2);
    addSegments(8, -1.5, 2);
    addSegments(5, -0.8, 2);

    // ── BACK STRAIGHT: the great ~1000m rocket ────────────────────────────────
    addSegments(55, 0);    // long back straight — full throttle

    // T3: THE HAMMER — hardest braking (right)
    addSegments(5, 0.3, 3);
    addSegments(10, 3.5, 3);   // tight right
    addSegments(8, 2.0, 3);
    addSegments(5, 0.5, 3);

    // T4: Second Apex (left) — linked chicane
    addSegments(4, -0.5, 4);
    addSegments(8, -2.5, 4);
    addSegments(4, -0.8, 4);

    // Acceleration zone
    addSegments(18, 0);

    // T5: Thai Tight (right)
    addSegments(5, 0.5, 5);
    addSegments(10, 2.8, 5);
    addSegments(6, 1.0, 5);

    // ── FLOWING SECTOR ─────────────────────────────────────────────────────────
    addSegments(10, 0);

    // T6: Flowing Left — high speed sweeper
    addSegments(6, -0.4, 6);
    addSegments(15, -1.2, 6);
    addSegments(6, -0.4, 6);

    addSegments(12, 0);

    // T7: Back Entry (right)
    addSegments(5, 0.4, 7);
    addSegments(10, 1.8, 7);
    addSegments(5, 0.4, 7);

    addSegments(8, 0);

    // T8: Sweeper (left) — constant radius
    addSegments(5, -0.3, 8);
    addSegments(18, -1.0, 8);
    addSegments(5, -0.3, 8);

    // ── TECHNICAL INFIELD ──────────────────────────────────────────────────────
    addSegments(10, 0);

    // T9: Inner Loop (right) — slow technical
    addSegments(5, 0.5, 9);
    addSegments(12, 2.2, 9);
    addSegments(5, 0.5, 9);

    addSegments(6, 0);

    // T10: Inner Exit (left)
    addSegments(4, -0.5, 10);
    addSegments(10, -2.0, 10);
    addSegments(4, -0.5, 10);

    // Run to T11
    addSegments(18, 0);

    // T11: Fast Right
    addSegments(5, 0.4, 11);
    addSegments(12, 1.5, 11);
    addSegments(5, 0.4, 11);

    // Run to T12 — from T11 exit to Glory Corner
    addSegments(20, 0);

    // T12: Glory Corner (left) — final overtaking spot
    addSegments(5, -0.4, 12);
    addSegments(12, -2.8, 12);
    addSegments(5, -0.4, 12);

    // Short run to S/F line
    addSegments(12, 0);

    return segments;
  }

  // ─── Roadside Scenery Objects ────────────────────────────────────────────────
  function buildScenery(segments) {
    const totalSegs = segments.length;

    // Palm trees on grass areas (far from road, high segments)
    const palmPositions = [5, 10, 14, 19, 60, 65, 70, 100, 110, 120, 140, 150, 160, 175, 185, 195, 210, 220, 240, 250, 260];
    palmPositions.forEach(i => {
      if (i < totalSegs) {
        segments[i].objLeft = { type: 'palm', offset: -1.5 };
        segments[i].objRight = { type: 'palm', offset: 1.5 };
      }
    });
    // Grandstands near T1 and T12
    [20, 21, 22, 23, 24, totalSegs - 8, totalSegs - 7, totalSegs - 6].forEach(i => {
      if (i < totalSegs && i >= 0) {
        segments[i].objLeft = { type: 'grandstand', offset: -2.2 };
      }
    });
    // MotoGP barriers near key corners
    const barrierSegs = [38, 39, 40, 41, 96, 97, 98, 99, 180, 181, 182, 183];
    barrierSegs.forEach(i => {
      if (i < totalSegs) {
        segments[i].objLeft = { type: 'barrier', offset: -1.05 };
        segments[i].objRight = { type: 'barrier', offset: 1.05 };
      }
    });
  }

  // ─── Projection Helpers ─────────────────────────────────────────────────────
  function project(camera, seg, screenWidth, screenHeight, segY) {
    const scale = CAMERA_DEPTH / (segY - camera.z);
    const roadW = ROAD_WIDTH * scale * screenWidth / 2;
    const x = (1 + scale * (seg.curve - camera.x)) * screenWidth / 2;
    const y = (1 - scale * (CAMERA_HEIGHT - camera.y)) * screenHeight / 2;
    return { scale, roadW, x, y };
  }

  function fogColor(baseColor, fog, ratio) {
    // returns the fog-blended color string  
    if (baseColor.startsWith('rgba') || baseColor.startsWith('#')) {
      return baseColor; // simple approach — full color drawing, fog via overlay
    }
    return baseColor;
  }

  // ─── Renderer ────────────────────────────────────────────────────────────────
  function drawSegment(ctx, screenWidth, screenHeight, seg, proj1, proj2, fog) {
    const r1 = proj1, r2 = proj2;
    if (r1.y <= r2.y) return; // skip back-facing

    const col = seg.color;
    const grass = col === 0 ? COLOR.GRASS1 : COLOR.GRASS2;
    const road = col === 0 ? COLOR.ROAD1 : COLOR.ROAD2;
    const rumble = col === 0 ? COLOR.RUMBLE1 : COLOR.RUMBLE2;
    const stripe = col === 0 ? COLOR.STRIPE1 : COLOR.STRIPE2;

    // Grass background strip
    drawTrap(ctx, 0, r2.y, screenWidth, r1.y, grass);

    // Rumble strips (outer road edges)
    const rw1 = r1.roadW * 1.2;
    const rw2 = r2.roadW * 1.2;
    drawTrap(ctx, r1.x - rw1, r2.y, r2.x - rw2, r1.y, rumble,
      r1.x + rw1, r2.x + rw2);

    // Road surface
    drawTrap(ctx, r1.x - r1.roadW, r2.y, r2.x - r2.roadW, r1.y, road,
      r1.x + r1.roadW, r2.x + r2.roadW);

    // Centre white stripe
    if (col === 0) {
      const sw1 = r1.roadW * 0.02;
      const sw2 = r2.roadW * 0.02;
      drawTrap(ctx, r1.x - sw1, r2.y, r2.x - sw2, r1.y, stripe,
        r1.x + sw1, r2.x + sw2);
    }
  }

  function drawTrap(ctx, x1, y1, x2, y2, color, x3, x4) {
    ctx.fillStyle = color;
    ctx.beginPath();
    if (x3 !== undefined) {
      ctx.moveTo(x1, y2);
      ctx.lineTo(x2, y1);
      ctx.lineTo(x4, y1);
      ctx.lineTo(x3, y2);
    } else {
      ctx.moveTo(0, y2);
      ctx.lineTo(x1, y2);
      ctx.lineTo(x2, y1);
      ctx.lineTo(0, y1);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawBackground(ctx, W, H, daylight) {
    // Sky gradient — purple/dark blue (night-ish race atmosphere)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
    skyGrad.addColorStop(0, '#0d0d1e');
    skyGrad.addColorStop(1, '#1a1a4a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H * 0.5);

    // Stars
    if (!ctx._stars) {
      ctx._stars = Array.from({ length: 80 }, () => ({
        x: Math.random() * W, y: Math.random() * H * 0.45,
        r: Math.random() * 1.5
      }));
    }
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx._stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Ground/grass horizon fill
    ctx.fillStyle = COLOR.GRASS1;
    ctx.fillRect(0, H * 0.5, W, H * 0.5);
  }

  function drawObject(ctx, type, x, y, scale) {
    const h = scale * 120;
    const w = h * 0.6;
    switch (type) {
      case 'palm':
        // trunk
        ctx.fillStyle = '#6b4c1a';
        ctx.fillRect(x - w * 0.07, y - h, w * 0.14, h * 0.7);
        // leaves
        ctx.fillStyle = '#2d7a1f';
        ctx.beginPath();
        ctx.ellipse(x, y - h, w * 0.5, h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'grandstand':
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(x - w * 1.5, y - h * 1.2, w * 3, h * 1.2);
        ctx.fillStyle = '#e8003d';
        ctx.fillRect(x - w * 1.5, y - h * 1.2, w * 3, h * 0.1);
        break;
      case 'barrier':
        // Armco barrier — alternating red/white
        const segs = 5;
        const bw = w * 2 / segs;
        for (let i = 0; i < segs; i++) {
          ctx.fillStyle = i % 2 === 0 ? COLOR.BARRIER1 : COLOR.BARRIER2;
          ctx.fillRect(x - w + i * bw, y - h * 0.15, bw, h * 0.15);
        }
        break;
    }
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────────
  function drawHUD(ctx, W, H, state, corners) {
    const spd = Math.abs(state.speed);
    const spdKmh = Math.round(spd * 0.28);   // world units → km/h display
    const gear = speedToGear(spdKmh);
    const corner = state.currentCorner ? corners[state.currentCorner - 1] : null;

    // Speed backdrop
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    roundRect(ctx, W - 180, H - 90, 170, 80, 10);
    ctx.fill();

    // Speed value
    ctx.fillStyle = '#00d4aa';
    ctx.font = `bold 38px 'Rajdhani', monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(spdKmh, W - 50, H - 52);
    ctx.fillStyle = '#8a8a9a';
    ctx.font = `14px 'Inter', sans-serif`;
    ctx.fillText('km/h', W - 18, H - 52);

    // Gear
    ctx.fillStyle = '#f5a623';
    ctx.font = `bold 28px 'Rajdhani', monospace`;
    ctx.textAlign = 'right';
    ctx.fillText(`${gear}`, W - 145, H - 52);
    ctx.fillStyle = '#8a8a9a';
    ctx.font = `11px Inter`;
    ctx.fillText('gear', W - 135, H - 38);

    // Lap progress bar
    const progress = state.position / state.trackLength;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(10, H - 22, W - 20, 12);
    const grad = ctx.createLinearGradient(10, 0, W - 20, 0);
    grad.addColorStop(0, '#e8003d');
    grad.addColorStop(1, '#f5a623');
    ctx.fillStyle = grad;
    ctx.fillRect(10, H - 22, (W - 20) * progress, 12);

    ctx.fillStyle = '#8a8a9a';
    ctx.font = '10px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('LAP PROGRESS', 10, H - 26);

    // Current corner overlay
    if (corner) {
      drawCornerBanner(ctx, W, H, corner);
    }

    // Controls hint (fade out after 5 sec)
    if (state.showHints) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText('↑ Throttle  ↓ Brake  ← → Steer  ESC Map  D Auto-Demo', W / 2, H - 30);
    }

    // DEMO badge
    if (state.demo) {
      ctx.fillStyle = 'rgba(232,0,61,0.85)';
      roundRect(ctx, 10, 10, 100, 30, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px Rajdhani';
      ctx.textAlign = 'left';
      ctx.fillText('◉ AUTO-DEMO', 18, 30);
    }

    ctx.textAlign = 'left';
  }

  function drawCornerBanner(ctx, W, H, corner) {
    const bW = 360, bH = 56;
    const bX = (W - bW) / 2;
    const bY = 20;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    roundRect(ctx, bX, bY, bW, bH, 10);
    ctx.fill();
    ctx.strokeStyle = '#e8003d';
    ctx.lineWidth = 2;
    roundRect(ctx, bX, bY, bW, bH, 10);
    ctx.stroke();

    // Corner number badge
    ctx.fillStyle = '#e8003d';
    roundRect(ctx, bX + 8, bY + 8, 40, 40, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 22px Rajdhani`;
    ctx.textAlign = 'center';
    ctx.fillText(`T${corner.number}`, bX + 28, bY + 34);

    // Name
    ctx.fillStyle = '#f0f0f0';
    ctx.font = `bold 18px Rajdhani`;
    ctx.textAlign = 'left';
    ctx.fillText(corner.name.toUpperCase(), bX + 58, bY + 26);

    // Braking bar
    const barW = 160;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(bX + 58, bY + 33, barW, 8);
    const brakeColor = corner.brakingDifficulty >= 9 ? '#e8003d' :
      corner.brakingDifficulty >= 7 ? '#f5a623' : '#00d4aa';
    ctx.fillStyle = brakeColor;
    ctx.fillRect(bX + 58, bY + 33, barW * corner.brakingDifficulty / 10, 8);
    ctx.fillStyle = '#8a8a9a';
    ctx.font = '10px Inter';
    ctx.fillText(`BRAKE ${corner.brakingDifficulty}/10`, bX + 225, bY + 41);

    // Direction
    ctx.fillStyle = '#00d4aa';
    ctx.font = '12px Inter';
    ctx.textAlign = 'right';
    const dirArrow = corner.direction === 'right' ? '↪ RIGHT' : '↩ LEFT';
    ctx.fillText(dirArrow, bX + bW - 10, bY + 26);
    ctx.fillStyle = '#f5a623';
    ctx.fillText(`${corner.exitSpeed} km/h exit`, bX + bW - 10, bY + 42);
    ctx.textAlign = 'left';
  }

  function drawMiniMap(ctx, W, H, corners, state, trackLength) {
    const mW = 120, mH = 120;
    const mX = 10, mY = 10;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, mX, mY, mW, mH, 8);
    ctx.fill();
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 1;
    roundRect(ctx, mX, mY, mW, mH, 8);
    ctx.stroke();

    // Draw corner dots on mini map
    const pad = 12;
    corners.forEach(c => {
      const cx = mX + pad + (c.mapX / 100) * (mW - pad * 2);
      const cy = mY + pad + (c.mapY / 100) * (mH - pad * 2);
      const active = state.currentCorner === c.number;
      ctx.fillStyle = active ? '#e8003d' : 'rgba(245,166,35,0.5)';
      ctx.beginPath();
      ctx.arc(cx, cy, active ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (active) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(c.number, cx, cy + 3);
      }
    });

    // Live bike dot
    const progress = state.position / trackLength;
    // approximate position on mini-map using progress
    const angle = progress * Math.PI * 2 - Math.PI / 2;
    const rx = (mW - pad * 2) * 0.38;
    const ry = (mH - pad * 2) * 0.38;
    const bx = mX + mW / 2 + Math.cos(angle) * rx;
    const by = mY + mH / 2 + Math.sin(angle) * ry;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(bx, by, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#8a8a9a';
    ctx.font = '8px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('TRACK MAP', mX + 4, mY + mH + 12);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function speedToGear(kmh) {
    if (kmh < 60) return 1;
    if (kmh < 110) return 2;
    if (kmh < 160) return 3;
    if (kmh < 210) return 4;
    if (kmh < 270) return 5;
    return 6;
  }

  // ─── State ──────────────────────────────────────────────────────────────────
  function createState() {
    return {
      position: 0,      // position along track (world units)
      speed: 0,
      x: 0,      // lateral position (-1 to 1, 0 = centre)
      currentCorner: null,
      showHints: true,
      demo: false,
      trackLength: 0,
      hintTimer: 300,
    };
  }

  // ─── Input ──────────────────────────────────────────────────────────────────
  function createInput() {
    const keys = {};
    return {
      keys,
      down: (k) => keys[k] = true,
      up: (k) => delete keys[k],
      is: (k) => !!keys[k],
    };
  }

  // ─── Demo AI ────────────────────────────────────────────────────────────────
  function demoAI(state, segments, input) {
    const segIndex = Math.floor(state.position / SEGMENT_LENGTH) % segments.length;
    const seg = segments[segIndex];
    // target speed based on corner severity
    const targetSpeed = seg.curve === 0 ? MAX_SPEED * 0.9 :
      Math.abs(seg.curve) > 2.5 ? MAX_SPEED * 0.22 :
        Math.abs(seg.curve) > 1.5 ? MAX_SPEED * 0.38 :
          Math.abs(seg.curve) > 0.5 ? MAX_SPEED * 0.55 :
            MAX_SPEED * 0.75;

    // Synthesize key presses for demo
    if (state.speed < targetSpeed) {
      input.keys['ArrowUp'] = true;
      delete input.keys['ArrowDown'];
    } else {
      delete input.keys['ArrowUp'];
      if (state.speed - targetSpeed > 50) input.keys['ArrowDown'] = true;
      else delete input.keys['ArrowDown'];
    }
    // Steer to follow road curve
    const targetX = -seg.curve * 0.5;
    if (state.x < targetX - 0.05) {
      input.keys['ArrowRight'] = true;
      delete input.keys['ArrowLeft'];
    } else if (state.x > targetX + 0.05) {
      input.keys['ArrowLeft'] = true;
      delete input.keys['ArrowRight'];
    } else {
      delete input.keys['ArrowLeft'];
      delete input.keys['ArrowRight'];
    }
  }

  // ─── Main Class ─────────────────────────────────────────────────────────────
  class RideEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.segments = [];
      this.corners = [];
      this.state = createState();
      this.input = createInput();
      this.rafId = null;
      this.running = false;
      this.onCornerEntered = null;
      this.onLapComplete = null;
      this._boundKeyDown = this._onKeyDown.bind(this);
      this._boundKeyUp = this._onKeyUp.bind(this);
    }

    init(canvas, corners) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.corners = corners;
      this.segments = buildTrack();
      buildScenery(this.segments);
      this.state.trackLength = this.segments.length * SEGMENT_LENGTH;
      this.state = createState();
      this.state.trackLength = this.segments.length * SEGMENT_LENGTH;
      window.addEventListener('keydown', this._boundKeyDown);
      window.addEventListener('keyup', this._boundKeyUp);
    }

    _onKeyDown(e) {
      this.input.down(e.key);
      if (e.key === 'd' || e.key === 'D') {
        this.state.demo = !this.state.demo;
      }
    }
    _onKeyUp(e) {
      this.input.up(e.key);
    }

    start() {
      this.running = true;
      this.state.showHints = true;
      this.state.hintTimer = 300;
      this._loop();
    }

    stop() {
      this.running = false;
      if (this.rafId) cancelAnimationFrame(this.rafId);
      window.removeEventListener('keydown', this._boundKeyDown);
      window.removeEventListener('keyup', this._boundKeyUp);
    }

    reset() {
      const tl = this.state.trackLength;
      this.state = createState();
      this.state.trackLength = tl;
    }

    _loop() {
      if (!this.running) return;
      this._update();
      this._render();
      this.rafId = requestAnimationFrame(() => this._loop());
    }

    _update() {
      const s = this.state;
      const inp = this.input;

      // Demo AI overrides input
      if (s.demo) {
        demoAI(s, this.segments, inp);
      }

      // Physics
      if (inp.is('ArrowUp')) s.speed = Math.min(s.speed + ACCELERATION, MAX_SPEED);
      if (inp.is('ArrowDown')) s.speed = Math.max(s.speed - BRAKING, 0);
      if (!inp.is('ArrowUp') && !inp.is('ArrowDown')) {
        s.speed = Math.max(s.speed - DECEL, 0);
      }

      // Steering
      const segIndex = Math.floor(s.position / SEGMENT_LENGTH) % this.segments.length;
      const seg = this.segments[segIndex];
      const steerAmt = 0.004 * (s.speed / MAX_SPEED);
      if (inp.is('ArrowLeft')) s.x = Math.max(s.x - steerAmt, -2.5);
      if (inp.is('ArrowRight')) s.x = Math.min(s.x + steerAmt, 2.5);

      // Centrifugal drift from road curve
      s.x -= seg.curve * CENTRIFUGAL * (s.speed / MAX_SPEED) * 0.01;

      // Off-road deceleration
      if (Math.abs(s.x) > 1.0) s.speed *= OFFROAD_DECEL;

      // Advance position
      s.position += s.speed;
      if (s.position >= s.trackLength) {
        s.position -= s.trackLength;
        if (this.onLapComplete) this.onLapComplete();
      }
      if (s.position < 0) s.position = 0;

      // Corner detection
      const prevCorner = s.currentCorner;
      s.currentCorner = seg.cornerIndex;
      if (s.currentCorner !== prevCorner && s.currentCorner && this.onCornerEntered) {
        this.onCornerEntered(this.corners[s.currentCorner - 1]);
      }

      // Hint timer
      if (s.hintTimer > 0) s.hintTimer--;
      else s.showHints = false;
    }

    _render() {
      const ctx = this.ctx;
      const W = this.canvas.width;
      const H = this.canvas.height;
      const s = this.state;
      const segs = this.segments;
      const total = segs.length;

      drawBackground(ctx, W, H);

      const startIndex = Math.floor(s.position / SEGMENT_LENGTH) % total;
      let x = 0;    // accumulated curve offset
      let maxY = H;    // clip: don't draw below previous segment
      let proj = [];

      // First pass: project all visible segments
      for (let i = 0; i < DRAW_DISTANCE; i++) {
        const segIdx = (startIndex + i) % total;
        const seg = segs[segIdx];
        const camera = { x: s.x, y: 0, z: s.position % SEGMENT_LENGTH };

        // Simple projection: distance-based scale
        const dist = i + 1;
        const scale = CAMERA_DEPTH / dist;
        const roadW = ROAD_WIDTH * scale * W / 1600;
        const screenX = (W / 2) + (x - s.x * i * 0.5) * W / 1600;
        const screenY = (H / 2) - (CAMERA_HEIGHT * scale * H / 900);
        const yPos = H * 0.5 + (H * 0.5) * (1 - i / DRAW_DISTANCE);

        proj.push({ seg, screenX, roadW, yPos, scale });
        x += seg.curve;
      }

      // Draw back to front
      for (let i = DRAW_DISTANCE - 1; i >= 1; i--) {
        const p1 = proj[i];
        const p1_next = proj[i - 1];

        // Skip if outside vertical view
        if (p1.yPos < 0 || p1_next.yPos > H) continue;

        const col = p1.seg.color;
        const grass = col === 0 ? COLOR.GRASS1 : COLOR.GRASS2;
        const road = col === 0 ? COLOR.ROAD1 : COLOR.ROAD2;
        const rumble = col === 0 ? COLOR.RUMBLE1 : COLOR.RUMBLE2;

        // Grass strip (full width)
        ctx.fillStyle = grass;
        ctx.fillRect(0, p1.yPos, W, p1_next.yPos - p1.yPos + 1);

        // Rumble strip (wider than road)
        ctx.fillStyle = rumble;
        ctx.beginPath();
        ctx.moveTo(p1.screenX - p1.roadW * 1.2, p1.yPos);
        ctx.lineTo(p1_next.screenX - p1_next.roadW * 1.2, p1_next.yPos);
        ctx.lineTo(p1_next.screenX + p1_next.roadW * 1.2, p1_next.yPos);
        ctx.lineTo(p1.screenX + p1.roadW * 1.2, p1.yPos);
        ctx.closePath();
        ctx.fill();

        // Road surface
        ctx.fillStyle = road;
        ctx.beginPath();
        ctx.moveTo(p1.screenX - p1.roadW, p1.yPos);
        ctx.lineTo(p1_next.screenX - p1_next.roadW, p1_next.yPos);
        ctx.lineTo(p1_next.screenX + p1_next.roadW, p1_next.yPos);
        ctx.lineTo(p1.screenX + p1.roadW, p1.yPos);
        ctx.closePath();
        ctx.fill();

        // Centre dashes
        if (col === 0) {
          ctx.fillStyle = '#ffffff';
          const dashW1 = p1.roadW * 0.03;
          const dashW2 = p1_next.roadW * 0.03;
          ctx.beginPath();
          ctx.moveTo(p1.screenX - dashW1, p1.yPos);
          ctx.lineTo(p1_next.screenX - dashW2, p1_next.yPos);
          ctx.lineTo(p1_next.screenX + dashW2, p1_next.yPos);
          ctx.lineTo(p1.screenX + dashW1, p1.yPos);
          ctx.closePath();
          ctx.fill();
        }

        // Fog overlay (distance fade)
        const fogRatio = i / DRAW_DISTANCE;
        if (fogRatio > 0.45) {
          ctx.fillStyle = `rgba(10,10,20,${(fogRatio - 0.45) * 1.8})`;
          ctx.fillRect(0, p1.yPos, W, p1_next.yPos - p1.yPos + 1);
        }

        // Roadside objects
        if (p1.seg.objLeft) {
          const ox = p1.screenX + p1.seg.objLeft.offset * p1.roadW * 2.2;
          drawObject(ctx, p1.seg.objLeft.type, ox, p1.yPos, p1.scale * 100);
        }
        if (p1.seg.objRight) {
          const ox = p1.screenX + p1.seg.objRight.offset * p1.roadW * 2.2;
          drawObject(ctx, p1.seg.objRight.type, ox, p1.yPos, p1.scale * 100);
        }
      }

      // HUD
      drawHUD(ctx, W, H, s, this.corners);
      drawMiniMap(ctx, W, H, this.corners, s, s.trackLength);
    }
  }

  return RideEngine;
})();

// Make available globally
window.RideEngine = RideEngine;
