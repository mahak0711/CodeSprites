// @ts-nocheck
/* CodeSprites – Canvas Sprite Engine */
(function () {
  'use strict';

  const vscode = acquireVsCodeApi();
  const canvas = document.getElementById('spriteCanvas');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('spriteCount');

  // ── Config ──
  let CONFIG = {
    maxSprites: 12,
    spriteSpeed: 1.0,
    showBubbles: true,
  };

  // ── Palette ──
  const PALETTES = [
    { body: '#58a6ff', eye: '#f0f6fc', outline: '#1f6feb' },
    { body: '#f78166', eye: '#f0f6fc', outline: '#da3633' },
    { body: '#7ee787', eye: '#f0f6fc', outline: '#238636' },
    { body: '#d2a8ff', eye: '#f0f6fc', outline: '#8957e5' },
    { body: '#f2cc60', eye: '#f0f6fc', outline: '#d29922' },
    { body: '#ff9bce', eye: '#f0f6fc', outline: '#db61a2' },
    { body: '#79c0ff', eye: '#f0f6fc', outline: '#388bfd' },
    { body: '#ffa657', eye: '#f0f6fc', outline: '#d18616' },
  ];

  // ── Sprite Size ──
  const SW = 16; // sprite pixel grid width
  const SH = 18; // sprite pixel grid height
  const SCALE = 3;
  const DRAW_W = SW * SCALE;
  const DRAW_H = SH * SCALE;

  // ── Ground ──
  const GROUND_H = 40;

  // ── Sprites Map ──
  const sprites = new Map();

  // ── Pixel Art Templates (16×18 grid, 1=body, 2=eye, 3=outline, 4=highlight) ──
  const SPRITE_IDLE = [
    '0000003333000000',
    '0000031111300000',
    '0003311111133000',
    '0031111111111300',
    '0311111111111130',
    '0311221111221130',
    '0311221111221130',
    '0311111111111130',
    '0031111331111300',
    '0003311111133000',
    '0000311111130000',
    '0000311111130000',
    '0000311111130000',
    '0003311111133000',
    '0003300000033000',
    '0003300000033000',
    '0033300000033300',
    '0033300000033300',
  ];

  const SPRITE_WALK_A = [
    '0000003333000000',
    '0000031111300000',
    '0003311111133000',
    '0031111111111300',
    '0311111111111130',
    '0311221111221130',
    '0311221111221130',
    '0311111111111130',
    '0031111331111300',
    '0003311111133000',
    '0000311111130000',
    '0000311111130000',
    '0000311111130000',
    '0003311111133000',
    '0003300000033000',
    '0033300000003300',
    '0333000000003330',
    '0330000000000330',
  ];

  const SPRITE_WALK_B = [
    '0000003333000000',
    '0000031111300000',
    '0003311111133000',
    '0031111111111300',
    '0311111111111130',
    '0311221111221130',
    '0311221111221130',
    '0311111111111130',
    '0031111331111300',
    '0003311111133000',
    '0000311111130000',
    '0000311111130000',
    '0000311111130000',
    '0003311111133000',
    '0003300000033000',
    '0003300000033000',
    '0003330000333000',
    '0000330000330000',
  ];

  const SPRITE_ACTIVE = [
    '0000003333000000',
    '0000031441300000',
    '0003314111133000',
    '0031141111111300',
    '0311111111111130',
    '0311221111221130',
    '0311221111221130',
    '0311111111111130',
    '0031111111111300',
    '0003311111133000',
    '0000311111130000',
    '0000314441130000',
    '0000311111130000',
    '0003311111133000',
    '0003300000033000',
    '0003300000033000',
    '0033300000033300',
    '0033300000033300',
  ];

  // ── Sprite Class ──
  class Sprite {
    constructor(name, label) {
      this.name = name;
      this.label = label || name;
      this.palette = PALETTES[Math.abs(hashStr(name)) % PALETTES.length];
      this.x = Math.random() * (canvas.width - DRAW_W);
      this.y = 0; // set in resize
      this.vx = 0;
      this.state = 'idle'; // idle | walking | active
      this.frame = 0;
      this.frameTick = 0;
      this.direction = Math.random() > 0.5 ? 1 : -1;
      this.bubble = null;
      this.bubbleTimer = 0;
      this.idleTimer = randomRange(120, 360);
      this.walkTimer = 0;
      this.bobOffset = 0;
      this.spawnAnim = 1.0; // scale-in animation
      this.jumpY = 0;
      this.jumpVel = 0;
    }

    update() {
      this.spawnAnim = Math.max(0, this.spawnAnim - 0.03);
      this.frameTick++;

      // Jump physics
      if (this.jumpVel !== 0 || this.jumpY < 0) {
        this.jumpY += this.jumpVel;
        this.jumpVel += 0.8;
        if (this.jumpY >= 0) {
          this.jumpY = 0;
          this.jumpVel = 0;
        }
      }

      // Bubble decay
      if (this.bubbleTimer > 0) {
        this.bubbleTimer--;
        if (this.bubbleTimer <= 0) {
          this.bubble = null;
        }
      }

      switch (this.state) {
        case 'idle':
          this.bobOffset = Math.sin(this.frameTick * 0.05) * 2;
          this.idleTimer--;
          if (this.idleTimer <= 0) {
            this.state = 'walking';
            this.direction = Math.random() > 0.5 ? 1 : -1;
            this.vx = this.direction * (0.4 + Math.random() * 0.6) * CONFIG.spriteSpeed;
            this.walkTimer = randomRange(90, 240);
          }
          break;

        case 'walking':
          this.bobOffset = Math.sin(this.frameTick * 0.15) * 1.5;
          this.x += this.vx;
          this.walkTimer--;

          // Boundary bounce
          if (this.x < 0) { this.x = 0; this.direction = 1; this.vx = Math.abs(this.vx); }
          if (this.x > canvas.width - DRAW_W) { this.x = canvas.width - DRAW_W; this.direction = -1; this.vx = -Math.abs(this.vx); }

          // Frame animation
          if (this.frameTick % 10 === 0) {
            this.frame = this.frame === 0 ? 1 : 0;
          }

          if (this.walkTimer <= 0) {
            this.state = 'idle';
            this.vx = 0;
            this.frame = 0;
            this.idleTimer = randomRange(120, 360);
          }
          break;

        case 'active':
          this.bobOffset = Math.sin(this.frameTick * 0.2) * 3;
          if (this.frameTick % 8 === 0) {
            this.frame = this.frame === 0 ? 1 : 0;
          }
          break;
      }
    }

    draw() {
      const scale = 1 - this.spawnAnim * 0.5;
      const drawY = this.y + this.bobOffset + this.jumpY;

      ctx.save();
      ctx.translate(this.x + DRAW_W / 2, drawY + DRAW_H);
      ctx.scale(this.direction, 1);
      ctx.scale(scale, scale);
      ctx.translate(-DRAW_W / 2, -DRAW_H);

      // Pick frame
      let template;
      if (this.state === 'active') {
        template = SPRITE_ACTIVE;
      } else if (this.state === 'walking') {
        template = this.frame === 0 ? SPRITE_WALK_A : SPRITE_WALK_B;
      } else {
        template = SPRITE_IDLE;
      }

      // Draw pixels
      for (let row = 0; row < SH; row++) {
        for (let col = 0; col < SW; col++) {
          const px = template[row][col];
          let color = null;
          switch (px) {
            case '1': color = this.palette.body; break;
            case '2': color = this.palette.eye; break;
            case '3': color = this.palette.outline; break;
            case '4': color = '#ffffff'; break;
          }
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(col * SCALE, row * SCALE, SCALE, SCALE);
          }
        }
      }

      // Shadow
      ctx.restore();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(this.x + DRAW_W / 2, this.y + DRAW_H + 4, DRAW_W / 2.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.fillStyle = '#8b949e';
      ctx.font = '10px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.label, this.x + DRAW_W / 2, this.y + DRAW_H + 18);

      // Speech bubble
      if (this.bubble && CONFIG.showBubbles) {
        this._drawBubble(this.x + DRAW_W / 2, drawY - 12);
      }
    }

    _drawBubble(cx, cy) {
      const text = this.bubble;
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      const metrics = ctx.measureText(text);
      const pw = 8;
      const ph = 6;
      const bw = metrics.width + pw * 2;
      const bh = 20;
      const bx = cx - bw / 2;
      const by = cy - bh - 6;

      // Fade based on timer
      const alpha = Math.min(1, this.bubbleTimer / 30);
      ctx.globalAlpha = alpha;

      // Bubble bg
      ctx.fillStyle = '#21262d';
      ctx.strokeStyle = '#30363d';
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, bw, bh, 6);
      ctx.fill();
      ctx.stroke();

      // Tail
      ctx.fillStyle = '#21262d';
      ctx.beginPath();
      ctx.moveTo(cx - 4, by + bh);
      ctx.lineTo(cx, by + bh + 5);
      ctx.lineTo(cx + 4, by + bh);
      ctx.fill();

      // Text
      ctx.fillStyle = '#e6edf3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cx, by + bh / 2);

      ctx.globalAlpha = 1;
    }

    showBubble(text) {
      this.bubble = text.length > 24 ? text.slice(0, 22) + '…' : text;
      this.bubbleTimer = 180;
    }

    setActive(active) {
      if (active) {
        this.state = 'active';
      } else {
        this.state = 'idle';
        this.idleTimer = randomRange(60, 180);
      }
    }

    jump() {
      if (this.jumpY === 0) {
        this.jumpVel = -8;
      }
    }
  }

  // ── Helpers ──
  function hashStr(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash;
  }

  function randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  }

  // ── Ground / Background ──
  function drawBackground() {
    // Sky gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0d1117');
    grad.addColorStop(0.7, '#161b22');
    grad.addColorStop(1, '#1c2128');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars
    ctx.fillStyle = 'rgba(139,148,158,0.3)';
    const starSeed = 42;
    for (let i = 0; i < 40; i++) {
      const sx = ((starSeed * (i + 1) * 7919) % canvas.width);
      const sy = ((starSeed * (i + 1) * 6271) % (canvas.height * 0.5));
      const size = (i % 3 === 0) ? 2 : 1;
      ctx.fillRect(sx, sy, size, size);
    }

    // Ground
    const groundY = canvas.height - GROUND_H;
    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, groundY, canvas.width, GROUND_H);

    // Ground line
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();

    // Ground dots (grass-like)
    ctx.fillStyle = '#238636';
    for (let i = 0; i < canvas.width; i += 12) {
      const h = 2 + ((i * 31) % 4);
      ctx.fillRect(i, groundY - h, 2, h);
    }
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

    // Reposition sprites on ground
    const groundY = rect.height - GROUND_H - DRAW_H - 20;
    for (const [, sprite] of sprites) {
      sprite.y = groundY;
      if (sprite.x > rect.width - DRAW_W) {
        sprite.x = rect.width - DRAW_W;
      }
    }
  }

  // ── Main Loop ──
  function loop() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    drawBackground();

    for (const [, sprite] of sprites) {
      sprite.update();
      sprite.draw();
    }

    statusEl.textContent = sprites.size + ' sprite' + (sprites.size !== 1 ? 's' : '');
    requestAnimationFrame(loop);
  }

  // ── Message Handler ──
  window.addEventListener('message', (event) => {
    const msg = event.data;
    switch (msg.type) {
      case 'config':
        CONFIG.maxSprites = msg.maxSprites ?? CONFIG.maxSprites;
        CONFIG.spriteSpeed = msg.spriteSpeed ?? CONFIG.spriteSpeed;
        CONFIG.showBubbles = msg.showBubbles ?? CONFIG.showBubbles;
        break;

      case 'spawnSprite': {
        if (sprites.size >= CONFIG.maxSprites) { break; }
        if (sprites.has(msg.name)) { break; }
        const rect = canvas.getBoundingClientRect();
        const groundY = rect.height - GROUND_H - DRAW_H - 20;
        const s = new Sprite(msg.name, msg.label || msg.name);
        s.y = groundY;
        if (msg.active) { s.setActive(true); s.showBubble('Hello!'); }
        sprites.set(msg.name, s);
        break;
      }

      case 'despawnSprite':
        sprites.delete(msg.name);
        break;

      case 'activateSprite': {
        // Deactivate all, then activate target
        for (const [, s] of sprites) { s.setActive(false); }
        const target = sprites.get(msg.name);
        if (target) { target.setActive(true); }
        break;
      }

      case 'spriteActivity': {
        const s = sprites.get(msg.name);
        if (s) {
          s.setActive(true);
          if (msg.text) { s.showBubble(msg.text); }
        }
        break;
      }

      case 'spriteIdle': {
        const s = sprites.get(msg.name);
        if (s) { s.setActive(false); s.showBubble('Done ✓'); }
        break;
      }

      case 'resetAll':
        sprites.clear();
        break;
    }
  });

  // ── Click Interaction ──
  function hitTest(mx, my) {
    for (const [name, sprite] of sprites) {
      const sy = sprite.y + sprite.bobOffset + sprite.jumpY;
      if (mx >= sprite.x && mx <= sprite.x + DRAW_W &&
          my >= sy && my <= sy + DRAW_H) {
        return { name, sprite };
      }
    }
    return null;
  }

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = hitTest(mx, my);
    if (hit) {
      hit.sprite.jump();
      hit.sprite.showBubble(hit.sprite.label);
      vscode.postMessage({ type: 'focusTerminal', name: hit.name });
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    canvas.style.cursor = hitTest(mx, my) ? 'pointer' : 'default';
  });

  // ── Init ──
  window.addEventListener('resize', resize);
  resize();
  loop();

  // Tell extension we're ready
  vscode.postMessage({ type: 'ready' });
})();
