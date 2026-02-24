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

  // ── Human Palette (hair, skin, shirt, pants, shoe, outline, eyeWhite, pupil, mouth) ──
  const PALETTES = [
    { hair: '#3b2415', skin: '#f5c6a0', shirt: '#58a6ff', pants: '#3b4252', shoe: '#2e2e2e', outline: '#2a1a0e', eyeWhite: '#f0f6fc', pupil: '#1a1a2e', mouth: '#c96b6b' },
    { hair: '#d4a340', skin: '#e8b88a', shirt: '#f78166', pants: '#4c566a', shoe: '#3b3b3b', outline: '#8b6914', eyeWhite: '#f0f6fc', pupil: '#1a1a2e', mouth: '#c96b6b' },
    { hair: '#1a1a2e', skin: '#8d5524', shirt: '#7ee787', pants: '#2e3440', shoe: '#1a1a1a', outline: '#0d0d1a', eyeWhite: '#f0f6fc', pupil: '#1a1a2e', mouth: '#b85555' },
    { hair: '#c0392b', skin: '#fddcb5', shirt: '#d2a8ff', pants: '#434c5e', shoe: '#2e2e2e', outline: '#8e2b20', eyeWhite: '#f0f6fc', pupil: '#1a1a2e', mouth: '#c96b6b' },
    { hair: '#f5c6a0', skin: '#c68642', shirt: '#f2cc60', pants: '#3b4252', shoe: '#2e2e2e', outline: '#a0825a', eyeWhite: '#f0f6fc', pupil: '#1a1a2e', mouth: '#b85555' },
    { hair: '#6b3fa0', skin: '#fce0c8', shirt: '#ff9bce', pants: '#4c566a', shoe: '#3b3b3b', outline: '#4a2b72', eyeWhite: '#f0f6fc', pupil: '#1a1a2e', mouth: '#c96b6b' },
    { hair: '#2c3e50', skin: '#a0785a', shirt: '#79c0ff', pants: '#2e3440', shoe: '#1a1a1a', outline: '#1a2634', eyeWhite: '#f0f6fc', pupil: '#1a1a2e', mouth: '#b85555' },
    { hair: '#e67e22', skin: '#f0d5b8', shirt: '#ffa657', pants: '#434c5e', shoe: '#2e2e2e', outline: '#a85a18', eyeWhite: '#f0f6fc', pupil: '#1a1a2e', mouth: '#c96b6b' },
  ];

  // ── Sprite Size ──
  const SW = 16; // sprite pixel grid width
  const SH = 18; // sprite pixel grid height
  const SCALE = 3;
  const DRAW_W = SW * SCALE;
  const DRAW_H = SH * SCALE;

  // ── Floor line at 75% canvas height ──
  function getFloorY(h) { return Math.floor(h * 0.75); }

  // ── Sprites Map ──
  const sprites = new Map();

  // ── Human Pixel Art Templates (16x18 grid) ──
  // Legend: 0=transparent, H=hair, S=skin, E=eyeWhite, P=pupil, M=mouth,
  //         T=shirt, L=pants, F=shoe, O=outline, A=arm(skin)
  const SPRITE_IDLE = [
    '0000OOHHHOO00000',  // row 0: top of hair
    '000OHHHHHHHO0000',  // row 1: hair
    '000OHHHHHHHO0000',  // row 2: hair
    '000OHHHHHHHO0000',  // row 3: hair bottom
    '000OSSSSSSSSO000',  // row 4: forehead (skin)
    '000OSEPSSEPSO000',  // row 5: eyes
    '000OSSSSSSSSO000',  // row 6: nose area
    '000OSSSMSSSSO000',  // row 7: mouth
    '0000OSSSSSO00000',  // row 8: chin
    '00000OSSSO000000',  // row 9: neck
    '000OTTTTTTTTO000',  // row 10: shoulders
    '00AOTTTTTTTTOA00',  // row 11: torso + arms
    '00AOTTTTTTTTOA00',  // row 12: torso + arms
    '000OTTTTTTTTO000',  // row 13: torso bottom
    '0000OLLLLLO00000',  // row 14: waist (pants)
    '0000OLLLLLO00000',  // row 15: legs
    '000OLLOOOLLOO000',  // row 16: legs apart
    '000OFFOOOFFOO000',  // row 17: feet (shoes)
  ];

  const SPRITE_WALK_A = [
    '0000OOHHHOO00000',
    '000OHHHHHHHO0000',
    '000OHHHHHHHO0000',
    '000OHHHHHHHO0000',
    '000OSSSSSSSSO000',
    '000OSEPSSEPSO000',
    '000OSSSSSSSSO000',
    '000OSSSMSSSSO000',
    '0000OSSSSSO00000',
    '00000OSSSO000000',
    '000OTTTTTTTTO000',
    '0AOTTTTTTTTTOA00',
    '00AOTTTTTTTTOA00',
    '000OTTTTTTTTO000',
    '0000OLLLLLO00000',
    '000OLLOO0OLLO000',
    '00OLLO0000OLLO00',
    '00OFFO00000FFO00',
  ];

  const SPRITE_WALK_B = [
    '0000OOHHHOO00000',
    '000OHHHHHHHO0000',
    '000OHHHHHHHO0000',
    '000OHHHHHHHO0000',
    '000OSSSSSSSSO000',
    '000OSEPSSEPSO000',
    '000OSSSSSSSSO000',
    '000OSSSMSSSSO000',
    '0000OSSSSSO00000',
    '00000OSSSO000000',
    '000OTTTTTTTTO000',
    '00AOTTTTTTTTOA00',
    '00AOTTTTTTTTOA00',
    '000OTTTTTTTTO000',
    '0000OLLLLLO00000',
    '0000OLLLLLO00000',
    '0000OLLLLLO00000',
    '00000OFFO0000000',
  ];

  // ── Color mapping from template char to palette key ──
  function getPixelColor(ch, palette) {
    switch (ch) {
      case 'H': return palette.hair;
      case 'S': return palette.skin;
      case 'A': return palette.skin; // arms = skin
      case 'E': return palette.eyeWhite;
      case 'P': return palette.pupil;
      case 'M': return palette.mouth;
      case 'T': return palette.shirt;
      case 'L': return palette.pants;
      case 'F': return palette.shoe;
      case 'O': return palette.outline;
      default:  return null;
    }
  }

  // ── Furniture & Room Constants ──
  const ROOM_COLORS = {
    wallTop:     '#2a2520',
    wallBottom:  '#332e28',
    floorLight:  '#6b5b4f',
    floorDark:   '#5a4d42',
    baseboard:   '#3d3530',
    baseboardHL: '#4a4038',
    windowFrame: '#4a4038',
    windowSky1:  '#4a7fb5',
    windowSky2:  '#87ceeb',
    windowSun:   '#ffe066',
    cloud:       'rgba(255,255,255,0.7)',
    curtain:     '#8b3a3a',
    clockFace:   '#f5f0e8',
    clockFrame:  '#4a4038',
    posterFrame: '#4a4038',
    lampMetal:   '#8a8070',
    lampGlow:    'rgba(255,240,200,0.12)',
  };

  // ── Draw Room Background ──
  function drawBackground() {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const floorY = getFloorY(h);

    // ── Wall (top 75%) ──
    const wallGrad = ctx.createLinearGradient(0, 0, 0, floorY);
    wallGrad.addColorStop(0, ROOM_COLORS.wallTop);
    wallGrad.addColorStop(1, ROOM_COLORS.wallBottom);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, w, floorY);

    // Subtle horizontal wall texture lines
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let y = 20; y < floorY; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // ── Floor (bottom 25%) ──
    const floorH = h - floorY;
    ctx.fillStyle = ROOM_COLORS.floorLight;
    ctx.fillRect(0, floorY, w, floorH);

    // Wood plank pattern
    const plankW = 40;
    const plankH = floorH;
    for (let x = 0; x < w; x += plankW) {
      // Alternate plank shade
      ctx.fillStyle = (Math.floor(x / plankW) % 2 === 0) ? ROOM_COLORS.floorLight : ROOM_COLORS.floorDark;
      ctx.fillRect(x, floorY, plankW, plankH);
      // Vertical seam
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, floorY);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    // Staggered horizontal grain lines
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    for (let y = floorY + 10; y < h; y += 12) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // ── Baseboard ──
    const bbH = 8;
    ctx.fillStyle = ROOM_COLORS.baseboard;
    ctx.fillRect(0, floorY - bbH, w, bbH);
    ctx.fillStyle = ROOM_COLORS.baseboardHL;
    ctx.fillRect(0, floorY - bbH, w, 2);

    // ── Wall decorations ──
    drawWindows(w, floorY);
    drawClock(w, floorY);
    drawPoster(w, floorY);
    drawLamp(w, floorY);
  }

  // ── Windows ──
  function drawWindows(w, floorY) {
    const winW = 60;
    const winH = 70;
    const winY = floorY * 0.15;
    const positions = [w * 0.18, w * 0.78];

    for (const wx of positions) {
      const x = wx - winW / 2;
      // Frame
      ctx.fillStyle = ROOM_COLORS.windowFrame;
      ctx.fillRect(x - 4, winY - 4, winW + 8, winH + 8);

      // Sky gradient inside window
      const skyGrad = ctx.createLinearGradient(0, winY, 0, winY + winH);
      skyGrad.addColorStop(0, ROOM_COLORS.windowSky1);
      skyGrad.addColorStop(1, ROOM_COLORS.windowSky2);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(x, winY, winW, winH);

      // Sun
      ctx.fillStyle = ROOM_COLORS.windowSun;
      ctx.beginPath();
      ctx.arc(x + winW * 0.7, winY + 16, 8, 0, Math.PI * 2);
      ctx.fill();

      // Clouds
      ctx.fillStyle = ROOM_COLORS.cloud;
      drawCloud(x + 10, winY + 20, 14);
      drawCloud(x + 35, winY + 30, 10);

      // Cross dividers
      ctx.strokeStyle = ROOM_COLORS.windowFrame;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + winW / 2, winY);
      ctx.lineTo(x + winW / 2, winY + winH);
      ctx.moveTo(x, winY + winH / 2);
      ctx.lineTo(x + winW, winY + winH / 2);
      ctx.stroke();

      // Curtains (simple triangles on sides)
      ctx.fillStyle = ROOM_COLORS.curtain;
      // Left curtain
      ctx.beginPath();
      ctx.moveTo(x - 4, winY - 4);
      ctx.lineTo(x + 10, winY - 4);
      ctx.lineTo(x - 4, winY + winH + 4);
      ctx.fill();
      // Right curtain
      ctx.beginPath();
      ctx.moveTo(x + winW + 4, winY - 4);
      ctx.lineTo(x + winW - 10, winY - 4);
      ctx.lineTo(x + winW + 4, winY + winH + 4);
      ctx.fill();
    }
  }

  function drawCloud(cx, cy, size) {
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.4, cy - size * 0.15, size * 0.4, 0, Math.PI * 2);
    ctx.arc(cx + size * 0.8, cy, size * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Clock ──
  function drawClock(w, floorY) {
    const cx = w * 0.5;
    const cy = floorY * 0.2;
    const r = 18;

    // Frame
    ctx.fillStyle = ROOM_COLORS.clockFrame;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = ROOM_COLORS.clockFace;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Hour ticks
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const inner = r - 4;
      const outer = r - 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }

    // Read system time
    const now = new Date();
    const hours = now.getHours() % 12;
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Hour hand
    const hAngle = ((hours + minutes / 60) / 12) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(hAngle) * (r * 0.5), cy + Math.sin(hAngle) * (r * 0.5));
    ctx.stroke();

    // Minute hand
    const mAngle = ((minutes + seconds / 60) / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(mAngle) * (r * 0.7), cy + Math.sin(mAngle) * (r * 0.7));
    ctx.stroke();

    // Second hand
    const sAngle = (seconds / 60) * Math.PI * 2 - Math.PI / 2;
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(sAngle) * (r * 0.75), cy + Math.sin(sAngle) * (r * 0.75));
    ctx.stroke();

    // Center dot
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Poster / Picture Frame ──
  function drawPoster(w, floorY) {
    const px = w * 0.38;
    const py = floorY * 0.14;
    const pw = 36;
    const ph = 28;

    // Frame
    ctx.fillStyle = ROOM_COLORS.posterFrame;
    ctx.fillRect(px - 3, py - 3, pw + 6, ph + 6);

    // Canvas background
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(px, py, pw, ph);

    // Mini pixel landscape: mountains
    ctx.fillStyle = '#4a8c5c';
    ctx.beginPath();
    ctx.moveTo(px, py + ph);
    ctx.lineTo(px + 10, py + 8);
    ctx.lineTo(px + 20, py + ph);
    ctx.fill();

    ctx.fillStyle = '#3a7c4c';
    ctx.beginPath();
    ctx.moveTo(px + 12, py + ph);
    ctx.lineTo(px + 24, py + 6);
    ctx.lineTo(px + pw, py + ph);
    ctx.fill();

    // Snow caps
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(px + 10, py + 8);
    ctx.lineTo(px + 8, py + 12);
    ctx.lineTo(px + 12, py + 12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 24, py + 6);
    ctx.lineTo(px + 22, py + 10);
    ctx.lineTo(px + 26, py + 10);
    ctx.fill();

    // Mini sun
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(px + pw - 8, py + 7, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Ceiling Lamp ──
  function drawLamp(w, floorY) {
    const lx = w * 0.5;

    // Cord
    ctx.strokeStyle = ROOM_COLORS.lampMetal;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, 30);
    ctx.stroke();

    // Shade (trapezoid)
    ctx.fillStyle = ROOM_COLORS.lampMetal;
    ctx.beginPath();
    ctx.moveTo(lx - 6, 30);
    ctx.lineTo(lx + 6, 30);
    ctx.lineTo(lx + 14, 42);
    ctx.lineTo(lx - 14, 42);
    ctx.closePath();
    ctx.fill();

    // Bulb glow
    ctx.fillStyle = ROOM_COLORS.lampGlow;
    ctx.beginPath();
    ctx.ellipse(lx, 44, 50, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Bulb
    ctx.fillStyle = '#ffe8a0';
    ctx.beginPath();
    ctx.arc(lx, 44, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Furniture Drawing ──
  function drawFurniture(w, floorY) {
    drawRug(w, floorY);
    drawBookshelf(w, floorY);
    drawDesk(w * 0.22, floorY);
    drawDesk(w * 0.68, floorY);
    drawPlant(w, floorY);
    drawWaterCooler(w, floorY);
  }

  // ── Rug ──
  function drawRug(w, floorY) {
    const rw = Math.min(w * 0.4, 180);
    const rh = 20;
    const rx = (w - rw) / 2;
    const ry = floorY - 2;

    // Main rug
    ctx.fillStyle = '#7b3f3f';
    ctx.fillRect(rx, ry, rw, rh);

    // Border
    ctx.strokeStyle = '#a85555';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 2, ry + 2, rw - 4, rh - 4);

    // Diamond pattern
    ctx.fillStyle = '#a85555';
    const diamondSize = 4;
    for (let x = rx + 10; x < rx + rw - 10; x += 14) {
      const dy = ry + rh / 2;
      ctx.beginPath();
      ctx.moveTo(x, dy - diamondSize);
      ctx.lineTo(x + diamondSize, dy);
      ctx.lineTo(x, dy + diamondSize);
      ctx.lineTo(x - diamondSize, dy);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── Bookshelf ──
  function drawBookshelf(w, floorY) {
    const bx = w * 0.9;
    const bw = 36;
    const bh = 80;
    const by = floorY - bh;

    // Shelf frame
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(bx, by, bw, bh);

    // Shelf dividers (3 shelves)
    ctx.fillStyle = '#6b5040';
    const shelfH = bh / 3;
    for (let i = 0; i <= 3; i++) {
      ctx.fillRect(bx, by + i * shelfH - 1, bw, 3);
    }

    // Books on each shelf
    const bookColors = [
      ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad'],
      ['#e74c3c', '#3498db', '#e67e22', '#1abc9c'],
      ['#d35400', '#2ecc71', '#9b59b6', '#f1c40f', '#2c3e50'],
    ];
    for (let shelf = 0; shelf < 3; shelf++) {
      let x = bx + 3;
      const sy = by + shelf * shelfH + 3;
      const maxBookH = shelfH - 6;
      const colors = bookColors[shelf];
      for (let b = 0; b < colors.length && x < bx + bw - 5; b++) {
        const bookW = 4 + ((b * 3) % 3);
        const bookH = maxBookH - 2 - ((b * 7) % 4);
        ctx.fillStyle = colors[b];
        ctx.fillRect(x, sy + (maxBookH - bookH), bookW, bookH);
        x += bookW + 1;
      }
    }
  }

  // ── Desk ──
  function drawDesk(deskCenterX, floorY) {
    const dw = 70;
    const dh = 36;
    const dx = deskCenterX - dw / 2;
    const dy = floorY - dh;

    // Desk legs
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(dx + 4, dy + 6, 4, dh - 6);
    ctx.fillRect(dx + dw - 8, dy + 6, 4, dh - 6);

    // Desk surface
    ctx.fillStyle = '#7a6a5a';
    ctx.fillRect(dx, dy, dw, 6);
    // Surface highlight
    ctx.fillStyle = '#8a7a6a';
    ctx.fillRect(dx, dy, dw, 2);

    // Monitor
    const mx = dx + dw / 2 - 14;
    const my = dy - 24;
    const mw = 28;
    const mh = 20;
    // Monitor stand
    ctx.fillStyle = '#555';
    ctx.fillRect(dx + dw / 2 - 2, dy - 4, 4, 4);
    ctx.fillRect(dx + dw / 2 - 6, dy - 2, 12, 2);
    // Monitor body
    ctx.fillStyle = '#333';
    ctx.fillRect(mx, my, mw, mh);
    // Screen
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(mx + 2, my + 2, mw - 4, mh - 4);
    // Fake code lines on screen
    const codeColors = ['#7ee787', '#58a6ff', '#d2a8ff', '#f78166', '#f2cc60'];
    for (let line = 0; line < 5; line++) {
      const lw = 6 + ((line * 7) % 12);
      ctx.fillStyle = codeColors[line % codeColors.length];
      ctx.fillRect(mx + 4, my + 4 + line * 3, Math.min(lw, mw - 8), 1.5);
    }

    // Keyboard
    ctx.fillStyle = '#444';
    ctx.fillRect(dx + dw / 2 - 10, dy - 3, 20, 3);
    ctx.fillStyle = '#555';
    for (let k = 0; k < 8; k++) {
      ctx.fillRect(dx + dw / 2 - 9 + k * 2.5, dy - 2.5, 1.5, 1.5);
    }

    // Coffee mug
    const mugX = dx + dw - 14;
    const mugY = dy - 8;
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(mugX, mugY, 6, 8);
    // Mug handle
    ctx.strokeStyle = '#e8e0d0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mugX + 6, mugY + 4, 3, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    // Coffee
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(mugX + 1, mugY + 1, 4, 3);
  }

  // ── Potted Plant ──
  function drawPlant(w, floorY) {
    const px = w * 0.55;
    const potW = 14;
    const potH = 16;
    const potY = floorY - potH;

    // Pot (trapezoid)
    ctx.fillStyle = '#c0683a';
    ctx.beginPath();
    ctx.moveTo(px - potW / 2 + 2, potY);
    ctx.lineTo(px + potW / 2 - 2, potY);
    ctx.lineTo(px + potW / 2, floorY);
    ctx.lineTo(px - potW / 2, floorY);
    ctx.closePath();
    ctx.fill();
    // Pot rim
    ctx.fillStyle = '#d07a4a';
    ctx.fillRect(px - potW / 2, potY, potW, 3);

    // Soil
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(px - potW / 2 + 2, potY + 3, potW - 4, 3);

    // Foliage (green circles)
    ctx.fillStyle = '#2ecc71';
    drawLeafCluster(px, potY - 6, 8);
    ctx.fillStyle = '#27ae60';
    drawLeafCluster(px - 4, potY - 3, 5);
    drawLeafCluster(px + 5, potY - 4, 6);
    ctx.fillStyle = '#3ddc84';
    drawLeafCluster(px + 2, potY - 10, 5);
    drawLeafCluster(px - 3, potY - 9, 4);
  }

  function drawLeafCluster(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Water Cooler ──
  function drawWaterCooler(w, floorY) {
    const cx = w * 0.06;
    const coolerW = 16;
    const coolerH = 40;
    const cy = floorY - coolerH;

    // Body
    ctx.fillStyle = '#ccc';
    ctx.fillRect(cx, cy + 10, coolerW, coolerH - 10);

    // Water bottle (rounded top)
    ctx.fillStyle = '#a0d8ef';
    ctx.beginPath();
    ctx.arc(cx + coolerW / 2, cy + 8, coolerW / 2 - 1, Math.PI, 0);
    ctx.fillRect(cx + 1, cy + 8, coolerW - 2, 6);
    ctx.fill();

    // Bottle neck
    ctx.fillStyle = '#a0d8ef';
    ctx.fillRect(cx + coolerW / 2 - 3, cy, 6, 10);

    // Spigots
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(cx + 2, cy + coolerH - 14, 4, 3);
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(cx + coolerW - 6, cy + coolerH - 14, 4, 3);

    // Base
    ctx.fillStyle = '#999';
    ctx.fillRect(cx - 1, floorY - 4, coolerW + 2, 4);
  }

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

      // Active glow (pulsing ellipse behind sprite)
      if (this.state === 'active') {
        const glowPulse = 0.5 + 0.5 * Math.sin(this.frameTick * 0.08);
        const glowAlpha = 0.15 + glowPulse * 0.15;
        const glowRadX = DRAW_W * 0.7 + glowPulse * 6;
        const glowRadY = DRAW_H * 0.35 + glowPulse * 4;
        ctx.fillStyle = `rgba(88,166,255,${glowAlpha})`;
        ctx.beginPath();
        ctx.ellipse(this.x + DRAW_W / 2, drawY + DRAW_H * 0.5, glowRadX, glowRadY, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      ctx.translate(this.x + DRAW_W / 2, drawY + DRAW_H);
      ctx.scale(this.direction, 1);
      ctx.scale(scale, scale);
      ctx.translate(-DRAW_W / 2, -DRAW_H);

      // Pick frame
      let template;
      if (this.state === 'walking') {
        template = this.frame === 0 ? SPRITE_WALK_A : SPRITE_WALK_B;
      } else {
        template = SPRITE_IDLE;
      }

      // Draw pixels
      for (let row = 0; row < SH; row++) {
        const rowStr = template[row];
        if (!rowStr) { continue; }
        for (let col = 0; col < rowStr.length; col++) {
          const color = getPixelColor(rowStr[col], this.palette);
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
      ctx.fillStyle = '#d8d0c0';
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
      this.bubble = text.length > 24 ? text.slice(0, 22) + '\u2026' : text;
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

  // ── Resize ──
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    // Reposition sprites on floor
    const floorY = getFloorY(rect.height);
    const spriteGroundY = floorY - DRAW_H;
    for (const [, sprite] of sprites) {
      sprite.y = spriteGroundY;
      if (sprite.x > rect.width - DRAW_W) {
        sprite.x = rect.width - DRAW_W;
      }
    }
  }

  // ── Main Loop ──
  function loop() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    const floorY = getFloorY(rect.height);

    // 1. Room background (wall, floor, baseboard) + wall decorations
    drawBackground();

    // 2. Furniture
    drawFurniture(rect.width, floorY);

    // 3. Sprites
    for (const [, sprite] of sprites) {
      sprite.update();
      sprite.draw();
    }

    statusEl.textContent = sprites.size + ' agent' + (sprites.size !== 1 ? 's' : '');
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
        const floorY = getFloorY(rect.height);
        const spriteGroundY = floorY - DRAW_H;
        const s = new Sprite(msg.name, msg.label || msg.name);
        s.y = spriteGroundY;
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
        if (s) { s.setActive(false); s.showBubble('Done \u2713'); }
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
