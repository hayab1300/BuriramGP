/**
 * ride3d.js — High-Fidelity Pseudo-3D Road Engine
 * Chang International Circuit — Buriram, Thailand
 * 
 * MAJOR OVERHAUL:
 * - Asset-based rendering (PNG sprites)
 * - Spatially accurate track model (Matches SVG/Real GP layout)
 * - Asphalt textures and skid marks
 * - Parallax background
 * - MotoGP-style HUD
 */

'use strict';

const RideEngine = (() => {

  // ─── Constants ──────────────────────────────────────────────────────────────
  const SEGMENT_LENGTH = 200;       // proportional to speed
  const ROAD_WIDTH = 2200;
  const CAMERA_HEIGHT = 1400;
  const CAMERA_DEPTH = 0.84;
  const DRAW_DISTANCE = 300;       // increased for realism
  const RUMBLE_LENGTH = 3;
  const MAX_SPEED = 450;
  const ACCELERATION = 3.2;
  const BRAKING = 12;              // stronger for MotoGP feel
  const DECEL = 2.5;
  const CENTRIFUGAL = 0.35;
  const OFFROAD_DECEL = 0.96;

  // ─── Visual Settings ────────────────────────────────────────────────────────
  const COLOR = {
    GRASS1: '#1b4d24',
    GRASS2: '#133d1c',
    ROAD1: '#26262a',
    ROAD2: '#2b2b2f',
    RUMBLE1: '#e8003d',
    RUMBLE2: '#ffffff',
    STRIPE: '#ffffff',
  };

  // ─── Asset Loader ───────────────────────────────────────────────────────────
  const ASSETS = {
    tree: null,
    grandstand: null,
    sponsor: null,
    skyline: null,
    asphalt: null, // procedural texture
  };

  function loadAssets() {
    const paths = {
      tree: 'assets/thai_tree.png',
      grandstand: 'assets/grandstand.png',
      sponsor: 'assets/sponsor_board.png',
      skyline: 'assets/skyline.png'
    };
    const promises = Object.keys(paths).map(key => {
      return new Promise(resolve => {
        const img = new Image();
        img.onload = () => { ASSETS[key] = img; resolve(); };
        img.onerror = () => { console.warn(`Missing asset: ${paths[key]}`); resolve(); };
        img.src = paths[key];
      });
    });
    return Promise.all(promises);
  }

  // ─── Track Schema: Chang International Circuit ──────────────────────────────
  // We model the 4.5km circuit using 'Zones' to ensure proportions match REALITY.
  // 1 unit of length approx = 200 world units.
  const TRACK_ZONES = [
    { type: 'straight', len: 50 },                           // Start/Finish Straight
    { type: 'corner', len: 35, curve: 1.6, id: 1 },          // T1: Start Hairpin (Right)
    { type: 'straight', len: 20 },                           // Short Exit
    { type: 'corner', len: 25, curve: -0.2, id: 2 },         // T2: Kink (Left)
    { type: 'straight', len: 140 },                          // THE BACK STRAIGHT (~1000m)
    { type: 'corner', len: 45, curve: 2.1, id: 3 },          // T3: The Hammer (Braking Point!)
    { type: 'straight', len: 15 },                           // Transition
    { type: 'corner', len: 30, curve: -1.2, id: 4 },         // T4: Left Hairpin
    { type: 'straight', len: 20 },
    { type: 'corner', len: 35, curve: 1.3, id: 5 },          // T5: Technical Right
    { type: 'straight', len: 10 },
    { type: 'corner', len: 40, curve: -0.9, id: 6 },         // T6: Fast Sweeper Left
    { type: 'straight', len: 25 },
    { type: 'corner', len: 30, curve: 0.8, id: 7 },          // T7: Right Entry to Infield
    { type: 'straight', len: 15 },
    { type: 'corner', len: 45, curve: -0.7, id: 8 },         // T8: Wide Sweeper Left
    { type: 'straight', len: 15 },
    { type: 'corner', len: 30, curve: 1.5, id: 9 },          // T9: Tech Infield Right
    { type: 'straight', len: 5 },
    { type: 'corner', len: 30, curve: -1.4, id: 10 },        // T10: Tech Infield Left
    { type: 'straight', len: 35 },                           // Fast Run
    { type: 'corner', len: 30, curve: 0.9, id: 11 },         // T11: Fast Curve Right
    { type: 'straight', len: 20 },
    { type: 'corner', len: 40, curve: -1.8, id: 12 },        // T12: Final Glory Corner (Left)
    { type: 'straight', len: 20 },                           // Back to S/F
  ];

  function buildTrack() {
    const segments = [];
    let id = 0;

    TRACK_ZONES.forEach(zone => {
      const isCorner = zone.type === 'corner';
      for (let i = 0; i < zone.len; i++) {
        // Smooth in/out of curves
        let curve = 0;
        if (isCorner) {
          const t = i / zone.len;
          curve = zone.curve * Math.sin(t * Math.PI); // Sinusoidal curve curve for realism
        }

        segments.push({
          index: id++,
          curve,
          cornerIndex: isCorner ? zone.id : null,
          color: Math.floor(id / RUMBLE_LENGTH) % 2,
          skid: (isCorner && i < 10) ? Math.random() < 0.3 : false, // Braking skid marks
          objects: []
        });
      }
    });

    // Populate objects
    segments.forEach((seg, i) => {
      // Trees everywhere
      if (i % 8 === 0) {
        seg.objects.push({ type: 'tree', offset: (Math.random() > 0.5 ? 1.8 : -1.8) + (Math.random() * 0.5) });
      }
      // Grandstands at main straights and major corners
      if ((i < 60) || (i > 250 && i < 350) || (i > id - 100)) {
        if (i % 15 === 0) seg.objects.push({ type: 'grandstand', offset: -2.5 });
      }
      // Sponsor boards at curves
      if (seg.cornerIndex && i % 10 === 0) {
        seg.objects.push({ type: 'sponsor', offset: 1.3 });
      }
    });

    return segments;
  }

  // ─── Rendering Engine ───────────────────────────────────────────────────────

  function drawBackground(ctx, W, H, cameraX) {
    if (ASSETS.skyline) {
      // Parallax skyline
      const iw = ASSETS.skyline.width, ih = ASSETS.skyline.height;
      const aspect = iw / ih;
      const drawH = H / 2;
      const drawW = drawH * aspect;
      // Scroll based on camera X
      let scrollX = (cameraX * 50) % drawW;
      ctx.drawImage(ASSETS.skyline, -scrollX, 0, drawW, drawH);
      ctx.drawImage(ASSETS.skyline, -scrollX + drawW, 0, drawW, drawH);
    } else {
      ctx.fillStyle = '#0d0d1e';
      ctx.fillRect(0, 0, W, H / 2);
    }
    ctx.fillStyle = COLOR.GRASS1;
    ctx.fillRect(0, H / 2, W, H / 2);
  }

  function drawTrap(ctx, x1, y1, w1, x2, y2, w2, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1);
    ctx.lineTo(x2 - w2, y2);
    ctx.lineTo(x2 + w2, y2);
    ctx.lineTo(x1 + w1, y1);
    ctx.closePath();
    ctx.fill();
  }

  function drawObject(ctx, obj, x, y, scale) {
    const img = ASSETS[obj.type];
    if (!img) return; // Fallback or wait for load

    const baseH = obj.type === 'tree' ? 500 : obj.type === 'grandstand' ? 400 : 150;
    const h = baseH * scale;
    const w = (img.width / img.height) * h;

    // Center bottom alignment
    const ox = x - w / 2;
    const oy = y - h;

    ctx.drawImage(img, ox, oy, w, h);
  }

  function drawAsphaltNoise(ctx, x, y, w, h) {
    // Subtle static noise to make asphalt feel less 'flat'
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < 3; i++) {
      const nx = x - w + Math.random() * w * 2;
      const ny = y + Math.random() * h;
      ctx.fillRect(nx, ny, 2, 1);
    }
  }

  // ─── HUD (MotoGP Style) ─────────────────────────────────────────────────────

  function drawDashboard(ctx, W, H, state) {
    const spd = Math.abs(state.speed) * 0.28;
    const gear = spd < 60 ? 1 : spd < 110 ? 2 : spd < 160 ? 3 : spd < 220 ? 4 : spd < 280 ? 5 : 6;

    // Bottom dashboard (Glassmorphism look)
    const dW = 340, dH = 100;
    const dx = (W - dW) / 2, dy = H - dH - 20;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(dx, dy, dW, dH, 15);
    ctx.fillStyle = 'rgba(10,10,25,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Speedo
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 50px Rajdhani';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(spd), dx + dW * 0.45, dy + 65);
    ctx.font = '16px Rajdhani';
    ctx.fillStyle = '#8a8a9a';
    ctx.fillText('km/h', dx + dW * 0.45 + 50, dy + 63);

    // Gear
    ctx.fillStyle = '#f5b041';
    ctx.font = 'bold 36px Rajdhani';
    ctx.fillText(gear, dx + 60, dy + 60);
    ctx.font = '12px Inter';
    ctx.fillStyle = '#666';
    ctx.fillText('GEAR', dx + 60, dy + 82);

    // Progress bar
    const prog = state.position / state.trackLength;
    ctx.fillStyle = '#222';
    ctx.fillRect(dx + 20, dy + dH - 12, dW - 40, 4);
    ctx.fillStyle = '#e8003d';
    ctx.fillRect(dx + 20, dy + dH - 12, (dW - 40) * prog, 4);

    ctx.restore();
  }

  // ─── Main Class ─────────────────────────────────────────────────────────────

  class RideEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.segments = [];
      this.corners = [];
      this.state = {
        position: 0,
        speed: 0,
        x: 0,
        currentCorner: null,
        trackLength: 0,
        demo: false
      };
      this.keys = {};
      this.running = false;
    }

    async init(canvas, corners) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.corners = corners;

      await loadAssets(); // Ensure premium assets are ready

      this.segments = buildTrack();
      this.state.trackLength = this.segments.length * SEGMENT_LENGTH;
      this.state.position = 0;
      this.state.speed = 0;
      this.state.x = 0;

      window.addEventListener('keydown', e => {
        this.keys[e.key] = true;
        if (e.key === 'd' || e.key === 'D') this.state.demo = !this.state.demo;
      });
      window.addEventListener('keyup', e => this.keys[e.key] = false);
    }

    start() {
      this.running = true;
      this.loop();
    }

    stop() {
      this.running = false;
    }

    loop() {
      if (!this.running) return;
      this.update();
      this.render();
      requestAnimationFrame(() => this.loop());
    }

    update() {
      const s = this.state;
      const k = this.keys;

      // Demo AI (follows the real path)
      if (s.demo) {
        const seg = this.segments[Math.floor(s.position / SEGMENT_LENGTH) % this.segments.length];
        const targetX = -seg.curve * 0.4;
        if (s.x < targetX) s.x += 0.05;
        if (s.x > targetX) s.x -= 0.05;

        const curveLimit = Math.abs(seg.curve);
        const targetSpeed = curveLimit > 1.0 ? 120 : MAX_SPEED;
        if (s.speed < targetSpeed) s.speed += ACCELERATION;
        else s.speed -= BRAKING;
      } else {
        // Human controls
        if (k['ArrowUp']) s.speed = Math.min(s.speed + ACCELERATION, MAX_SPEED);
        else if (k['ArrowDown']) s.speed = Math.max(s.speed - BRAKING, 0);
        else s.speed = Math.max(s.speed - DECEL, 0);

        const steer = 0.005 * (s.speed / MAX_SPEED);
        if (k['ArrowLeft']) s.x -= steer;
        if (k['ArrowRight']) s.x += steer;
      }

      // Physics logic
      const segIndex = Math.floor(s.position / SEGMENT_LENGTH) % this.segments.length;
      const currSeg = this.segments[segIndex];

      // Centrifugal force
      s.x -= currSeg.curve * CENTRIFUGAL * (s.speed / MAX_SPEED) * 0.01;

      // Off-road penalty
      if (Math.abs(s.x) > 1.0) s.speed *= OFFROAD_DECEL;

      s.position += s.speed;
      if (s.position > s.trackLength) {
        s.position -= s.trackLength;
        if (window.App && window.App.onLapComplete) window.App.onLapComplete();
      }

      s.currentCorner = currSeg.cornerIndex;
    }

    render() {
      const ctx = this.ctx;
      const W = this.canvas.width, H = this.canvas.height;
      const s = this.state;
      const segs = this.segments;

      ctx.clearRect(0, 0, W, H);
      drawBackground(ctx, W, H, s.x);

      const startIndex = Math.floor(s.position / SEGMENT_LENGTH) % segs.length;
      const camHeight = CAMERA_HEIGHT;
      const camZ = s.position % SEGMENT_LENGTH;

      let xAccum = 0;
      const proj = [];

      // Project visible segments
      for (let i = 0; i < DRAW_DISTANCE; i++) {
        const seg = segs[(startIndex + i) % segs.length];
        const scale = CAMERA_DEPTH / (i * SEGMENT_LENGTH + SEGMENT_LENGTH - camZ);
        const screenX = (W / 2) + (xAccum - s.x * i * SEGMENT_LENGTH * scale * 0.5);
        const screenY = (H / 2) + (H / 2 * (1 - i / DRAW_DISTANCE)); // Road stays at bottom half
        const roadW = ROAD_WIDTH * scale * W;
        proj.push({ seg, screenX, screenY, roadW, scale });
        xAccum += seg.curve * 10;
      }

      // Draw segments back-to-front
      for (let i = DRAW_DISTANCE - 1; i > 0; i--) {
        const p1 = proj[i], p2 = proj[i - 1];
        if (p1.screenY < H / 2) continue; // Skip above horizon

        const col = p1.seg.color;
        const grass = col === 0 ? COLOR.GRASS1 : COLOR.GRASS2;
        const road = col === 0 ? COLOR.ROAD1 : COLOR.ROAD2;
        const rumble = col === 0 ? COLOR.RUMBLE1 : COLOR.RUMBLE2;

        // Ground/Grass
        ctx.fillStyle = grass;
        ctx.fillRect(0, p2.screenY, W, p1.screenY - p2.screenY + 1);

        // Road & Rumble
        const rw1 = p1.roadW * 1.15, rw2 = p2.roadW * 1.15;
        drawTrap(ctx, p1.screenX, p1.screenY, rw1, p2.screenX, p2.screenY, rw2, rumble);
        drawTrap(ctx, p1.screenX, p1.screenY, p1.roadW, p2.screenX, p2.screenY, p2.roadW, road);

        // Dashes
        if (col === 0) {
          drawTrap(ctx, p1.screenX, p1.screenY, p1.roadW * 0.05, p2.screenX, p2.screenY, p2.roadW * 0.05, '#fff');
        }

        // Texture Noise
        drawAsphaltNoise(ctx, p1.screenX, p1.screenY, p1.roadW, p1.screenY - p2.screenY);

        // Objects
        p1.seg.objects.forEach(obj => {
          const ox = p1.screenX + obj.offset * p1.roadW * 3;
          drawObject(ctx, obj, ox, p1.screenY, p1.scale * 10);
        });

        // Fog overlay
        const fog = i / DRAW_DISTANCE;
        if (fog > 0.4) {
          ctx.fillStyle = `rgba(15,15,30, ${(fog - 0.4) * 2})`;
          ctx.fillRect(0, p2.screenY, W, p1.screenY - p2.screenY + 1);
        }
      }

      drawDashboard(ctx, W, H, s);

      // Mini-Overlay for corner name
      if (s.currentCorner) {
        const c = this.corners[s.currentCorner - 1];
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(W / 2 - 100, 20, 200, 40);
        ctx.fillStyle = '#e8003d';
        ctx.font = 'bold 20px Rajdhani';
        ctx.textAlign = 'center';
        ctx.fillText(`T${c.number} ${c.name.toUpperCase()}`, W / 2, 48);
      }
    }
  }

  return RideEngine;
})();

window.RideEngine = RideEngine;
