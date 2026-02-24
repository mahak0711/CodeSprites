// @ts-nocheck
/* Pixel Agent – Top-Down RPG Sprite Engine */
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

  // ── Palette (top-down characters: hair, skin, shirt, outline) ──
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

  const TILE = 16;
  const SCALE = 3;
  const DRAW_W = TILE * SCALE;
  const DRAW_H = TILE * SCALE;

  const sprites = new Map();
  let frameTick = 0;

  // ── Top-down sprite templates (16x16, facing down) ──
  // O=outline, H=hair, S=skin, T=shirt, E=eyeWhite, P=pupil
  const SPRITE_DOWN_IDLE = [
    '0000OOOOOO000000',
    '000OHHHHHHO00000',
    '000OHHHHHHO00000',
    '00OSSSSSSSSO0000',
    '00OSEPSSEPSO0000',
    '00OSSSSSSSO00000',
    '00OSSSSSSO000000',
    '000OTTTTO0000000',
    '00OTTTTTTO000000',
    '0SOTTTTTTTOS0000',
    '0SOTTTTTTTOS0000',
    '00OTTTTTTO000000',
    '000OTTTTO0000000',
    '000OLLOLLO000000',
    '000OLLOLLO000000',
    '0000OOOOOO000000',
  ];

  const SPRITE_DOWN_WALK = [
    '0000OOOOOO000000',
    '000OHHHHHHO00000',
    '000OHHHHHHO00000',
    '00OSSSSSSSSO0000',
    '00OSEPSSEPSO0000',
    '00OSSSSSSSO00000',
    '00OSSSSSSO000000',
    '000OTTTTO0000000',
    '00OTTTTTTO000000',
    '0SOTTTTTTTOS0000',
    '0SOTTTTTTTOS0000',
    '00OTTTTTTO000000',
    '000OTTTTO0000000',
    '00OLLOO0OLLO0000',
    '0OLLO000OLLO0000',
    '0OOO00000OOO0000',
  ];

  function getPixelColor(ch, pal) {
    switch (ch) {
      case 'H': return pal.hair;
      case 'S': return pal.skin;
      case 'E': return '#f0f6fc';
      case 'P': return '#1a1a2e';
      case 'T': return pal.shirt;
      case 'O': return pal.outline;
      case 'L': return '#2a2a3e';
      default:  return null;
    }
  }

  // ── Tile Colors (cyberpunk lab) ──
  const C = {
    floorA:   '#1a1a2e',
    floorB:   '#16162a',
    floorLine:'rgba(0,240,255,0.06)',
    wallTop:  '#0d0d1a',
    wallFace: '#141428',
    wallLine: 'rgba(0,240,255,0.08)',
    neonCyan: '#00f0ff',
    neonPurp: '#bf00ff',
    neonBlue: '#3d5afe',
    neonGrn:  '#3ddc84',
    dark:     '#0a0a12',
  };

  // ── Interactive furniture objects ──
  const FURNITURE = [];

  function buildFurniture(w, h) {
    FURNITURE.length = 0;
    const cx = w / 2, cy = h / 2;
    FURNITURE.push(
      { id: 'desk',     label: 'TERMINAL',   x: cx - 60, y: cy - 60, w: 56, h: 40, color: C.neonCyan },
      { id: 'bookshelf',label: 'DATABANKS',  x: w - 70,  y: 46,      w: 44, h: 36, color: C.neonPurp },
      { id: 'console',  label: 'CONFIG',     x: 16,      y: cy - 20, w: 40, h: 36, color: C.neonBlue },
      { id: 'board',    label: 'MISSIONS',   x: cx + 30, y: 46,      w: 48, h: 32, color: C.neonGrn  },
    );
  }

  let hoveredFurniture = null;

  // ── Dialog State ──
  let dialogOpen = false;
  let typewriterInterval = null;

  function openDialog(furn) {
    dialogOpen = true;
    dialogBox.classList.add('open');
    dialogTitle.textContent = furn.label;
    // Typewriter text
    const texts = {
      desk:      '> Accessing main terminal...\n> All systems nominal.\n> Agents connected and operational.',
      bookshelf: '> Knowledge base loaded.\n> 2,481 indexed entries.\n> Neural pathways optimized.',
      console:   '> System configuration panel.\n> Adjust agent parameters.\n> All modules green.',
      board:     '> Active missions scanned.\n> Priority tasks queued.\n> Awaiting agent deployment.',
    };
    const full = texts[furn.id] || '> ...';
    dialogText.textContent = '';
    let i = 0;
    clearInterval(typewriterInterval);
    typewriterInterval = setInterval(() => {
      if (i < full.length) { dialogText.textContent += full[i]; i++; }
      else { clearInterval(typewriterInterval); }
    }, 20);
  }

  function closeDialog() {
    dialogOpen = false;
    dialogBox.classList.remove('open');
    clearInterval(typewriterInterval);
  }

  dialogClose.addEventListener('click', closeDialog);

  // ── Draw Tiled Floor ──
  function drawFloor(w, h) {
    // Dark base
    ctx.fillStyle = C.dark;
    ctx.fillRect(0, 0, w, h);

    // Checker tiles
    const ts = 24;
    for (let y = 0; y < h; y += ts) {
      for (let x = 0; x < w; x += ts) {
        ctx.fillStyle = ((x + y) / ts) % 2 === 0 ? C.floorA : C.floorB;
        ctx.fillRect(x, y, ts, ts);
      }
    }
    // Grid lines
    ctx.strokeStyle = C.floorLine;
    ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += ts) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y <= h; y += ts) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  }

  // ── Draw Walls (top-down: top & left walls) ──
  function drawWalls(w, h) {
    // Top wall
    ctx.fillStyle = C.wallFace;
    ctx.fillRect(0, 0, w, 40);
    ctx.fillStyle = C.wallTop;
    ctx.fillRect(0, 0, w, 6);
    // Neon strip on top wall
    ctx.fillStyle = C.neonCyan;
    ctx.fillRect(0, 38, w, 2);
    ctx.fillStyle = 'rgba(0,240,255,0.06)';
    ctx.fillRect(0, 28, w, 12);

    // Left wall
    ctx.fillStyle = C.wallFace;
    ctx.fillRect(0, 0, 12, h);
    ctx.fillStyle = C.wallTop;
    ctx.fillRect(0, 0, 4, h);
    ctx.fillStyle = C.neonPurp;
    ctx.fillRect(10, 40, 2, h - 40);
    ctx.fillStyle = 'rgba(191,0,255,0.05)';
    ctx.fillRect(4, 40, 8, h - 40);
  }

  // ── Draw Furniture ──
  function drawFurnitureObjects(w, h) {
    for (const f of FURNITURE) {
      const hovered = (hoveredFurniture === f);
      const pulse = 0.5 + 0.5 * Math.sin(frameTick * 0.06);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(f.x + 3, f.y + 3, f.w, f.h);

      // Body
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(f.x, f.y, f.w, f.h);

      // Border glow
      const glowAlpha = hovered ? 0.8 : 0.25 + pulse * 0.15;
      ctx.strokeStyle = f.color;
      ctx.lineWidth = hovered ? 2 : 1;
      ctx.globalAlpha = glowAlpha;
      ctx.strokeRect(f.x, f.y, f.w, f.h);
      ctx.globalAlpha = 1;

      // Hover glow aura
      if (hovered) {
        ctx.fillStyle = f.color.replace(')', ',0.08)').replace('rgb', 'rgba').replace('#', '');
        // Convert hex to rgba for glow
        const gc = hexToRgba(f.color, 0.08);
        ctx.fillStyle = gc;
        ctx.fillRect(f.x - 4, f.y - 4, f.w + 8, f.h + 8);
      }

      // Interior detail per type
      drawFurnitureDetail(f);

      // Label
      ctx.font = '8px monospace';
      ctx.fillStyle = f.color;
      ctx.globalAlpha = hovered ? 1 : 0.7;
      ctx.textAlign = 'center';
      ctx.fillText(f.label, f.x + f.w / 2, f.y + f.h + 10);
      ctx.globalAlpha = 1;
    }
  }

  function drawFurnitureDetail(f) {
    const x = f.x, y = f.y, w = f.w, h = f.h;
    switch (f.id) {
      case 'desk': {
        // Monitor
        ctx.fillStyle = '#0d0d1a';
        ctx.fillRect(x + 8, y + 4, w - 16, h - 18);
        ctx.fillStyle = '#0f1a2e';
        ctx.fillRect(x + 10, y + 6, w - 20, h - 22);
        // Code lines
        const cc = ['#00f0ff', '#3ddc84', '#bf00ff', '#ff6b9d'];
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = cc[i];
          ctx.fillRect(x + 12, y + 8 + i * 4, 8 + (i * 5) % 14, 2);
        }
        // Keyboard
        ctx.fillStyle = '#222';
        ctx.fillRect(x + 12, y + h - 10, w - 24, 6);
        for (let k = 0; k < 6; k++) {
          ctx.fillStyle = '#333';
          ctx.fillRect(x + 14 + k * 4, y + h - 9, 3, 2);
        }
        // Blinking cursor on screen
        if (Math.floor(frameTick / 30) % 2 === 0) {
          ctx.fillStyle = '#00f0ff';
          ctx.fillRect(x + 12 + (frameTick % 60) * 0.3, y + 8 + 12, 2, 3);
        }
        break;
      }
      case 'bookshelf': {
        // Shelves with books
        const bColors = ['#c0392b','#2980b9','#27ae60','#f39c12','#8e44ad','#e67e22','#1abc9c','#d35400'];
        for (let shelf = 0; shelf < 3; shelf++) {
          const sy = y + 4 + shelf * 10;
          ctx.fillStyle = '#2a2020';
          ctx.fillRect(x + 3, sy + 8, w - 6, 2);
          for (let b = 0; b < 5; b++) {
            ctx.fillStyle = bColors[(shelf * 5 + b) % bColors.length];
            ctx.fillRect(x + 5 + b * 7, sy, 5, 8);
          }
        }
        break;
      }
      case 'console': {
        // Control panel lights
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            const on = ((r + c + Math.floor(frameTick / 40)) % 3) === 0;
            ctx.fillStyle = on ? C.neonBlue : '#1a1a2e';
            ctx.fillRect(x + 8 + c * 10, y + 6 + r * 10, 6, 6);
          }
        }
        // Slider
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 6, y + h - 8, w - 12, 3);
        ctx.fillStyle = C.neonBlue;
        const sliderX = x + 6 + ((frameTick * 0.3) % (w - 18));
        ctx.fillRect(sliderX, y + h - 9, 6, 5);
        break;
      }
      case 'board': {
        // Mission cards
        const mColors = [C.neonGrn, '#f2cc60', '#ff6b9d', C.neonCyan];
        for (let i = 0; i < 4; i++) {
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(x + 4 + i * 11, y + 4, 9, 14);
          ctx.fillStyle = mColors[i];
          ctx.fillRect(x + 5 + i * 11, y + 5, 7, 2);
          ctx.fillStyle = '#333';
          ctx.fillRect(x + 5 + i * 11, y + 9, 7, 1);
          ctx.fillRect(x + 5 + i * 11, y + 12, 5, 1);
        }
        // Sparkle
        if (frameTick % 60 < 15) {
          ctx.fillStyle = C.neonGrn;
          const sx = x + 10 + (frameTick % 30);
          ctx.fillRect(sx, y + 2, 2, 2);
        }
        break;
      }
    }
  }

  function hexToRgba(hex, a) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ── HUD Update ──
  function updateHUD() {
    const active = [...sprites.values()].filter(s => s.state === 'active').length;
    const total = sprites.size || 1;
    const hp = Math.min(100, 60 + active * 15);
    const ep = Math.max(10, 100 - total * 8);
    hudHpBar.style.width = hp + '%';
    hudEpBar.style.width = ep + '%';
  }

  // ── Sprite Class ──
  class Sprite {
    constructor(name, label) {
      this.name = name;
      this.label = label || name;
      this.palette = PALETTES[Math.abs(hashStr(name)) % PALETTES.length];
      this.x = 80 + Math.random() * 120;
      this.y = 80 + Math.random() * 80;
      this.vx = 0;
      this.vy = 0;
      this.state = 'idle';
      this.frame = 0;
      this.frameTick = 0;
      this.direction = 1;
      this.bubble = null;
      this.bubbleTimer = 0;
      this.idleTimer = randomRange(120, 360);
      this.walkTimer = 0;
      this.bobOffset = 0;
      this.spawnAnim = 1.0;
      this.jumpY = 0;
      this.jumpVel = 0;
    }

    update() {
      this.spawnAnim = Math.max(0, this.spawnAnim - 0.03);
      this.frameTick++;

      if (this.jumpVel !== 0 || this.jumpY < 0) {
        this.jumpY += this.jumpVel;
        this.jumpVel += 0.8;
        if (this.jumpY >= 0) { this.jumpY = 0; this.jumpVel = 0; }
      }

      if (this.bubbleTimer > 0) {
        this.bubbleTimer--;
        if (this.bubbleTimer <= 0) this.bubble = null;
      }

      const rect = canvas.getBoundingClientRect();
      const maxX = rect.width - DRAW_W - 14;
      const maxY = rect.height - DRAW_H - 30;
      const minX = 14;
      const minY = 42;

      switch (this.state) {
        case 'idle':
          this.bobOffset = Math.sin(this.frameTick * 0.06) * 1.5;
          this.idleTimer--;
          if (this.idleTimer <= 0) {
            this.state = 'walking';
            const angle = Math.random() * Math.PI * 2;
            const spd = (0.3 + Math.random() * 0.5) * CONFIG.spriteSpeed;
            this.vx = Math.cos(angle) * spd;
            this.vy = Math.sin(angle) * spd;
            this.direction = this.vx >= 0 ? 1 : -1;
            this.walkTimer = randomRange(90, 240);
          }
          break;

        case 'walking':
          this.bobOffset = Math.sin(this.frameTick * 0.15) * 1;
          this.x += this.vx;
          this.y += this.vy;
          this.walkTimer--;

          if (this.x < minX) { this.x = minX; this.vx = Math.abs(this.vx); this.direction = 1; }
          if (this.x > maxX) { this.x = maxX; this.vx = -Math.abs(this.vx); this.direction = -1; }
          if (this.y < minY) { this.y = minY; this.vy = Math.abs(this.vy); }
          if (this.y > maxY) { this.y = maxY; this.vy = -Math.abs(this.vy); }

          if (this.frameTick % 10 === 0) this.frame = this.frame === 0 ? 1 : 0;

          if (this.walkTimer <= 0) {
            this.state = 'idle';
            this.vx = 0; this.vy = 0;
            this.frame = 0;
            this.idleTimer = randomRange(120, 360);
          }
          break;

        case 'active':
          this.bobOffset = Math.sin(this.frameTick * 0.2) * 2;
          if (this.frameTick % 8 === 0) this.frame = this.frame === 0 ? 1 : 0;
          break;
      }
    }

    draw() {
      const scale = 1 - this.spawnAnim * 0.5;
      const drawX = this.x;
      const drawY = this.y + this.bobOffset + this.jumpY;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(drawX + DRAW_W / 2, this.y + DRAW_H - 2, DRAW_W / 3, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Active glow
      if (this.state === 'active') {
        const pulse = 0.5 + 0.5 * Math.sin(this.frameTick * 0.08);
        ctx.fillStyle = hexToRgba(this.palette.shirt, 0.1 + pulse * 0.1);
        ctx.beginPath();
        ctx.ellipse(drawX + DRAW_W / 2, drawY + DRAW_H / 2, DRAW_W * 0.7, DRAW_H * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(drawX + DRAW_W / 2, drawY + DRAW_H / 2);
      ctx.scale(this.direction * scale, scale);
      ctx.translate(-DRAW_W / 2, -DRAW_H / 2);

      const template = this.state === 'walking' && this.frame === 1
        ? SPRITE_DOWN_WALK : SPRITE_DOWN_IDLE;

      for (let row = 0; row < TILE; row++) {
        const rowStr = template[row];
        if (!rowStr) continue;
        for (let col = 0; col < rowStr.length; col++) {
          const color = getPixelColor(rowStr[col], this.palette);
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(col * SCALE, row * SCALE, SCALE, SCALE);
          }
        }
      }
      ctx.restore();

      // Name tag
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      // Tag bg
      const tw = ctx.measureText(this.label).width + 8;
      const tx = drawX + DRAW_W / 2 - tw / 2;
      const ty = drawY - 10;
      ctx.fillStyle = 'rgba(10,10,18,0.85)';
      roundRect(ctx, tx, ty, tw, 12, 3);
      ctx.fill();
      ctx.strokeStyle = this.palette.shirt;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.6;
      roundRect(ctx, tx, ty, tw, 12, 3);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#e0e0ff';
      ctx.fillText(this.label, drawX + DRAW_W / 2, ty + 9);

      // Bubble
      if (this.bubble && CONFIG.showBubbles) {
        this._drawBubble(drawX + DRAW_W / 2, ty - 4);
      }
    }

    _drawBubble(cx, cy) {
      const text = this.bubble;
      ctx.font = '10px monospace';
      const metrics = ctx.measureText(text);
      const bw = metrics.width + 16;
      const bh = 18;
      const bx = cx - bw / 2;
      const by = cy - bh - 4;

      const alpha = Math.min(1, this.bubbleTimer / 30);
      ctx.globalAlpha = alpha;

      ctx.fillStyle = '#0d0d1a';
      ctx.strokeStyle = C.neonCyan;
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, bw, bh, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0d0d1a';
      ctx.beginPath();
      ctx.moveTo(cx - 3, by + bh);
      ctx.lineTo(cx, by + bh + 4);
      ctx.lineTo(cx + 3, by + bh);
      ctx.fill();

      ctx.fillStyle = '#e0e0ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, by + bh / 2);
      ctx.globalAlpha = 1;
    }

    showBubble(text) {
      this.bubble = text.length > 24 ? text.slice(0, 22) + '\u2026' : text;
      this.bubbleTimer = 180;
    }
    setActive(a) {
      if (a) { this.state = 'active'; }
      else { this.state = 'idle'; this.idleTimer = randomRange(60, 180); }
    }
    jump() { if (this.jumpY === 0) this.jumpVel = -6; }
  }

  // ── Helpers ──
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return h;
  }
  function randomRange(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    c.lineTo(x+r,y+h); c.quadraticCurveTo(x,y+h,x,y+h-r);
    c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y);
    c.closePath();
  }

  // ── Resize ──
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    buildFurniture(rect.width, rect.height);
  }

  // ── Main Loop ──
  function loop() {
    frameTick++;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    drawFloor(w, h);
    drawWalls(w, h);
    drawFurnitureObjects(w, h);

    // Sort sprites by y for depth
    const sorted = [...sprites.values()].sort((a, b) => a.y - b.y);
    for (const sprite of sorted) {
      sprite.update();
      sprite.draw();
    }

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
      case 'despawnSprite': sprites.delete(msg.name); break;
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
      case 'resetAll': sprites.clear(); break;
    }
  });

  // ── Click / Hover ──
  function hitTestSprite(mx, my) {
    for (const [name, sprite] of sprites) {
      if (mx >= sprite.x && mx <= sprite.x + DRAW_W &&
          my >= sprite.y + sprite.bobOffset + sprite.jumpY &&
          my <= sprite.y + sprite.bobOffset + sprite.jumpY + DRAW_H) {
        return { name, sprite };
      }
    }
    return null;
  }

  function hitTestFurniture(mx, my) {
    for (const f of FURNITURE) {
      if (mx >= f.x && mx <= f.x + f.w && my >= f.y && my <= f.y + f.h) return f;
    }
    return null;
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;

    const hit = hitTestSprite(mx, my);
    if (hit) {
      hit.sprite.jump();
      hit.sprite.showBubble(hit.sprite.label);
      vscode.postMessage({ type: 'focusTerminal', name: hit.name });
      return;
    }
    const furn = hitTestFurniture(mx, my);
    if (furn) {
      openDialog(furn);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const spriteHit = hitTestSprite(mx, my);
    hoveredFurniture = hitTestFurniture(mx, my);
    canvas.style.cursor = (spriteHit || hoveredFurniture) ? 'pointer' : 'default';
  });

  // ── Init ──
  window.addEventListener('resize', resize);
  resize();
  loop();
  vscode.postMessage({ type: 'ready' });
})();
