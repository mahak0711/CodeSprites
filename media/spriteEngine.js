// @ts-nocheck
/* Pixel Agent – Top-Down RPG Office Engine */
(function () {
  'use strict';

  const vscode = acquireVsCodeApi();
  const canvas = document.getElementById('spriteCanvas');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('spriteCount');
  const hudHpBar = document.getElementById('hudHpFill');
  const hudEpBar = document.getElementById('hudEpFill');
  const dialogBox = document.getElementById('dialogBox');
  const dialogTitle = document.getElementById('dialogTitle');
  const dialogText = document.getElementById('dialogText');
  const dialogClose = document.getElementById('dialogClose');

  let CONFIG = { maxSprites: 12, spriteSpeed: 1.0, showBubbles: true };

  const PALETTES = [
    { hair: '#3b2415', skin: '#f5c6a0', shirt: '#00f0ff', outline: '#0a0a12' },
    { hair: '#d4a340', skin: '#e8b88a', shirt: '#bf00ff', outline: '#0a0a12' },
    { hair: '#1a1a2e', skin: '#8d5524', shirt: '#3ddc84', outline: '#0a0a12' },
    { hair: '#c0392b', skin: '#fddcb5', shirt: '#ff6b9d', outline: '#0a0a12' },
    { hair: '#f5c6a0', skin: '#c68642', shirt: '#f2cc60', outline: '#0a0a12' },
    { hair: '#6b3fa0', skin: '#fce0c8', shirt: '#3d5afe', outline: '#0a0a12' },
    { hair: '#2c3e50', skin: '#a0785a', shirt: '#ff9800', outline: '#0a0a12' },
    { hair: '#e67e22', skin: '#f0d5b8', shirt: '#e91e63', outline: '#0a0a12' },
  ];

  const TILE = 16, SCALE = 3;
  const DRAW_W = TILE * SCALE, DRAW_H = TILE * SCALE;
  const sprites = new Map();
  let frameTick = 0;

  // ── Top-down sprites (16x16) ──
  const SPRITE_IDLE = [
    '0000OOOOOO000000','000OHHHHHHO00000','000OHHHHHHO00000',
    '00OSSSSSSSSO0000','00OSEPSSEPSO0000','00OSSSSSSSO00000',
    '00OSSSSSSO000000','000OTTTTO0000000','00OTTTTTTO000000',
    '0SOTTTTTTTOS0000','0SOTTTTTTTOS0000','00OTTTTTTO000000',
    '000OTTTTO0000000','000OLLOLLO000000','000OLLOLLO000000',
    '0000OOOOOO000000',
  ];
  const SPRITE_WALK = [
    '0000OOOOOO000000','000OHHHHHHO00000','000OHHHHHHO00000',
    '00OSSSSSSSSO0000','00OSEPSSEPSO0000','00OSSSSSSSO00000',
    '00OSSSSSSO000000','000OTTTTO0000000','00OTTTTTTO000000',
    '0SOTTTTTTTOS0000','0SOTTTTTTTOS0000','00OTTTTTTO000000',
    '000OTTTTO0000000','00OLLOO0OLLO0000','0OLLO000OLLO0000',
    '0OOO00000OOO0000',
  ];

  function getPixelColor(ch, pal) {
    switch (ch) {
      case 'H': return pal.hair;   case 'S': return pal.skin;
      case 'E': return '#f0f6fc';  case 'P': return '#1a1a2e';
      case 'T': return pal.shirt;  case 'O': return pal.outline;
      case 'L': return '#2a2a3e';  default:  return null;
    }
  }

  const C = {
    floorA: '#1a1a2e', floorB: '#16162a', floorLine: 'rgba(0,240,255,0.05)',
    wallTop: '#0d0d1a', wallFace: '#141428',
    nCyan: '#00f0ff', nPurp: '#bf00ff', nBlue: '#3d5afe', nGrn: '#3ddc84',
    dark: '#0a0a12', desk: '#2a2535', deskTop: '#33303e', chair: '#1e1e30',
    monitor: '#0d0d1a', screen: '#0f1a2e',
  };

  // ── Workstations (desk + chair + laptop, agents sit here when active) ──
  const WORKSTATIONS = []; // {x, y, chairX, chairY, occupant: null}
  const DECOR = [];        // non-interactive decorations
  const CLICKABLES = [];   // clickable furniture for dialogs

  function buildLayout(w, h) {
    WORKSTATIONS.length = 0;
    DECOR.length = 0;
    CLICKABLES.length = 0;

    const wallB = 44, pad = 16;
    const floorW = w - pad - 14;
    const floorH = h - wallB - 30;

    // ── 6 Workstations in 2 rows of 3 ──
    const cols = 3, rows = 2;
    const gapX = Math.floor(floorW / (cols + 0.5));
    const gapY = Math.floor(floorH / (rows + 1));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const dx = pad + 20 + c * gapX;
        const dy = wallB + 10 + (r + 0.5) * gapY;
        WORKSTATIONS.push({
          x: dx, y: dy, w: 44, h: 28,
          chairX: dx + 14, chairY: dy + 32,
          occupant: null,
        });
      }
    }

    // ── Bookshelf (top-right against wall) ──
    CLICKABLES.push({
      id: 'bookshelf', label: 'DATABANKS',
      x: w - 62, y: wallB + 2, w: 44, h: 32, color: C.nPurp,
    });

    // ── Coffee station (bottom-left) ──
    CLICKABLES.push({
      id: 'coffee', label: 'COFFEE',
      x: pad + 2, y: h - 68, w: 30, h: 24, color: '#c0813a',
    });

    // ── Whiteboard / mission board (on top wall, center) ──
    CLICKABLES.push({
      id: 'board', label: 'MISSIONS',
      x: w * 0.42, y: wallB - 6, w: 54, h: 18, color: C.nGrn,
    });

    // ── Plants ──
    DECOR.push({ type: 'plant', x: pad + 4,  y: wallB + 8 });
    DECOR.push({ type: 'plant', x: w - 28,   y: h - 60 });
    DECOR.push({ type: 'plant', x: w * 0.5,  y: h - 55 });

    // ── Water cooler ──
    DECOR.push({ type: 'cooler', x: pad + 2, y: wallB + 50 });

    // ── Rug (center) ──
    DECOR.push({ type: 'rug', x: w * 0.35, y: h * 0.55, w: w * 0.3, h: 18 });

    // ── Clock on wall ──
    DECOR.push({ type: 'clock', x: w * 0.2, y: wallB - 4 });

    // ── Ceiling lights ──
    DECOR.push({ type: 'light', x: w * 0.25, y: wallB + 2 });
    DECOR.push({ type: 'light', x: w * 0.65, y: wallB + 2 });
  }

  let hoveredClickable = null;
  let dialogOpen = false;
  let typewriterInterval = null;

  function openDialog(obj) {
    dialogOpen = true;
    dialogBox.classList.add('open');
    dialogTitle.textContent = obj.label;
    const texts = {
      bookshelf: '> Knowledge base loaded.\n> 2,481 indexed entries.\n> Neural pathways optimized.',
      coffee:    '> Brewing cycle complete.\n> Caffeine boost: +20 PWR.\n> Morale increased.',
      board:     '> Active missions scanned.\n> Priority tasks queued.\n> Awaiting agent deployment.',
    };
    const full = texts[obj.id] || '> ...';
    dialogText.textContent = '';
    let i = 0;
    clearInterval(typewriterInterval);
    typewriterInterval = setInterval(() => {
      if (i < full.length) { dialogText.textContent += full[i]; i++; }
      else clearInterval(typewriterInterval);
    }, 20);
  }
  function closeDialog() { dialogOpen = false; dialogBox.classList.remove('open'); clearInterval(typewriterInterval); }
  dialogClose.addEventListener('click', closeDialog);

  // ══════════════════════════════════════
  //  DRAWING
  // ══════════════════════════════════════

  function drawFloor(w, h) {
    ctx.fillStyle = C.dark;
    ctx.fillRect(0, 0, w, h);
    const ts = 24;
    for (let y = 0; y < h; y += ts) {
      for (let x = 0; x < w; x += ts) {
        ctx.fillStyle = ((x + y) / ts) % 2 === 0 ? C.floorA : C.floorB;
        ctx.fillRect(x, y, ts, ts);
      }
    }
    ctx.strokeStyle = C.floorLine;
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += ts) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += ts) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }

  function drawWalls(w, h) {
    ctx.fillStyle = C.wallFace; ctx.fillRect(0, 0, w, 44);
    ctx.fillStyle = C.wallTop;  ctx.fillRect(0, 0, w, 6);
    ctx.fillStyle = C.nCyan;    ctx.fillRect(0, 42, w, 2);
    ctx.fillStyle = 'rgba(0,240,255,0.04)'; ctx.fillRect(0, 32, w, 12);
    // Left wall
    ctx.fillStyle = C.wallFace; ctx.fillRect(0, 0, 14, h);
    ctx.fillStyle = C.wallTop;  ctx.fillRect(0, 0, 4, h);
    ctx.fillStyle = C.nPurp;    ctx.fillRect(12, 44, 2, h - 44);
    ctx.fillStyle = 'rgba(191,0,255,0.04)'; ctx.fillRect(4, 44, 10, h - 44);
  }

  // ── Workstation (desk + chair + laptop) ──
  function drawWorkstation(ws) {
    const { x, y, w, h, chairX, chairY, occupant } = ws;

    // Chair shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(chairX + 2, chairY + 2, 20, 16);
    // Chair
    ctx.fillStyle = C.chair;
    ctx.fillRect(chairX, chairY, 20, 14);
    ctx.fillStyle = '#28283e';
    ctx.fillRect(chairX + 2, chairY + 1, 16, 10);
    // Chair back
    ctx.fillStyle = '#222238';
    ctx.fillRect(chairX + 4, chairY - 4, 12, 6);

    // Desk shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(x + 3, y + 3, w, h);
    // Desk body
    ctx.fillStyle = C.desk;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.deskTop;
    ctx.fillRect(x, y, w, 4);
    // Legs
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 2, y + h - 3, 3, 3);
    ctx.fillRect(x + w - 5, y + h - 3, 3, 3);

    // Laptop
    const lx = x + 6, ly = y + 5, lw = 22, lh = 14;
    ctx.fillStyle = '#333';
    ctx.fillRect(lx, ly, lw, lh);
    ctx.fillStyle = occupant ? '#0f1a2e' : '#111';
    ctx.fillRect(lx + 2, ly + 2, lw - 4, lh - 4);

    if (occupant) {
      // Screen glow
      ctx.fillStyle = 'rgba(0,240,255,0.03)';
      ctx.fillRect(lx - 2, ly - 2, lw + 4, lh + 4);
      // Code lines
      const cc = ['#00f0ff', '#3ddc84', '#bf00ff', '#ff6b9d'];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = cc[i];
        ctx.fillRect(lx + 4, ly + 4 + i * 3, 5 + (i * 4) % 10, 1.5);
      }
      // Cursor blink
      if (Math.floor(frameTick / 25) % 2 === 0) {
        ctx.fillStyle = '#00f0ff';
        ctx.fillRect(lx + 4 + (frameTick % 40) * 0.3, ly + 4 + 9, 2, 2);
      }
    }

    // Keyboard (below laptop)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(lx + 2, ly + lh + 1, lw - 4, 4);
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = '#3a3a3a';
      ctx.fillRect(lx + 4 + k * 3.5, ly + lh + 2, 2.5, 2);
    }

    // Coffee mug on desk
    ctx.fillStyle = '#e8ddd0';
    ctx.fillRect(x + w - 12, y + 6, 5, 6);
    ctx.strokeStyle = '#e8ddd0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + w - 7, y + 9, 2.5, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(x + w - 11, y + 7, 3, 2);

    // Desk neon indicator
    const indicatorColor = occupant ? C.nGrn : '#333';
    ctx.fillStyle = indicatorColor;
    ctx.fillRect(x + w - 4, y + 1, 3, 2);
    if (occupant) {
      ctx.fillStyle = 'rgba(61,220,132,0.15)';
      ctx.fillRect(x + w - 6, y - 1, 7, 6);
    }
  }

  // ── Bookshelf ──
  function drawBookshelf(obj) {
    const { x, y, w, h } = obj;
    const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x + 3, y + 3, w, h);
    ctx.fillStyle = '#2a2020'; ctx.fillRect(x, y, w, h);

    const bColors = ['#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad','#e67e22','#1abc9c','#d35400','#e74c3c','#2ecc71'];
    for (let shelf = 0; shelf < 3; shelf++) {
      const sy = y + 2 + shelf * 10;
      ctx.fillStyle = '#3a2a20'; ctx.fillRect(x + 2, sy + 8, w - 4, 2);
      for (let b = 0; b < 6 && (x + 4 + b * 6) < x + w - 4; b++) {
        ctx.fillStyle = bColors[(shelf * 6 + b) % bColors.length];
        const bh = 6 + (b % 3);
        ctx.fillRect(x + 4 + b * 6, sy + (8 - bh), 4, bh);
      }
    }
    // Border glow
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = hov ? 2 : 1;
    ctx.globalAlpha = hov ? 0.9 : 0.3;
    ctx.strokeRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }

  // ── Coffee Station ──
  function drawCoffeeStation(obj) {
    const { x, y, w, h } = obj;
    const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x + 2, y + 2, w, h);
    // Counter
    ctx.fillStyle = '#3a3028'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#4a4038'; ctx.fillRect(x, y, w, 3);
    // Coffee machine
    ctx.fillStyle = '#555'; ctx.fillRect(x + 4, y + 4, 12, 14);
    ctx.fillStyle = '#333'; ctx.fillRect(x + 6, y + 6, 8, 6);
    // Red light
    const blink = Math.floor(frameTick / 40) % 2 === 0;
    ctx.fillStyle = blink ? '#ff3333' : '#661111';
    ctx.fillRect(x + 7, y + 14, 3, 2);
    // Cups
    ctx.fillStyle = '#e8ddd0';
    ctx.fillRect(x + 20, y + 8, 4, 5);
    ctx.fillRect(x + 24, y + 9, 4, 4);
    // Steam
    if (frameTick % 80 < 40) {
      ctx.fillStyle = 'rgba(200,200,200,0.15)';
      const sy = y + 3 - (frameTick % 20) * 0.3;
      ctx.fillRect(x + 21, sy, 2, 3);
      ctx.fillRect(x + 25, sy + 1, 2, 2);
    }
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = hov ? 2 : 1;
    ctx.globalAlpha = hov ? 0.9 : 0.3;
    ctx.strokeRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }

  // ── Mission Board ──
  function drawMissionBoard(obj) {
    const { x, y, w, h } = obj;
    const hov = hoveredClickable === obj;
    ctx.fillStyle = '#222'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    const mc = [C.nGrn, '#f2cc60', '#ff6b9d', C.nCyan, C.nPurp];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(x + 4 + i * 10, y + 3, 8, 10);
      ctx.fillStyle = mc[i];
      ctx.fillRect(x + 5 + i * 10, y + 4, 6, 2);
      ctx.fillStyle = '#333';
      ctx.fillRect(x + 5 + i * 10, y + 7, 6, 1);
      ctx.fillRect(x + 5 + i * 10, y + 9, 4, 1);
    }
    if (frameTick % 90 < 20) {
      ctx.fillStyle = C.nGrn;
      ctx.fillRect(x + 6 + (frameTick % 40), y + 1, 2, 2);
    }
    ctx.strokeStyle = obj.color;
    ctx.lineWidth = hov ? 2 : 1;
    ctx.globalAlpha = hov ? 0.9 : 0.3;
    ctx.strokeRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }

  // ── Decor Drawing ──
  function drawDecorItem(d) {
    switch (d.type) {
      case 'plant': {
        // Pot
        ctx.fillStyle = '#c0683a';
        ctx.fillRect(d.x, d.y + 6, 12, 10);
        ctx.fillStyle = '#d07a4a';
        ctx.fillRect(d.x - 1, d.y + 6, 14, 3);
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(d.x + 2, d.y + 9, 8, 2);
        // Leaves
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath(); ctx.arc(d.x + 6, d.y + 2, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#27ae60';
        ctx.beginPath(); ctx.arc(d.x + 3, d.y + 4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(d.x + 10, d.y + 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#3ddc84';
        ctx.beginPath(); ctx.arc(d.x + 7, d.y - 2, 3, 0, Math.PI * 2); ctx.fill();
        // Subtle sway
        const sway = Math.sin(frameTick * 0.03 + d.x) * 0.5;
        ctx.fillStyle = '#2ecc71';
        ctx.beginPath(); ctx.arc(d.x + 5 + sway, d.y, 2, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'cooler': {
        ctx.fillStyle = '#ccc'; ctx.fillRect(d.x, d.y + 8, 14, 28);
        ctx.fillStyle = '#a0d8ef';
        ctx.beginPath(); ctx.arc(d.x + 7, d.y + 7, 6, Math.PI, 0); ctx.fill();
        ctx.fillRect(d.x + 1, d.y + 7, 12, 4);
        ctx.fillStyle = '#a0d8ef'; ctx.fillRect(d.x + 4, d.y, 6, 8);
        ctx.fillStyle = '#c0392b'; ctx.fillRect(d.x + 2, d.y + 24, 3, 3);
        ctx.fillStyle = '#2980b9'; ctx.fillRect(d.x + 9, d.y + 24, 3, 3);
        ctx.fillStyle = '#999'; ctx.fillRect(d.x - 1, d.y + 34, 16, 3);
        break;
      }
      case 'rug': {
        ctx.fillStyle = '#2a1525';
        ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeStyle = '#4a2545';
        ctx.lineWidth = 1;
        ctx.strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
        // Diamonds
        ctx.fillStyle = '#4a2545';
        for (let rx = d.x + 8; rx < d.x + d.w - 8; rx += 12) {
          const ry = d.y + d.h / 2;
          ctx.beginPath();
          ctx.moveTo(rx, ry - 4); ctx.lineTo(rx + 4, ry);
          ctx.lineTo(rx, ry + 4); ctx.lineTo(rx - 4, ry);
          ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'clock': {
        const cx = d.x, cy = d.y, r = 8;
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f5f0e8'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        const now = new Date();
        const ha = ((now.getHours() % 12 + now.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2;
        const ma = (now.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5); ctx.stroke();
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ma) * r * 0.7, cy + Math.sin(ma) * r * 0.7); ctx.stroke();
        break;
      }
      case 'light': {
        // Ceiling light glow
        ctx.fillStyle = 'rgba(255,240,200,0.06)';
        ctx.beginPath(); ctx.ellipse(d.x, d.y + 20, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8a8070';
        ctx.fillRect(d.x - 5, d.y - 2, 10, 4);
        ctx.fillStyle = '#ffe8a0';
        ctx.beginPath(); ctx.arc(d.x, d.y + 4, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
    }
  }

  function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function updateHUD() {
    const active = [...sprites.values()].filter(s => s.state === 'active').length;
    const total = sprites.size || 1;
    hudHpBar.style.width = Math.min(100, 60 + active * 15) + '%';
    hudEpBar.style.width = Math.max(10, 100 - total * 8) + '%';
  }

  // ── Sprite Class ──
  class Sprite {
    constructor(name, label) {
      this.name = name;
      this.label = label || name;
      this.palette = PALETTES[Math.abs(hashStr(name)) % PALETTES.length];
      this.x = 80 + Math.random() * 100;
      this.y = 80 + Math.random() * 60;
      this.vx = 0; this.vy = 0;
      this.state = 'idle';
      this.frame = 0; this.frameTick = 0;
      this.direction = 1;
      this.bubble = null; this.bubbleTimer = 0;
      this.idleTimer = randomRange(120, 360);
      this.walkTimer = 0; this.bobOffset = 0;
      this.spawnAnim = 1.0;
      this.jumpY = 0; this.jumpVel = 0;
      this.assignedSeat = null; // workstation index
    }

    update() {
      this.spawnAnim = Math.max(0, this.spawnAnim - 0.03);
      this.frameTick++;

      if (this.jumpVel !== 0 || this.jumpY < 0) {
        this.jumpY += this.jumpVel;
        this.jumpVel += 0.8;
        if (this.jumpY >= 0) { this.jumpY = 0; this.jumpVel = 0; }
      }
      if (this.bubbleTimer > 0) { this.bubbleTimer--; if (this.bubbleTimer <= 0) this.bubble = null; }

      const rect = canvas.getBoundingClientRect();
      const minX = 16, minY = 46;
      const maxX = rect.width - DRAW_W - 14, maxY = rect.height - DRAW_H - 28;

      switch (this.state) {
        case 'idle':
          this.bobOffset = Math.sin(this.frameTick * 0.06) * 1.5;
          this.idleTimer--;
          if (this.idleTimer <= 0) {
            this.state = 'walking';
            const a = Math.random() * Math.PI * 2;
            const spd = (0.3 + Math.random() * 0.5) * CONFIG.spriteSpeed;
            this.vx = Math.cos(a) * spd; this.vy = Math.sin(a) * spd;
            this.direction = this.vx >= 0 ? 1 : -1;
            this.walkTimer = randomRange(90, 240);
          }
          break;
        case 'walking':
          this.bobOffset = Math.sin(this.frameTick * 0.15) * 1;
          this.x += this.vx; this.y += this.vy;
          this.walkTimer--;
          if (this.x < minX) { this.x = minX; this.vx = Math.abs(this.vx); this.direction = 1; }
          if (this.x > maxX) { this.x = maxX; this.vx = -Math.abs(this.vx); this.direction = -1; }
          if (this.y < minY) { this.y = minY; this.vy = Math.abs(this.vy); }
          if (this.y > maxY) { this.y = maxY; this.vy = -Math.abs(this.vy); }
          if (this.frameTick % 10 === 0) this.frame = this.frame === 0 ? 1 : 0;
          if (this.walkTimer <= 0) {
            this.state = 'idle'; this.vx = 0; this.vy = 0;
            this.frame = 0; this.idleTimer = randomRange(120, 360);
          }
          break;
        case 'active':
          // Sit at assigned workstation
          if (this.assignedSeat !== null && WORKSTATIONS[this.assignedSeat]) {
            const ws = WORKSTATIONS[this.assignedSeat];
            const targetX = ws.chairX - 2;
            const targetY = ws.chairY - 6;
            this.x += (targetX - this.x) * 0.08;
            this.y += (targetY - this.y) * 0.08;
          }
          this.bobOffset = Math.sin(this.frameTick * 0.12) * 1;
          break;
      }
    }

    draw() {
      const scale = 1 - this.spawnAnim * 0.5;
      const drawX = this.x, drawY = this.y + this.bobOffset + this.jumpY;

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(drawX + DRAW_W / 2, this.y + DRAW_H - 2, DRAW_W / 3, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      if (this.state === 'active') {
        const pulse = 0.5 + 0.5 * Math.sin(this.frameTick * 0.08);
        ctx.fillStyle = hexToRgba(this.palette.shirt, 0.08 + pulse * 0.08);
        ctx.beginPath();
        ctx.ellipse(drawX + DRAW_W / 2, drawY + DRAW_H / 2, DRAW_W * 0.6, DRAW_H * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(drawX + DRAW_W / 2, drawY + DRAW_H / 2);
      ctx.scale(this.direction * scale, scale);
      ctx.translate(-DRAW_W / 2, -DRAW_H / 2);

      const tpl = this.state === 'walking' && this.frame === 1 ? SPRITE_WALK : SPRITE_IDLE;
      for (let row = 0; row < TILE; row++) {
        const rs = tpl[row]; if (!rs) continue;
        for (let col = 0; col < rs.length; col++) {
          const color = getPixelColor(rs[col], this.palette);
          if (color) { ctx.fillStyle = color; ctx.fillRect(col * SCALE, row * SCALE, SCALE, SCALE); }
        }
      }
      ctx.restore();

      // Name tag
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      const tw = ctx.measureText(this.label).width + 8;
      const tx = drawX + DRAW_W / 2 - tw / 2, ty = drawY - 10;
      ctx.fillStyle = 'rgba(10,10,18,0.85)';
      roundRect(ctx, tx, ty, tw, 12, 3); ctx.fill();
      ctx.strokeStyle = this.palette.shirt; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      roundRect(ctx, tx, ty, tw, 12, 3); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e0e0ff';
      ctx.fillText(this.label, drawX + DRAW_W / 2, ty + 9);

      if (this.bubble && CONFIG.showBubbles) this._drawBubble(drawX + DRAW_W / 2, ty - 4);
    }

    _drawBubble(cx, cy) {
      ctx.font = '10px monospace';
      const bw = ctx.measureText(this.bubble).width + 16, bh = 18;
      const bx = cx - bw / 2, by = cy - bh - 4;
      ctx.globalAlpha = Math.min(1, this.bubbleTimer / 30);
      ctx.fillStyle = '#0d0d1a'; ctx.strokeStyle = C.nCyan; ctx.lineWidth = 1;
      roundRect(ctx, bx, by, bw, bh, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0d0d1a';
      ctx.beginPath(); ctx.moveTo(cx - 3, by + bh); ctx.lineTo(cx, by + bh + 4); ctx.lineTo(cx + 3, by + bh); ctx.fill();
      ctx.fillStyle = '#e0e0ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.bubble, cx, by + bh / 2);
      ctx.globalAlpha = 1;
    }

    showBubble(text) { this.bubble = text.length > 24 ? text.slice(0, 22) + '\u2026' : text; this.bubbleTimer = 180; }

    setActive(active) {
      if (active) {
        this.state = 'active';
        // Find free workstation
        if (this.assignedSeat === null) {
          for (let i = 0; i < WORKSTATIONS.length; i++) {
            if (!WORKSTATIONS[i].occupant) {
              WORKSTATIONS[i].occupant = this.name;
              this.assignedSeat = i;
              break;
            }
          }
        }
      } else {
        // Release seat
        if (this.assignedSeat !== null && WORKSTATIONS[this.assignedSeat]) {
          WORKSTATIONS[this.assignedSeat].occupant = null;
        }
        this.assignedSeat = null;
        this.state = 'idle';
        this.idleTimer = randomRange(60, 180);
      }
    }

    jump() { if (this.jumpY === 0) this.jumpVel = -6; }
  }

  // ── Helpers ──
  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return h; }
  function randomRange(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }

  // ── Resize ──
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
    buildLayout(rect.width, rect.height);
  }

  // ── Main Loop ──
  function loop() {
    frameTick++;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    drawFloor(w, h);
    drawWalls(w, h);

    // Draw decor (below furniture)
    for (const d of DECOR) drawDecorItem(d);

    // Draw workstations
    for (const ws of WORKSTATIONS) drawWorkstation(ws);

    // Draw clickables
    for (const obj of CLICKABLES) {
      if (obj.id === 'bookshelf') drawBookshelf(obj);
      else if (obj.id === 'coffee') drawCoffeeStation(obj);
      else if (obj.id === 'board') drawMissionBoard(obj);
    }

    // Sprites sorted by Y
    const sorted = [...sprites.values()].sort((a, b) => a.y - b.y);
    for (const s of sorted) { s.update(); s.draw(); }

    updateHUD();
    statusEl.textContent = sprites.size + ' agent' + (sprites.size !== 1 ? 's' : '');
    requestAnimationFrame(loop);
  }

  // ── Messages ──
  window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
      case 'config':
        CONFIG.maxSprites = msg.maxSprites ?? CONFIG.maxSprites;
        CONFIG.spriteSpeed = msg.spriteSpeed ?? CONFIG.spriteSpeed;
        CONFIG.showBubbles = msg.showBubbles ?? CONFIG.showBubbles;
        break;
      case 'spawnSprite': {
        if (sprites.size >= CONFIG.maxSprites || sprites.has(msg.name)) break;
        const s = new Sprite(msg.name, msg.label || msg.name);
        if (msg.active) { s.setActive(true); s.showBubble('Hello!'); }
        sprites.set(msg.name, s);
        break;
      }
      case 'despawnSprite': {
        const s = sprites.get(msg.name);
        if (s) { s.setActive(false); sprites.delete(msg.name); }
        break;
      }
      case 'activateSprite': {
        for (const [, s] of sprites) s.setActive(false);
        const t = sprites.get(msg.name);
        if (t) t.setActive(true);
        break;
      }
      case 'spriteActivity': {
        const s = sprites.get(msg.name);
        if (s) { s.setActive(true); if (msg.text) s.showBubble(msg.text); }
        break;
      }
      case 'spriteIdle': {
        const s = sprites.get(msg.name);
        if (s) { s.setActive(false); s.showBubble('Done \u2713'); }
        break;
      }
      case 'resetAll':
        for (const [, s] of sprites) s.setActive(false);
        sprites.clear();
        break;
    }
  });

  // ── Click / Hover ──
  function hitSprite(mx, my) {
    for (const [name, sprite] of sprites) {
      if (mx >= sprite.x && mx <= sprite.x + DRAW_W &&
          my >= sprite.y + sprite.bobOffset + sprite.jumpY &&
          my <= sprite.y + sprite.bobOffset + sprite.jumpY + DRAW_H)
        return { name, sprite };
    }
    return null;
  }
  function hitClickable(mx, my) {
    for (const f of CLICKABLES) {
      if (mx >= f.x && mx <= f.x + f.w && my >= f.y && my <= f.y + f.h) return f;
    }
    return null;
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const hit = hitSprite(mx, my);
    if (hit) { hit.sprite.jump(); hit.sprite.showBubble(hit.sprite.label); vscode.postMessage({ type: 'focusTerminal', name: hit.name }); return; }
    const cl = hitClickable(mx, my);
    if (cl) openDialog(cl);
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    hoveredClickable = hitClickable(mx, my);
    canvas.style.cursor = (hitSprite(mx, my) || hoveredClickable) ? 'pointer' : 'default';
  });

  window.addEventListener('resize', resize);
  resize();
  loop();
  vscode.postMessage({ type: 'ready' });
})();
