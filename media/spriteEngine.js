// @ts-nocheck
/* Pixel Agent – L-Shaped Apartment Office */
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
    { hair: '#5b3a1a', skin: '#f5c6a0', shirt: '#5b9bd5', pants: '#3a5070', shoe: '#4a3a2a', outline: '#3a2a10' },
    { hair: '#e0a830', skin: '#e8b88a', shirt: '#e06060', pants: '#6a3a3a', shoe: '#5a3020', outline: '#8a6a10' },
    { hair: '#2a2a2a', skin: '#8d5524', shirt: '#5dbe5d', pants: '#3a5a3a', shoe: '#3a3a3a', outline: '#1a1a1a' },
    { hair: '#c04040', skin: '#fddcb5', shirt: '#b07de0', pants: '#5a3a6a', shoe: '#4a3040', outline: '#7a2020' },
    { hair: '#f0c080', skin: '#c68642', shirt: '#e0c040', pants: '#6a5a30', shoe: '#5a4020', outline: '#a08040' },
    { hair: '#8050b0', skin: '#fce0c8', shirt: '#50a0e0', pants: '#3050a0', shoe: '#3a3a5a', outline: '#5030a0' },
    { hair: '#405060', skin: '#a0785a', shirt: '#e09030', pants: '#5a4a30', shoe: '#3a3020', outline: '#2a3040' },
    { hair: '#d07020', skin: '#f0d5b8', shirt: '#e05080', pants: '#6a3050', shoe: '#5a2030', outline: '#904010' },
  ];

  const TILE = 16, SCALE = 3;
  const DRAW_W = TILE * SCALE, DRAW_H = TILE * SCALE;
  const sprites = new Map();
  let frameTick = 0;

  const SPRITE_IDLE = [
    '0000OOOOOO000000','000OHHHHHHO00000','000OHHHHHHO00000',
    '00OSSSSSSSSO0000','00OSEPSSEPSO0000','00OSSSMSSSO00000',
    '00OSSSSSSO000000','000OTTTTO0000000','00OTTTTTTO000000',
    '0SOTTTTTTTOS0000','0SOTTTTTTTOS0000','00OTTTTTTO000000',
    '000OLLLLO0000000','000OLLOLLO000000','000OLLOLLO000000',
    '000ORRORRO000000',
  ];
  const SPRITE_WALK = [
    '0000OOOOOO000000','000OHHHHHHO00000','000OHHHHHHO00000',
    '00OSSSSSSSSO0000','00OSEPSSEPSO0000','00OSSSMSSSO00000',
    '00OSSSSSSO000000','000OTTTTO0000000','00OTTTTTTO000000',
    '0SOTTTTTTTOS0000','0SOTTTTTTTOS0000','00OTTTTTTO000000',
    '000OLLLLO0000000','00OLLOO0OLLO0000','0OLLO000OLLO0000',
    '0ORR00000RRO0000',
  ];

  function getPixelColor(ch, pal) {
    switch (ch) {
      case 'H': return pal.hair;   case 'S': return pal.skin;
      case 'E': return '#f0f0f0';  case 'P': return '#2a2a30';
      case 'M': return '#cc6666';  case 'T': return pal.shirt;
      case 'O': return pal.outline; case 'L': return pal.pants;
      case 'R': return pal.shoe;   default: return null;
    }
  }

  // ── Colors ──
  const C = {
    wallTop: '#e8dcc8', wallMid: '#ddd0b8', wallBot: '#d4c4a8',
    wallTrim: '#b8a080', wallAccent: '#c8b898', wallOuter: '#c0b090',
    woodA: '#c8a060', woodB: '#b89050', woodLine: 'rgba(80,50,20,0.12)',
    tileA: '#d8d0c0', tileB: '#ccc4b4', tileLine: 'rgba(100,80,60,0.08)',
    carpetA: '#8aaa6a', carpetB: '#7a9a5a',
    deskWood: '#a07840', deskTop: '#b88850', deskLeg: '#705028',
    chairSeat: '#7a5830', chairBack: '#6a4a28',
    sofaBrown: '#8a6040', sofaCush: '#a07858', sofaArm: '#6a4a30',
    shelfWood: '#8a6a3a', shelfBack: '#705830',
    monitorBody: '#444', monitorScreen: '#1a2a3a', monitorStand: '#555',
    laptopBody: '#555', laptopScreen: '#1a2a3a', laptopKey: '#3a3a3a',
    pcCase: '#505050', pcFront: '#404040',
    green: '#5dbe5d', red: '#e06060', blue: '#5b9bd5',
    yellow: '#e0c040', purple: '#b07de0', orange: '#e09030',
    white: '#f0f0e8', cream: '#f0e8d0', brown: '#6a4a2a',
    sky: '#80c8f0', grass: '#5daa3a', grassDark: '#4a9a30', grassLight: '#70c050',
    potTerra: '#c07040', potRim: '#d08850',
    mugWhite: '#f0e8e0', mugHandle: '#d0c8b8',
    coffeeBody: '#666', coffeeDark: '#444',
    waterBlue: '#a0d8f0', waterBody: '#ddd',
    pathStone: '#c8b898', pathStoneDark: '#b0a080',
    fence: '#8a6a3a', fenceLight: '#a08050',
    roofTile: '#b06040', roofDark: '#904830',
    brickA: '#c08060', brickB: '#b07050', brickLine: 'rgba(90,50,30,0.15)',
  };

  // ═══════════════════════════════════════
  //  L-SHAPED APARTMENT LAYOUT
  //
  //  ┌────────────────────────────────┐
  //  │         OFFICE + DEV LAB       │  <- top floor (full width)
  //  │    (wood)     │    (tile)      │
  //  ├───────────────┤  ┌─────────────┘
  //  │    LOUNGE     │  │  GARDEN
  //  │   (carpet)    │  │ (outdoor)
  //  └───────────────┘  │
  //                     └──────────
  // ═══════════════════════════════════════

  let layout = null;

  function buildLayout(w, h) {
    const WS = [], DECOR = [], CLICK = [];
    const wallH = 38;
    const statusH = 24;
    const splitY = Math.floor(h * 0.48);   // horizontal split
    const splitX = Math.floor(w * 0.55);    // vertical split for bottom
    const dividerX = Math.floor(w * 0.5);   // divider in top floor
    const floorY = wallH;
    const floorBot = h - statusH;

    // Save L-shape bounds for collision
    const bounds = { wallH, splitY, splitX, floorBot, dividerX, statusH };

    // ════════════════════════
    //  TOP FLOOR: OFFICE (left) + DEV LAB (right)
    // ════════════════════════

    // OFFICE workstations (3 desks)
    const od1x = 14, od1y = floorY + 18;
    const od2x = 14, od2y = floorY + 68;
    const od3x = dividerX * 0.5 + 10, od3y = floorY + 42;
    WS.push({ x: od1x, y: od1y, type: 'desk-monitor', chairX: od1x + 14, chairY: od1y + 28, occupant: null });
    WS.push({ x: od2x, y: od2y, type: 'desk-monitor', chairX: od2x + 14, chairY: od2y + 28, occupant: null });
    WS.push({ x: od3x, y: od3y, type: 'desk-laptop',  chairX: od3x + 14, chairY: od3y + 28, occupant: null });

    // Office decor
    DECOR.push({ type: 'window', x: 16, y: 5, w: 34, h: 26 });
    DECOR.push({ type: 'window', x: dividerX * 0.55, y: 5, w: 34, h: 26 });
    DECOR.push({ type: 'clock', x: dividerX * 0.35, y: 16 });
    DECOR.push({ type: 'plant-large', x: 6, y: splitY - 42 });
    DECOR.push({ type: 'filing-cabinet', x: dividerX - 32, y: floorY + 6 });
    DECOR.push({ type: 'trash-can', x: od1x + 52, y: od1y + 18 });
    DECOR.push({ type: 'coat-rack', x: dividerX - 20, y: splitY - 50 });
    DECOR.push({ type: 'wall-shelf', x: 60, y: 8, w: 30 });
    DECOR.push({ type: 'zone-label', x: dividerX * 0.35, y: floorY + 8, text: 'OFFICE' });
    DECOR.push({ type: 'ceiling-light', x: dividerX * 0.35, y: floorY });
    DECOR.push({ type: 'power-strip', x: od1x + 2, y: od1y + 24 });

    // DEV LAB workstations (3 desks)
    const dl1x = dividerX + 14, dl1y = floorY + 18;
    const dl2x = dividerX + 14, dl2y = floorY + 68;
    const dl3x = (dividerX + w) * 0.5 + 4, dl3y = floorY + 42;
    WS.push({ x: dl1x, y: dl1y, type: 'desk-pc', chairX: dl1x + 14, chairY: dl1y + 28, occupant: null });
    WS.push({ x: dl2x, y: dl2y, type: 'desk-pc', chairX: dl2x + 14, chairY: dl2y + 28, occupant: null });
    WS.push({ x: dl3x, y: dl3y, type: 'desk-laptop', chairX: dl3x + 14, chairY: dl3y + 28, occupant: null });

    // Dev lab decor
    CLICK.push({ id: 'server', label: 'SERVER RACK', x: w - 34, y: floorY + 4, w: 24, h: 50, color: C.blue });
    DECOR.push({ type: 'whiteboard', x: dividerX + 16, y: 4, w: 56, h: 28 });
    DECOR.push({ type: 'plant-small', x: w - 20, y: splitY - 32 });
    DECOR.push({ type: 'poster', x: w - 48, y: 6, w: 26, h: 20 });
    DECOR.push({ type: 'zone-label', x: (dividerX + w) * 0.5, y: floorY + 8, text: 'DEV LAB' });
    DECOR.push({ type: 'ceiling-light', x: (dividerX + w) * 0.5, y: floorY });
    DECOR.push({ type: 'cable-tray', x: dl1x + 40, y: dl1y + 6, h: 16 });
    DECOR.push({ type: 'printer', x: w - 36, y: splitY - 40 });

    // ════════════════════════
    //  BOTTOM-LEFT: LOUNGE
    // ════════════════════════

    // Lounge workstations (2 desks)
    WS.push({ x: 14, y: splitY + 22, type: 'desk-laptop', chairX: 28, chairY: splitY + 50, occupant: null });
    WS.push({ x: splitX * 0.45, y: splitY + 18, type: 'desk-laptop', chairX: splitX * 0.45 + 14, chairY: splitY + 46, occupant: null });

    // Lounge furniture
    CLICK.push({ id: 'coffee', label: 'COFFEE MACHINE', x: splitX - 38, y: splitY + 6, w: 26, h: 34, color: C.orange });
    CLICK.push({ id: 'bookshelf', label: 'BOOKSHELF', x: 8, y: splitY + 4, w: 44, h: 36, color: C.brown });
    DECOR.push({ type: 'sofa', x: 18, y: floorBot - 48 });
    DECOR.push({ type: 'coffee-table', x: 24, y: floorBot - 74 });
    DECOR.push({ type: 'rug', x: 10, y: floorBot - 84, w: splitX * 0.6, h: 22 });
    DECOR.push({ type: 'plant-large', x: splitX - 22, y: floorBot - 42 });
    DECOR.push({ type: 'plant-small', x: 6, y: floorBot - 30 });
    DECOR.push({ type: 'water-cooler', x: splitX * 0.6, y: splitY + 6 });
    DECOR.push({ type: 'tv-screen', x: splitX * 0.5, y: splitY + 4, w: 30, h: 20 });
    DECOR.push({ type: 'bean-bag', x: splitX * 0.35, y: floorBot - 50 });
    DECOR.push({ type: 'zone-label', x: splitX * 0.35, y: splitY + 12, text: 'LOUNGE' });
    DECOR.push({ type: 'ceiling-light', x: splitX * 0.4, y: splitY + 2 });
    DECOR.push({ type: 'magazine-rack', x: 80, y: floorBot - 36 });
    DECOR.push({ type: 'umbrella-stand', x: splitX - 16, y: floorBot - 24 });

    // ════════════════════════
    //  BOTTOM-RIGHT: OUTDOOR GARDEN
    // ════════════════════════
    DECOR.push({ type: 'tree', x: w - 40, y: splitY + 20 });
    DECOR.push({ type: 'tree-small', x: splitX + 30, y: floorBot - 50 });
    DECOR.push({ type: 'bush', x: splitX + 10, y: splitY + 40 });
    DECOR.push({ type: 'bush', x: w - 24, y: floorBot - 38 });
    DECOR.push({ type: 'bush', x: splitX + 50, y: floorBot - 30 });
    DECOR.push({ type: 'garden-bench', x: splitX + 40, y: splitY + 60 });
    DECOR.push({ type: 'flower-bed', x: splitX + 8, y: splitY + 16, w: 30 });
    DECOR.push({ type: 'flower-bed', x: w - 40, y: floorBot - 20, w: 34 });
    DECOR.push({ type: 'garden-path', x: splitX + 20, y: splitY + 30, h: floorBot - splitY - 34 });
    DECOR.push({ type: 'bird', x: w - 50, y: splitY + 30 });
    DECOR.push({ type: 'fence-section', x: splitX + 4, y: splitY + 4, len: floorBot - splitY - 8, dir: 'v' });
    DECOR.push({ type: 'fence-section', x: splitX + 4, y: floorBot - 4, len: w - splitX - 8, dir: 'h' });
    DECOR.push({ type: 'lamp-post', x: splitX + 60, y: splitY + 14 });

    return { workstations: WS, decor: DECOR, clickables: CLICK, bounds };
  }

  let hoveredClickable = null;
  let dialogOpen = false;
  let typewriterInterval = null;

  function openDialog(obj) {
    dialogOpen = true; dialogBox.classList.add('open');
    dialogTitle.textContent = obj.label;
    const texts = {
      bookshelf: 'Library loaded!\n2,481 entries indexed.\nKnowledge is power!',
      coffee:    'Brewing fresh coffee...\nEnergy +20!\nMorale boost activated.',
      server:    'Server rack humming.\nAll 8 nodes operational.\nUptime: 99.97%',
    };
    const full = texts[obj.id] || 'Inspecting...';
    dialogText.textContent = ''; let i = 0;
    clearInterval(typewriterInterval);
    typewriterInterval = setInterval(() => {
      if (i < full.length) { dialogText.textContent += full[i]; i++; }
      else clearInterval(typewriterInterval);
    }, 25);
  }
  function closeDialog() { dialogOpen = false; dialogBox.classList.remove('open'); clearInterval(typewriterInterval); }
  dialogClose.addEventListener('click', closeDialog);

  // ══════════════════════════
  //  DRAWING — APARTMENT SHELL
  // ══════════════════════════

  function drawApartmentShell(w, h) {
    if (!layout) return;
    const b = layout.bounds;
    const ts = 16;

    // ── OUTDOOR BACKGROUND (fill everything first) ──
    const skyG = ctx.createLinearGradient(0, 0, 0, h);
    skyG.addColorStop(0, '#70b8e0'); skyG.addColorStop(0.35, C.sky);
    skyG.addColorStop(0.4, '#a0d8a0'); skyG.addColorStop(1, C.grass);
    ctx.fillStyle = skyG;
    ctx.fillRect(0, 0, w, h);

    // Grass texture in garden area
    for (let gy = b.splitY; gy < b.floorBot; gy += 8) {
      for (let gx = b.splitX; gx < w; gx += 8) {
        ctx.fillStyle = ((gx + gy) % 16 < 8) ? C.grass : C.grassDark;
        ctx.fillRect(gx, gy, 8, 8);
      }
    }
    // Grass tufts
    ctx.fillStyle = C.grassLight;
    for (let i = 0; i < 20; i++) {
      const gx = b.splitX + 10 + ((i * 37) % (w - b.splitX - 20));
      const gy = b.splitY + 10 + ((i * 53) % (b.floorBot - b.splitY - 20));
      ctx.fillRect(gx, gy, 2, 3);
      ctx.fillRect(gx + 3, gy + 1, 2, 2);
    }

    // Sun + clouds in the sky area (top-right above garden)
    ctx.fillStyle = '#f0d840';
    ctx.beginPath(); ctx.arc(w - 30, 20, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(240,216,64,0.15)';
    ctx.beginPath(); ctx.arc(w - 30, 20, 18, 0, Math.PI * 2); ctx.fill();
    // Clouds
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const cx1 = b.splitX + 20 + (frameTick * 0.015) % (w - b.splitX);
    ctx.beginPath(); ctx.arc(cx1, b.splitY - 20, 8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx1 + 10, b.splitY - 24, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx1 + 5, b.splitY - 26, 5, 0, Math.PI * 2); ctx.fill();

    // ── TOP FLOOR AREA ──

    // Office floor (wood) — left half of top
    for (let y = b.wallH; y < b.splitY; y += ts) {
      for (let x = 0; x < b.dividerX; x += ts) {
        ctx.fillStyle = ((Math.floor(x / ts) + Math.floor((y - b.wallH) / ts)) % 2 === 0) ? C.woodA : C.woodB;
        ctx.fillRect(x, y, ts, ts);
      }
    }
    ctx.strokeStyle = C.woodLine; ctx.lineWidth = 0.8;
    for (let y = b.wallH; y < b.splitY; y += ts) {
      for (let x = 0; x < b.dividerX; x += ts) {
        const off = (Math.floor(x / ts) % 2) * (ts / 2);
        ctx.beginPath(); ctx.moveTo(x, y + off + ts * 0.35); ctx.lineTo(x + ts, y + off + ts * 0.35); ctx.stroke();
      }
    }

    // Dev lab floor (tile) — right half of top
    for (let y = b.wallH; y < b.splitY; y += ts) {
      for (let x = b.dividerX; x < w; x += ts) {
        ctx.fillStyle = ((Math.floor(x / ts) + Math.floor((y - b.wallH) / ts)) % 2 === 0) ? C.tileA : C.tileB;
        ctx.fillRect(x, y, ts, ts);
      }
    }
    ctx.strokeStyle = C.tileLine; ctx.lineWidth = 0.4;
    for (let x = b.dividerX; x <= w; x += ts) {
      ctx.beginPath(); ctx.moveTo(x, b.wallH); ctx.lineTo(x, b.splitY); ctx.stroke();
    }
    for (let y = b.wallH; y <= b.splitY; y += ts) {
      ctx.beginPath(); ctx.moveTo(b.dividerX, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Lounge floor (carpet) — bottom-left
    for (let y = b.splitY; y < b.floorBot; y += ts) {
      for (let x = 0; x < b.splitX; x += ts) {
        ctx.fillStyle = ((Math.floor(x / ts) + Math.floor((y - b.splitY) / ts)) % 2 === 0) ? C.carpetA : C.carpetB;
        ctx.fillRect(x, y, ts, ts);
      }
    }

    // ── WALLS ──

    // Top wall (full width)
    const wg = ctx.createLinearGradient(0, 0, 0, b.wallH);
    wg.addColorStop(0, C.wallTop); wg.addColorStop(0.5, C.wallMid); wg.addColorStop(1, C.wallBot);
    ctx.fillStyle = wg; ctx.fillRect(0, 0, w, b.wallH);
    ctx.fillStyle = C.wallAccent; ctx.fillRect(0, b.wallH - 6, w, 6);
    ctx.fillStyle = C.wallTrim; ctx.fillRect(0, 0, w, 3);
    ctx.fillStyle = C.wallTrim; ctx.fillRect(0, b.wallH - 1, w, 1);
    // Panel lines
    ctx.strokeStyle = 'rgba(160,140,110,0.12)'; ctx.lineWidth = 1;
    for (let px = 40; px < w; px += 50) {
      ctx.beginPath(); ctx.moveTo(px, 3); ctx.lineTo(px, b.wallH - 1); ctx.stroke();
    }

    // Left wall (full height)
    ctx.fillStyle = C.wallTrim; ctx.fillRect(0, b.wallH, 6, b.floorBot - b.wallH);
    ctx.fillStyle = C.wallAccent; ctx.fillRect(0, b.wallH, 4, b.floorBot - b.wallH);

    // Right wall (top section only, down to splitY)
    ctx.fillStyle = C.wallTrim; ctx.fillRect(w - 6, b.wallH, 6, b.splitY - b.wallH);
    ctx.fillStyle = C.wallAccent; ctx.fillRect(w - 4, b.wallH, 4, b.splitY - b.wallH);

    // Bottom wall of top floor (from splitX to w) — the L corner
    const cornerWallH = 8;
    ctx.fillStyle = C.wallTrim; ctx.fillRect(b.splitX, b.splitY - cornerWallH, w - b.splitX, cornerWallH);
    ctx.fillStyle = C.wallAccent; ctx.fillRect(b.splitX, b.splitY - cornerWallH, w - b.splitX, 4);

    // Right wall of lounge (from splitY to bottom)
    ctx.fillStyle = C.wallTrim; ctx.fillRect(b.splitX - 6, b.splitY, 6, b.floorBot - b.splitY);
    ctx.fillStyle = C.wallAccent; ctx.fillRect(b.splitX - 4, b.splitY, 4, b.floorBot - b.splitY);

    // Bottom wall of lounge
    ctx.fillStyle = C.wallTrim; ctx.fillRect(0, b.floorBot - 2, b.splitX, 2);

    // Bottom wall of garden
    ctx.fillStyle = C.wallTrim; ctx.fillRect(b.splitX, b.floorBot - 2, w - b.splitX, 2);

    // ── EXTERIOR WALL BRICKS (visible on the outside of the L corner) ──
    ctx.fillStyle = C.brickA;
    ctx.fillRect(b.splitX, b.splitY, 8, b.floorBot - b.splitY);
    ctx.fillStyle = C.brickB;
    for (let by = b.splitY; by < b.floorBot; by += 8) {
      const off = (Math.floor((by - b.splitY) / 8) % 2) * 6;
      for (let bx = b.splitX; bx < b.splitX + 8; bx += 12) {
        ctx.fillStyle = C.brickLine;
        ctx.fillRect(bx + off, by, 12, 0.5);
      }
    }
    // Exterior wall top (the horizontal L edge visible from garden)
    ctx.fillStyle = C.brickA;
    ctx.fillRect(b.splitX, b.splitY - cornerWallH, w - b.splitX, cornerWallH);
    for (let by = b.splitY - cornerWallH; by < b.splitY; by += 6) {
      const off = (Math.floor((by - b.splitY + cornerWallH) / 6) % 2) * 8;
      ctx.fillStyle = C.brickLine;
      ctx.fillRect(b.splitX, by, w - b.splitX, 0.5);
      for (let bx = b.splitX + off; bx < w; bx += 16) {
        ctx.fillRect(bx, by, 0.5, 6);
      }
    }
    // Roof edge on exterior
    ctx.fillStyle = C.roofTile; ctx.fillRect(b.splitX, b.splitY - cornerWallH - 3, w - b.splitX, 3);
    ctx.fillStyle = C.roofDark; ctx.fillRect(b.splitX, b.splitY - cornerWallH - 4, w - b.splitX, 1);

    // ── INTERIOR DIVIDER (office/dev lab) with doorway ──
    const divW = 6, doorW = 40;
    const doorMid = (b.wallH + b.splitY) / 2;
    const doorHalf = doorW / 2;

    ctx.fillStyle = C.wallTrim;
    ctx.fillRect(b.dividerX - divW / 2, b.wallH, divW, doorMid - doorHalf - b.wallH);
    ctx.fillRect(b.dividerX - divW / 2, doorMid + doorHalf, divW, b.splitY - doorMid - doorHalf);

    ctx.fillStyle = C.brown;
    ctx.fillRect(b.dividerX - divW / 2 - 2, doorMid - doorHalf - 3, divW + 4, 3);
    ctx.fillRect(b.dividerX - divW / 2 - 2, doorMid - doorHalf - 3, 3, doorW + 6);
    ctx.fillRect(b.dividerX + divW / 2 - 1, doorMid - doorHalf - 3, 3, doorW + 6);
    ctx.fillStyle = C.woodA;
    ctx.fillRect(b.dividerX - divW / 2, doorMid - doorHalf, divW, doorW);

    // ── HORIZONTAL DIVIDER (top floor / lounge) with doorway ──
    // Lounge entrance on left side
    const hDoorX = b.splitX * 0.4;
    const hDoorW = 40;
    ctx.fillStyle = C.wallTrim;
    ctx.fillRect(0, b.splitY - 4, hDoorX - hDoorW / 2, 4);
    ctx.fillRect(hDoorX + hDoorW / 2, b.splitY - 4, b.splitX - hDoorX - hDoorW / 2, 4);

    ctx.fillStyle = C.brown;
    ctx.fillRect(hDoorX - hDoorW / 2 - 2, b.splitY - 6, 3, 6);
    ctx.fillRect(hDoorX + hDoorW / 2 - 1, b.splitY - 6, 3, 6);
    ctx.fillRect(hDoorX - hDoorW / 2 - 2, b.splitY - 6, hDoorW + 5, 3);
  }

  // ── Furniture drawing functions ──

  function drawChair(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(x + 1, y + 1, 22, 16);
    ctx.fillStyle = C.chairSeat; ctx.fillRect(x, y, 22, 14);
    ctx.fillStyle = '#8a6838'; ctx.fillRect(x + 2, y + 2, 18, 10);
    ctx.fillStyle = C.chairBack; ctx.fillRect(x + 2, y - 6, 18, 8);
    ctx.fillStyle = '#7a5830'; ctx.fillRect(x + 4, y - 5, 14, 5);
    ctx.fillStyle = '#5a4020';
    ctx.fillRect(x + 1, y + 13, 2, 3); ctx.fillRect(x + 19, y + 13, 2, 3);
  }

  function drawDeskWithMonitor(x, y, occ) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(x + 2, y + 2, 48, 24);
    ctx.fillStyle = C.deskWood; ctx.fillRect(x, y, 48, 24);
    ctx.fillStyle = C.deskTop; ctx.fillRect(x, y, 48, 3);
    ctx.fillStyle = C.deskLeg;
    ctx.fillRect(x + 2, y + 22, 3, 4); ctx.fillRect(x + 43, y + 22, 3, 4);
    ctx.fillStyle = '#906830'; ctx.fillRect(x + 32, y + 6, 13, 14);
    ctx.fillStyle = C.deskTop; ctx.fillRect(x + 33, y + 7, 11, 5); ctx.fillRect(x + 33, y + 14, 11, 5);
    ctx.fillStyle = '#c0a060'; ctx.fillRect(x + 37, y + 8, 3, 2); ctx.fillRect(x + 37, y + 15, 3, 2);

    const mx = x + 6, my = y + 2;
    ctx.fillStyle = C.monitorBody; ctx.fillRect(mx, my - 14, 22, 14);
    ctx.fillStyle = occ ? C.monitorScreen : '#222'; ctx.fillRect(mx + 2, my - 12, 18, 10);
    ctx.fillStyle = C.monitorStand; ctx.fillRect(mx + 8, my, 6, 3); ctx.fillRect(mx + 5, my + 2, 12, 2);
    if (occ) {
      const cc = [C.green, C.blue, C.yellow, C.orange, C.purple];
      for (let i = 0; i < 4; i++) { ctx.fillStyle = cc[i]; ctx.fillRect(mx + 4, my - 10 + i * 2.5, 4 + ((i * 5 + frameTick) % 10), 1); }
      if (Math.floor(frameTick / 20) % 2 === 0) { ctx.fillStyle = C.green; ctx.fillRect(mx + 4 + (frameTick % 12), my - 2, 1, 2); }
    }
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(mx + 2, my + 5, 16, 5);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(mx + 3, my + 6, 14, 3);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(mx + 20, my + 6, 4, 5);
    ctx.fillStyle = C.mugWhite; ctx.fillRect(x + 28, y + 5, 5, 6);
    ctx.fillStyle = C.mugHandle; ctx.fillRect(x + 33, y + 6, 2, 3);
    ctx.fillStyle = '#7a4a20'; ctx.fillRect(x + 29, y + 6, 3, 3);
    if (occ && frameTick % 60 < 30) {
      ctx.fillStyle = 'rgba(200,200,200,0.2)';
      ctx.fillRect(x + 30, y + 3 - (frameTick % 18) * 0.2, 1, 2);
    }
  }

  function drawDeskWithLaptop(x, y, occ) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(x + 2, y + 2, 44, 22);
    ctx.fillStyle = C.deskWood; ctx.fillRect(x, y, 44, 22);
    ctx.fillStyle = C.deskTop; ctx.fillRect(x, y, 44, 3);
    ctx.fillStyle = C.deskLeg; ctx.fillRect(x + 2, y + 20, 3, 4); ctx.fillRect(x + 39, y + 20, 3, 4);
    const lx = x + 8, ly = y + 3;
    ctx.fillStyle = C.laptopBody; ctx.fillRect(lx, ly, 22, 13);
    ctx.fillStyle = occ ? C.laptopScreen : '#222'; ctx.fillRect(lx + 2, ly + 1, 18, 9);
    if (occ) {
      const cc = [C.green, C.blue, C.yellow, C.red];
      for (let i = 0; i < 3; i++) { ctx.fillStyle = cc[i]; ctx.fillRect(lx + 4, ly + 2 + i * 2.5, 3 + ((i * 4 + frameTick) % 8), 1); }
      if (Math.floor(frameTick / 22) % 2 === 0) { ctx.fillStyle = C.green; ctx.fillRect(lx + 4 + (frameTick % 10), ly + 8, 1, 2); }
    }
    ctx.fillStyle = C.laptopKey; ctx.fillRect(lx + 1, ly + 13, 20, 4);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(lx + 2, ly + 14, 18, 2);
    ctx.fillStyle = '#f0e8c0'; ctx.fillRect(x + 32, y + 5, 8, 10);
    ctx.fillStyle = C.blue; ctx.fillRect(x + 34, y + 7, 4, 0.5); ctx.fillRect(x + 34, y + 9, 3, 0.5);
    ctx.fillStyle = '#333'; ctx.fillRect(x + 36, y + 3, 1, 8);
    ctx.fillStyle = C.red; ctx.fillRect(x + 36, y + 3, 1, 2);
  }

  function drawDeskWithPC(x, y, occ) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(x + 2, y + 2, 52, 24);
    ctx.fillStyle = C.deskWood; ctx.fillRect(x, y, 52, 24);
    ctx.fillStyle = C.deskTop; ctx.fillRect(x, y, 52, 3);
    ctx.fillStyle = C.deskLeg; ctx.fillRect(x + 2, y + 22, 3, 4); ctx.fillRect(x + 47, y + 22, 3, 4);
    const px = x + 36, py = y + 2;
    ctx.fillStyle = C.pcCase; ctx.fillRect(px, py, 12, 18);
    ctx.fillStyle = C.pcFront; ctx.fillRect(px + 1, py + 1, 10, 16);
    ctx.fillStyle = '#383838'; ctx.fillRect(px + 2, py + 2, 8, 3);
    ctx.fillStyle = occ ? C.green : '#333'; ctx.fillRect(px + 3, py + 7, 2, 2);
    if (occ && frameTick % 10 < 5) { ctx.fillStyle = C.orange; ctx.fillRect(px + 6, py + 7, 2, 2); }
    ctx.strokeStyle = '#383838'; ctx.lineWidth = 0.5;
    for (let vy = py + 11; vy < py + 16; vy += 2) { ctx.beginPath(); ctx.moveTo(px + 2, vy); ctx.lineTo(px + 10, vy); ctx.stroke(); }
    const mx = x + 6, my = y + 2;
    ctx.fillStyle = C.monitorBody; ctx.fillRect(mx, my - 14, 24, 15);
    ctx.fillStyle = occ ? C.monitorScreen : '#222'; ctx.fillRect(mx + 2, my - 12, 20, 11);
    ctx.fillStyle = C.monitorStand; ctx.fillRect(mx + 9, my + 1, 6, 3); ctx.fillRect(mx + 6, my + 3, 12, 2);
    if (occ) {
      const cc = [C.green, C.blue, C.yellow, C.orange, C.purple];
      for (let i = 0; i < 5; i++) { ctx.fillStyle = cc[i]; ctx.fillRect(mx + 4, my - 10 + i * 2.2, 3 + ((i * 3 + frameTick) % 12), 1); }
    }
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(mx + 1, my + 6, 18, 5);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(mx + 2, my + 7, 16, 3);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(mx + 22, my + 7, 4, 5);
  }

  function drawWorkstation(ws) {
    drawChair(ws.chairX, ws.chairY);
    const occ = ws.occupant !== null;
    switch (ws.type) {
      case 'desk-monitor': drawDeskWithMonitor(ws.x, ws.y, occ); break;
      case 'desk-laptop':  drawDeskWithLaptop(ws.x, ws.y, occ); break;
      case 'desk-pc':      drawDeskWithPC(ws.x, ws.y, occ); break;
    }
    ctx.fillStyle = occ ? C.green : '#888';
    ctx.beginPath(); ctx.arc(ws.x + 3, ws.y + 3, 2, 0, Math.PI * 2); ctx.fill();
  }

  function drawBookshelf(obj) {
    const { x, y, w, h } = obj; const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = C.shelfWood; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.shelfBack; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    const bc = ['#c04040','#4080c0','#40a040','#e0a020','#8050b0','#e07020','#30b0a0','#d05020','#e05050','#40c060','#a06080','#60a0a0'];
    for (let s = 0; s < 3; s++) {
      const sy = y + 3 + s * 10;
      ctx.fillStyle = '#9a7a4a'; ctx.fillRect(x + 2, sy + 8, w - 4, 2);
      for (let b = 0; b < 5 && (x + 4 + b * 8) < x + w - 4; b++) {
        const bh = 5 + (b % 3);
        ctx.fillStyle = bc[(s * 5 + b) % bc.length]; ctx.fillRect(x + 4 + b * 8, sy + (8 - bh), 6, bh);
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x + 6 + b * 8, sy + (8 - bh) + 1, 1, bh - 2);
      }
    }
    ctx.strokeStyle = hov ? C.yellow : C.brown; ctx.lineWidth = hov ? 2 : 1; ctx.strokeRect(x, y, w, h);
  }

  function drawCoffeeMachine(obj) {
    const { x, y, w, h } = obj; const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = C.deskWood; ctx.fillRect(x - 2, y + h - 6, w + 4, 6);
    ctx.fillStyle = C.coffeeBody; ctx.fillRect(x + 3, y, 18, 24);
    ctx.fillStyle = C.coffeeDark; ctx.fillRect(x + 5, y + 2, 14, 10);
    ctx.fillStyle = '#1a3a2a'; ctx.fillRect(x + 6, y + 3, 12, 6);
    ctx.fillStyle = C.green; ctx.font = '4px monospace'; ctx.fillText('RDY', x + 8, y + 8);
    ctx.fillStyle = '#555'; ctx.fillRect(x + 6, y + 16, 12, 3);
    ctx.fillStyle = C.mugWhite; ctx.fillRect(x + 9, y + 14, 5, 5);
    ctx.fillStyle = '#7a4a20'; ctx.fillRect(x + 10, y + 15, 3, 2);
    ctx.fillStyle = C.red; ctx.fillRect(x + 6, y + 12, 3, 2);
    ctx.fillStyle = C.green; ctx.fillRect(x + 11, y + 12, 3, 2);
    const blink = (Math.floor(frameTick / 35) % 2);
    ctx.fillStyle = blink ? C.green : '#1a3a1a'; ctx.fillRect(x + 16, y + 12, 2, 2);
    if (frameTick % 80 < 40) {
      ctx.fillStyle = 'rgba(200,200,200,0.2)';
      ctx.fillRect(x + 11, y + 12 - (frameTick % 16) * 0.3, 1, 3);
    }
    ctx.strokeStyle = hov ? C.yellow : C.orange; ctx.lineWidth = hov ? 2 : 1; ctx.strokeRect(x - 2, y, w + 4, h);
  }

  function drawServerRack(obj) {
    const { x, y, w, h } = obj; const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = '#505050'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#444'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    for (let r = 0; r < 5; r++) {
      const ry = y + 3 + r * 9;
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x + 2, ry, w - 4, 7);
      ctx.fillStyle = '#333'; ctx.fillRect(x + 3, ry + 1, w - 6, 5);
      for (let l = 0; l < 3; l++) {
        ctx.fillStyle = ((r + l + Math.floor(frameTick / 25)) % 4 === 0) ? C.green : '#1a1a1a';
        ctx.fillRect(x + 5 + l * 5, ry + 2, 2, 2);
      }
      if (r < 3 && frameTick % (12 + r * 3) < 6) { ctx.fillStyle = C.orange; ctx.fillRect(x + w - 6, ry + 2, 2, 2); }
    }
    ctx.strokeStyle = hov ? C.yellow : C.blue; ctx.lineWidth = hov ? 2 : 1; ctx.strokeRect(x, y, w, h);
  }

  function drawDecorItem(d) {
    switch (d.type) {
      case 'plant-large': {
        ctx.fillStyle = C.potTerra; ctx.fillRect(d.x, d.y + 10, 16, 14);
        ctx.fillStyle = C.potRim; ctx.fillRect(d.x - 1, d.y + 10, 18, 3);
        ctx.fillStyle = '#5a4020'; ctx.fillRect(d.x + 2, d.y + 12, 12, 2);
        ctx.fillStyle = '#3a8a30'; ctx.beginPath(); ctx.arc(d.x + 4, d.y + 6, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.grass; ctx.beginPath(); ctx.arc(d.x + 12, d.y + 4, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5dbe4d'; ctx.beginPath(); ctx.arc(d.x + 8, d.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6ad060'; ctx.beginPath(); ctx.arc(d.x + 6, d.y - 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(d.x + 11, d.y - 2, 3, 0, Math.PI * 2); ctx.fill();
        const sw = Math.sin(frameTick * 0.02 + d.x) * 0.8;
        ctx.fillStyle = '#4aa040'; ctx.beginPath(); ctx.arc(d.x + 8 + sw, d.y + 2, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'plant-small': {
        ctx.fillStyle = C.potTerra; ctx.fillRect(d.x + 2, d.y + 6, 10, 10);
        ctx.fillStyle = C.potRim; ctx.fillRect(d.x + 1, d.y + 6, 12, 2);
        ctx.fillStyle = C.grass; ctx.beginPath(); ctx.arc(d.x + 7, d.y + 3, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a9a30'; ctx.beginPath(); ctx.arc(d.x + 4, d.y + 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(d.x + 10, d.y + 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6ac050'; ctx.beginPath(); ctx.arc(d.x + 7, d.y - 1, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'filing-cabinet': {
        ctx.fillStyle = '#888'; ctx.fillRect(d.x, d.y, 18, 40);
        ctx.fillStyle = '#777'; ctx.fillRect(d.x + 1, d.y + 1, 16, 38);
        for (let dr = 0; dr < 3; dr++) {
          ctx.fillStyle = '#808080'; ctx.fillRect(d.x + 2, d.y + 3 + dr * 12, 14, 10);
          ctx.fillStyle = '#999'; ctx.fillRect(d.x + 3, d.y + 4 + dr * 12, 12, 8);
          ctx.fillStyle = '#bbb'; ctx.fillRect(d.x + 7, d.y + 7 + dr * 12, 4, 2);
        }
        break;
      }
      case 'trash-can': {
        ctx.fillStyle = '#777'; ctx.fillRect(d.x, d.y, 10, 12);
        ctx.fillStyle = '#888'; ctx.fillRect(d.x - 1, d.y, 12, 2);
        ctx.fillStyle = '#666'; ctx.fillRect(d.x + 1, d.y + 2, 8, 9);
        break;
      }
      case 'water-cooler': {
        ctx.fillStyle = C.waterBody; ctx.fillRect(d.x, d.y + 8, 14, 28);
        ctx.fillStyle = C.waterBlue; ctx.fillRect(d.x + 3, d.y, 8, 10);
        ctx.fillStyle = 'rgba(160,216,240,0.3)'; ctx.fillRect(d.x + 4, d.y + 2, 6, 6);
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 2, d.y + 24, 3, 3);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 9, d.y + 24, 3, 3);
        ctx.fillStyle = '#bbb'; ctx.fillRect(d.x - 1, d.y + 28, 16, 2);
        break;
      }
      case 'clock': {
        const cx = d.x, cy = d.y, r = 10;
        ctx.fillStyle = C.brown; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#555';
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; ctx.fillRect(cx + Math.cos(a) * (r - 2) - 0.5, cy + Math.sin(a) * (r - 2) - 0.5, 1.5, 1.5); }
        const now = new Date();
        const ha = ((now.getHours() % 12 + now.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2;
        const ma = (now.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2;
        const sa = (now.getSeconds() / 60) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5); ctx.stroke();
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ma) * r * 0.7, cy + Math.sin(ma) * r * 0.7); ctx.stroke();
        ctx.strokeStyle = C.red; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sa) * r * 0.65, cy + Math.sin(sa) * r * 0.65); ctx.stroke();
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'window': {
        ctx.fillStyle = C.brown; ctx.fillRect(d.x - 3, d.y - 3, d.w + 6, d.h + 6);
        ctx.fillStyle = '#8a6a3a'; ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
        const sg = ctx.createLinearGradient(0, d.y, 0, d.y + d.h);
        sg.addColorStop(0, '#60b8e8'); sg.addColorStop(0.7, C.sky); sg.addColorStop(1, '#a0d8a0');
        ctx.fillStyle = sg; ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = '#f0d840'; ctx.beginPath(); ctx.arc(d.x + d.w * 0.75, d.y + 8, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const c1 = d.x + 8 + (frameTick * 0.02) % (d.w + 10) - 5;
        ctx.beginPath(); ctx.arc(c1, d.y + 14, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(c1 + 6, d.y + 12, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = C.brown; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(d.x + d.w / 2, d.y); ctx.lineTo(d.x + d.w / 2, d.y + d.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(d.x, d.y + d.h / 2); ctx.lineTo(d.x + d.w, d.y + d.h / 2); ctx.stroke();
        ctx.fillStyle = '#9a7a4a'; ctx.fillRect(d.x - 4, d.y + d.h + 2, d.w + 8, 3);
        ctx.fillStyle = 'rgba(180,160,130,0.2)'; ctx.fillRect(d.x, d.y, 4, d.h); ctx.fillRect(d.x + d.w - 4, d.y, 4, d.h);
        break;
      }
      case 'whiteboard': {
        ctx.fillStyle = '#777'; ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
        ctx.fillStyle = C.white; ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 4, d.y + 4, 20, 2);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 4, d.y + 9, 30, 2);
        ctx.fillStyle = C.green; ctx.fillRect(d.x + 4, d.y + 14, 14, 2);
        ctx.fillStyle = '#333'; ctx.fillRect(d.x + 4, d.y + 19, 26, 2);
        ctx.strokeStyle = C.purple; ctx.lineWidth = 1; ctx.strokeRect(d.x + 38, d.y + 4, 14, 12);
        ctx.fillStyle = '#999'; ctx.fillRect(d.x + 10, d.y + d.h, 34, 3);
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 12, d.y + d.h, 6, 3);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 20, d.y + d.h, 6, 3);
        break;
      }
      case 'poster': {
        ctx.fillStyle = C.brown; ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
        ctx.fillStyle = '#60b8e8'; ctx.fillRect(d.x, d.y, d.w, d.h * 0.5);
        ctx.fillStyle = C.grass; ctx.fillRect(d.x, d.y + d.h * 0.5, d.w, d.h * 0.5);
        ctx.fillStyle = '#8a8a8a';
        ctx.beginPath(); ctx.moveTo(d.x + 4, d.y + d.h * 0.5); ctx.lineTo(d.x + 10, d.y + 4); ctx.lineTo(d.x + 16, d.y + d.h * 0.5); ctx.fill();
        ctx.fillStyle = '#f0d040'; ctx.beginPath(); ctx.arc(d.x + d.w - 6, d.y + 5, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'sofa': {
        ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(d.x + 2, d.y + 2, 56, 22);
        ctx.fillStyle = C.sofaBrown; ctx.fillRect(d.x, d.y, 56, 20);
        ctx.fillStyle = C.sofaCush; ctx.fillRect(d.x + 3, d.y + 3, 24, 14); ctx.fillRect(d.x + 29, d.y + 3, 24, 14);
        ctx.fillStyle = C.sofaArm; ctx.fillRect(d.x, d.y - 8, 56, 10);
        ctx.fillStyle = '#c09868'; ctx.fillRect(d.x + 6, d.y - 6, 12, 6);
        ctx.fillStyle = '#c8a878'; ctx.fillRect(d.x + 38, d.y - 6, 12, 6);
        ctx.fillStyle = C.sofaArm; ctx.fillRect(d.x - 4, d.y - 8, 6, 28); ctx.fillRect(d.x + 54, d.y - 8, 6, 28);
        ctx.fillStyle = '#5a4020'; ctx.fillRect(d.x, d.y + 19, 3, 3); ctx.fillRect(d.x + 53, d.y + 19, 3, 3);
        break;
      }
      case 'coffee-table': {
        ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.fillRect(d.x + 1, d.y + 1, 36, 14);
        ctx.fillStyle = C.deskWood; ctx.fillRect(d.x, d.y, 36, 12);
        ctx.fillStyle = C.deskTop; ctx.fillRect(d.x, d.y, 36, 2);
        ctx.fillStyle = C.deskLeg; ctx.fillRect(d.x + 2, d.y + 11, 2, 3); ctx.fillRect(d.x + 32, d.y + 11, 2, 3);
        ctx.fillStyle = '#e0c0a0'; ctx.fillRect(d.x + 6, d.y + 3, 8, 5);
        ctx.fillStyle = C.mugWhite; ctx.fillRect(d.x + 23, d.y + 4, 5, 5);
        ctx.fillStyle = '#7a4a20'; ctx.fillRect(d.x + 24, d.y + 5, 3, 3);
        break;
      }
      case 'rug': {
        ctx.fillStyle = '#a06040'; ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = '#b87858'; ctx.fillRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
        ctx.strokeStyle = '#c89070'; ctx.lineWidth = 1; ctx.strokeRect(d.x + 4, d.y + 4, d.w - 8, d.h - 8);
        ctx.fillStyle = '#c89070';
        for (let rx = d.x + 12; rx < d.x + d.w - 8; rx += 14) {
          const ry = d.y + d.h / 2;
          ctx.beginPath(); ctx.moveTo(rx, ry - 4); ctx.lineTo(rx + 4, ry); ctx.lineTo(rx, ry + 4); ctx.lineTo(rx - 4, ry); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = '#b87858';
        for (let fx = d.x + 2; fx < d.x + d.w - 2; fx += 4) { ctx.fillRect(fx, d.y + d.h, 2, 3); ctx.fillRect(fx, d.y - 3, 2, 3); }
        break;
      }
      case 'ceiling-light': {
        ctx.fillStyle = 'rgba(255,245,200,0.05)';
        ctx.beginPath(); ctx.moveTo(d.x - 4, d.y); ctx.lineTo(d.x - 28, d.y + 45); ctx.lineTo(d.x + 28, d.y + 45); ctx.lineTo(d.x + 4, d.y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#888'; ctx.fillRect(d.x - 1, d.y - 4, 2, 4);
        ctx.fillStyle = C.cream;
        ctx.beginPath(); ctx.moveTo(d.x - 6, d.y + 4); ctx.lineTo(d.x - 3, d.y); ctx.lineTo(d.x + 3, d.y); ctx.lineTo(d.x + 6, d.y + 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f0e8c0'; ctx.beginPath(); ctx.arc(d.x, d.y + 2, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'zone-label': {
        ctx.font = '5px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(80,60,30,0.2)'; ctx.fillText(d.text, d.x, d.y);
        break;
      }
      case 'coat-rack': {
        ctx.fillStyle = '#5a4020'; ctx.fillRect(d.x + 4, d.y, 3, 30);
        ctx.fillStyle = '#7a5030'; ctx.fillRect(d.x, d.y + 28, 11, 3);
        ctx.fillStyle = '#444'; ctx.fillRect(d.x - 2, d.y + 1, 4, 2); ctx.fillRect(d.x + 9, d.y + 1, 4, 2);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x - 3, d.y + 3, 6, 8);
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 9, d.y + 4, 5, 7);
        break;
      }
      case 'wall-shelf': {
        ctx.fillStyle = C.brown; ctx.fillRect(d.x, d.y + 10, d.w, 3);
        ctx.fillStyle = '#999'; ctx.fillRect(d.x + 2, d.y + 4, 5, 6);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 9, d.y + 3, 4, 7);
        ctx.fillStyle = C.mugWhite; ctx.fillRect(d.x + 16, d.y + 6, 4, 4);
        ctx.fillStyle = '#7a4a20'; ctx.fillRect(d.x + 17, d.y + 7, 2, 2);
        ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(d.x + d.w - 6, d.y + 5, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.potTerra; ctx.fillRect(d.x + d.w - 9, d.y + 8, 6, 4);
        break;
      }
      case 'power-strip': {
        ctx.fillStyle = '#ddd'; ctx.fillRect(d.x, d.y, 20, 4);
        ctx.fillStyle = '#bbb';
        for (let i = 0; i < 4; i++) ctx.fillRect(d.x + 2 + i * 5, d.y + 1, 3, 2);
        ctx.fillStyle = C.green; ctx.fillRect(d.x + 18, d.y + 1, 2, 2);
        break;
      }
      case 'cable-tray': {
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x, d.y + d.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(d.x + 2, d.y); ctx.lineTo(d.x + 2, d.y + d.h); ctx.stroke();
        ctx.fillStyle = C.blue; ctx.fillRect(d.x - 1, d.y + 3, 4, 2);
        ctx.fillStyle = C.yellow; ctx.fillRect(d.x - 1, d.y + 8, 4, 2);
        break;
      }
      case 'printer': {
        ctx.fillStyle = '#ddd'; ctx.fillRect(d.x, d.y, 24, 16);
        ctx.fillStyle = '#ccc'; ctx.fillRect(d.x + 1, d.y + 1, 22, 6);
        ctx.fillStyle = '#f0e8d0'; ctx.fillRect(d.x + 3, d.y - 2, 18, 4);
        ctx.fillStyle = '#bbb'; ctx.fillRect(d.x + 2, d.y + 10, 20, 4);
        ctx.fillStyle = C.green; ctx.fillRect(d.x + 18, d.y + 8, 3, 2);
        if (frameTick % 200 < 10) { ctx.fillStyle = C.orange; ctx.fillRect(d.x + 14, d.y + 8, 3, 2); }
        break;
      }
      case 'tv-screen': {
        ctx.fillStyle = '#333'; ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = '#1a2a3a'; ctx.fillRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
        // Scrolling chart
        ctx.strokeStyle = C.green; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < d.w - 8; i += 3) {
          const v = Math.sin((frameTick + i) * 0.1) * (d.h * 0.2) + d.y + d.h * 0.5;
          if (i === 0) ctx.moveTo(d.x + 4 + i, v); else ctx.lineTo(d.x + 4 + i, v);
        }
        ctx.stroke();
        ctx.fillStyle = '#555'; ctx.fillRect(d.x + d.w * 0.4, d.y + d.h, d.w * 0.2, 3);
        break;
      }
      case 'bean-bag': {
        ctx.fillStyle = 'rgba(0,0,0,0.05)'; ctx.beginPath(); ctx.ellipse(d.x + 10, d.y + 14, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c06040'; ctx.beginPath(); ctx.ellipse(d.x + 10, d.y + 12, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d07050'; ctx.beginPath(); ctx.ellipse(d.x + 10, d.y + 10, 9, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e08060'; ctx.beginPath(); ctx.ellipse(d.x + 10, d.y + 8, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'magazine-rack': {
        ctx.fillStyle = C.brown; ctx.fillRect(d.x, d.y, 12, 18);
        ctx.fillStyle = '#8a6a3a'; ctx.fillRect(d.x + 1, d.y + 1, 10, 16);
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 2, d.y + 2, 8, 3);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 2, d.y + 6, 8, 3);
        ctx.fillStyle = C.yellow; ctx.fillRect(d.x + 2, d.y + 10, 8, 3);
        break;
      }
      case 'umbrella-stand': {
        ctx.fillStyle = '#666'; ctx.fillRect(d.x, d.y + 6, 10, 14);
        ctx.fillStyle = '#777'; ctx.fillRect(d.x - 1, d.y + 6, 12, 2);
        ctx.fillStyle = '#333'; ctx.fillRect(d.x + 3, d.y, 1, 8);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 1, d.y - 1, 3, 2);
        ctx.fillStyle = '#555'; ctx.fillRect(d.x + 6, d.y + 2, 1, 6);
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 5, d.y + 1, 3, 2);
        break;
      }
      // ── OUTDOOR ITEMS ──
      case 'tree': {
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(d.x + 8, d.y + 20, 6, 20);
        ctx.fillStyle = '#3a7a2a'; ctx.beginPath(); ctx.arc(d.x + 11, d.y + 10, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a9a38'; ctx.beginPath(); ctx.arc(d.x + 6, d.y + 14, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5aaa48'; ctx.beginPath(); ctx.arc(d.x + 16, d.y + 12, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#60b850'; ctx.beginPath(); ctx.arc(d.x + 11, d.y + 4, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#70c860'; ctx.beginPath(); ctx.arc(d.x + 11, d.y, 6, 0, Math.PI * 2); ctx.fill();
        const tsw = Math.sin(frameTick * 0.015 + d.x) * 1;
        ctx.fillStyle = '#4a9a38'; ctx.beginPath(); ctx.arc(d.x + 8 + tsw, d.y + 6, 4, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'tree-small': {
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(d.x + 5, d.y + 12, 4, 12);
        ctx.fillStyle = '#3a8a30'; ctx.beginPath(); ctx.arc(d.x + 7, d.y + 6, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a9a40'; ctx.beginPath(); ctx.arc(d.x + 4, d.y + 8, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5aaa50'; ctx.beginPath(); ctx.arc(d.x + 10, d.y + 7, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#60b858'; ctx.beginPath(); ctx.arc(d.x + 7, d.y + 2, 5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'bush': {
        ctx.fillStyle = '#3a8a30'; ctx.beginPath(); ctx.ellipse(d.x + 8, d.y + 6, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a9a40'; ctx.beginPath(); ctx.ellipse(d.x + 5, d.y + 5, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5aaa50'; ctx.beginPath(); ctx.ellipse(d.x + 12, d.y + 4, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
        // Small flowers
        if (d.x % 3 === 0) { ctx.fillStyle = C.yellow; ctx.fillRect(d.x + 4, d.y + 2, 2, 2); ctx.fillRect(d.x + 12, d.y + 3, 2, 2); }
        else { ctx.fillStyle = C.red; ctx.fillRect(d.x + 6, d.y + 1, 2, 2); ctx.fillRect(d.x + 10, d.y + 4, 2, 2); }
        break;
      }
      case 'garden-bench': {
        ctx.fillStyle = '#7a5830'; ctx.fillRect(d.x, d.y, 30, 4);
        ctx.fillStyle = '#8a6840'; ctx.fillRect(d.x + 1, d.y + 1, 28, 2);
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(d.x + 2, d.y + 4, 3, 8); ctx.fillRect(d.x + 25, d.y + 4, 3, 8);
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(d.x, d.y - 6, 30, 3);
        ctx.fillStyle = '#7a5830'; ctx.fillRect(d.x + 1, d.y - 5, 28, 1);
        break;
      }
      case 'flower-bed': {
        ctx.fillStyle = '#5a4020'; ctx.fillRect(d.x, d.y, d.w, 8);
        ctx.fillStyle = '#6a5030'; ctx.fillRect(d.x + 1, d.y + 1, d.w - 2, 6);
        const fc = [C.red, C.yellow, C.purple, '#f0a0c0', C.orange];
        for (let i = 0; i < d.w - 4; i += 6) {
          ctx.fillStyle = C.grass; ctx.fillRect(d.x + 2 + i, d.y - 2, 2, 4);
          ctx.fillStyle = fc[i % fc.length]; ctx.fillRect(d.x + 1 + i, d.y - 4, 4, 3);
        }
        break;
      }
      case 'garden-path': {
        for (let py = d.y; py < d.y + d.h; py += 10) {
          const off = (Math.floor((py - d.y) / 10) % 2) * 4;
          ctx.fillStyle = C.pathStone; ctx.fillRect(d.x + off, py, 8, 8);
          ctx.fillStyle = C.pathStoneDark; ctx.fillRect(d.x + off, py, 8, 1);
          ctx.fillRect(d.x + off, py, 1, 8);
        }
        break;
      }
      case 'bird': {
        const bx = d.x + Math.sin(frameTick * 0.03) * 5;
        const by = d.y + Math.cos(frameTick * 0.04) * 3;
        ctx.fillStyle = '#e0a020';
        ctx.fillRect(bx, by, 4, 3);
        ctx.fillRect(bx + 4, by + 1, 2, 1);
        // Wing flap
        if (Math.floor(frameTick / 15) % 2) {
          ctx.fillRect(bx - 1, by - 1, 2, 1); ctx.fillRect(bx + 3, by - 1, 2, 1);
        } else {
          ctx.fillRect(bx - 1, by + 1, 2, 1); ctx.fillRect(bx + 3, by + 1, 2, 1);
        }
        break;
      }
      case 'fence-section': {
        ctx.fillStyle = C.fence;
        if (d.dir === 'v') {
          ctx.fillRect(d.x, d.y, 3, d.len);
          for (let fy = d.y; fy < d.y + d.len; fy += 12) {
            ctx.fillRect(d.x - 1, fy, 5, 10);
            ctx.fillStyle = C.fenceLight; ctx.fillRect(d.x, fy + 1, 3, 8);
            ctx.fillStyle = C.fence;
          }
        } else {
          ctx.fillRect(d.x, d.y, d.len, 3);
          for (let fx = d.x; fx < d.x + d.len; fx += 12) {
            ctx.fillRect(fx, d.y - 1, 10, 5);
            ctx.fillStyle = C.fenceLight; ctx.fillRect(fx + 1, d.y, 8, 3);
            ctx.fillStyle = C.fence;
          }
        }
        break;
      }
      case 'lamp-post': {
        ctx.fillStyle = '#666'; ctx.fillRect(d.x + 2, d.y + 6, 3, 30);
        ctx.fillStyle = '#888'; ctx.fillRect(d.x - 1, d.y + 34, 9, 3);
        ctx.fillStyle = '#777'; ctx.fillRect(d.x - 2, d.y, 11, 8);
        ctx.fillStyle = '#f0e8c0'; ctx.fillRect(d.x, d.y + 2, 7, 4);
        ctx.fillStyle = 'rgba(255,245,200,0.08)';
        ctx.beginPath(); ctx.ellipse(d.x + 3, d.y + 20, 12, 16, 0, 0, Math.PI * 2); ctx.fill();
        break;
      }
    }
  }

  function hexToRgba(hex, a) {
    return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`;
  }

  function updateHUD() {
    const active = [...sprites.values()].filter(s => s.state === 'active').length;
    const total = sprites.size || 1;
    hudHpBar.style.width = Math.min(100, 60 + active * 10) + '%';
    hudEpBar.style.width = Math.max(10, 100 - total * 6) + '%';
  }

  // ── Sprite class (constrained to L-shape interior) ──
  class Sprite {
    constructor(name, label) {
      this.name = name; this.label = label || name;
      this.palette = PALETTES[Math.abs(hashStr(name)) % PALETTES.length];
      this.x = 30 + Math.random() * 100;
      this.y = 60 + Math.random() * 60;
      this.vx = 0; this.vy = 0; this.state = 'idle';
      this.frame = 0; this.frameTick = 0; this.direction = 1;
      this.bubble = null; this.bubbleTimer = 0;
      this.idleTimer = randomRange(120, 360);
      this.walkTimer = 0; this.bobOffset = 0;
      this.spawnAnim = 1.0; this.jumpY = 0; this.jumpVel = 0;
      this.assignedSeat = null;
    }

    // Check if position is inside the L-shaped interior
    isInsideL(x, y) {
      if (!layout) return true;
      const b = layout.bounds;
      const pad = 8;
      // Top floor (full width)
      if (y >= b.wallH + pad && y <= b.splitY - pad && x >= pad && x <= canvas.getBoundingClientRect().width - pad - DRAW_W) return true;
      // Bottom-left (lounge)
      if (y >= b.splitY && y <= b.floorBot - pad && x >= pad && x <= b.splitX - pad - DRAW_W) return true;
      return false;
    }

    clampToL() {
      if (!layout) return;
      const b = layout.bounds;
      const w = canvas.getBoundingClientRect().width;
      const pad = 8;
      // If in top floor area
      if (this.y < b.splitY) {
        this.x = Math.max(pad, Math.min(w - DRAW_W - pad, this.x));
        this.y = Math.max(b.wallH + pad, Math.min(b.splitY - DRAW_H - 4, this.y));
      } else {
        // In lounge area
        this.x = Math.max(pad, Math.min(b.splitX - DRAW_W - pad, this.x));
        this.y = Math.max(b.splitY + 4, Math.min(b.floorBot - DRAW_H - pad, this.y));
      }
    }

    update() {
      this.spawnAnim = Math.max(0, this.spawnAnim - 0.03);
      this.frameTick++;
      if (this.jumpVel !== 0 || this.jumpY < 0) {
        this.jumpY += this.jumpVel; this.jumpVel += 0.8;
        if (this.jumpY >= 0) { this.jumpY = 0; this.jumpVel = 0; }
      }
      if (this.bubbleTimer > 0) { this.bubbleTimer--; if (this.bubbleTimer <= 0) this.bubble = null; }

      switch (this.state) {
        case 'idle':
          this.bobOffset = Math.sin(this.frameTick * 0.06) * 1.5;
          this.idleTimer--;
          if (this.idleTimer <= 0) {
            this.state = 'walking';
            const a = Math.random() * Math.PI * 2;
            const spd = (0.3 + Math.random() * 0.4) * CONFIG.spriteSpeed;
            this.vx = Math.cos(a) * spd; this.vy = Math.sin(a) * spd;
            this.direction = this.vx >= 0 ? 1 : -1;
            this.walkTimer = randomRange(80, 250);
          }
          break;
        case 'walking': {
          this.bobOffset = Math.sin(this.frameTick * 0.15);
          const nx = this.x + this.vx, ny = this.y + this.vy;
          if (this.isInsideL(nx, ny)) {
            this.x = nx; this.y = ny;
          } else {
            // Bounce
            this.vx = -this.vx + (Math.random() - 0.5) * 0.3;
            this.vy = -this.vy + (Math.random() - 0.5) * 0.3;
            this.direction = this.vx >= 0 ? 1 : -1;
            this.clampToL();
          }
          this.walkTimer--;
          if (this.frameTick % 10 === 0) this.frame = this.frame === 0 ? 1 : 0;
          if (this.walkTimer <= 0) { this.state = 'idle'; this.vx = 0; this.vy = 0; this.frame = 0; this.idleTimer = randomRange(100, 300); }
          break;
        }
        case 'active': {
          if (layout && this.assignedSeat !== null && layout.workstations[this.assignedSeat]) {
            const ws = layout.workstations[this.assignedSeat];
            this.x += (ws.chairX - 2 - this.x) * 0.06;
            this.y += (ws.chairY - 6 - this.y) * 0.06;
          }
          this.bobOffset = Math.sin(this.frameTick * 0.12);
          break;
        }
      }
    }

    draw() {
      const scale = 1 - this.spawnAnim * 0.5;
      const drawX = this.x, drawY = this.y + this.bobOffset + this.jumpY;
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(drawX + DRAW_W / 2, this.y + DRAW_H - 2, DRAW_W / 3, 4, 0, 0, Math.PI * 2); ctx.fill();
      if (this.state === 'active') {
        const p = 0.5 + 0.5 * Math.sin(this.frameTick * 0.08);
        ctx.fillStyle = hexToRgba(this.palette.shirt, 0.05 + p * 0.05);
        ctx.beginPath(); ctx.ellipse(drawX + DRAW_W / 2, drawY + DRAW_H / 2, DRAW_W * 0.55, DRAW_H * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.save();
      ctx.translate(drawX + DRAW_W / 2, drawY + DRAW_H / 2);
      ctx.scale(this.direction * scale, scale);
      ctx.translate(-DRAW_W / 2, -DRAW_H / 2);
      const tpl = this.state === 'walking' && this.frame === 1 ? SPRITE_WALK : SPRITE_IDLE;
      for (let row = 0; row < TILE; row++) {
        const rs = tpl[row]; if (!rs) continue;
        for (let col = 0; col < rs.length; col++) {
          const c = getPixelColor(rs[col], this.palette);
          if (c) { ctx.fillStyle = c; ctx.fillRect(col * SCALE, row * SCALE, SCALE, SCALE); }
        }
      }
      ctx.restore();
      ctx.font = '8px monospace'; ctx.textAlign = 'center';
      const tw = ctx.measureText(this.label).width + 8;
      const tx = drawX + DRAW_W / 2 - tw / 2, ty = drawY - 12;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      roundRect(ctx, tx, ty, tw, 12, 3); ctx.fill();
      ctx.strokeStyle = this.palette.shirt; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      roundRect(ctx, tx, ty, tw, 12, 3); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#333'; ctx.fillText(this.label, drawX + DRAW_W / 2, ty + 9);
      if (this.bubble && CONFIG.showBubbles) this._drawBubble(drawX + DRAW_W / 2, ty - 4);
    }

    _drawBubble(cx, cy) {
      ctx.font = '10px monospace';
      const bw = ctx.measureText(this.bubble).width + 14, bh = 16;
      const bx = cx - bw / 2, by = cy - bh - 3;
      ctx.globalAlpha = Math.min(1, this.bubbleTimer / 30);
      ctx.fillStyle = C.white; ctx.strokeStyle = C.brown; ctx.lineWidth = 1;
      roundRect(ctx, bx, by, bw, bh, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.white;
      ctx.beginPath(); ctx.moveTo(cx - 3, by + bh); ctx.lineTo(cx, by + bh + 3); ctx.lineTo(cx + 3, by + bh); ctx.fill();
      ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.bubble, cx, by + bh / 2);
      ctx.globalAlpha = 1;
    }

    showBubble(text) { this.bubble = text.length > 24 ? text.slice(0, 22) + '\u2026' : text; this.bubbleTimer = 180; }

    setActive(active) {
      if (active) {
        this.state = 'active';
        if (this.assignedSeat === null && layout) {
          for (let i = 0; i < layout.workstations.length; i++) {
            if (!layout.workstations[i].occupant) { layout.workstations[i].occupant = this.name; this.assignedSeat = i; break; }
          }
        }
      } else {
        if (layout && this.assignedSeat !== null && layout.workstations[this.assignedSeat])
          layout.workstations[this.assignedSeat].occupant = null;
        this.assignedSeat = null; this.state = 'idle'; this.idleTimer = randomRange(60, 180);
      }
    }
    jump() { if (this.jumpY === 0) this.jumpVel = -6; }
  }

  function hashStr(s) { let h = 0; for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return h; }
  function randomRange(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x+r,y); c.lineTo(x+w-r,y); c.quadraticCurveTo(x+w,y,x+w,y+r);
    c.lineTo(x+w,y+h-r); c.quadraticCurveTo(x+w,y+h,x+w-r,y+h); c.lineTo(x+r,y+h);
    c.quadraticCurveTo(x,y+h,x,y+h-r); c.lineTo(x,y+r); c.quadraticCurveTo(x,y,x+r,y); c.closePath();
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
    layout = buildLayout(rect.width, rect.height);
  }

  function loop() {
    frameTick++;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    drawApartmentShell(w, h);

    if (layout) {
      for (const d of layout.decor) { if (d.type === 'rug') drawDecorItem(d); }
      for (const d of layout.decor) { if (d.type === 'zone-label') drawDecorItem(d); }
      for (const d of layout.decor) { if (d.type === 'ceiling-light') drawDecorItem(d); }

      const items = [];
      for (const ws of layout.workstations) items.push({ y: ws.y, draw: () => drawWorkstation(ws) });
      for (const obj of layout.clickables) {
        if (obj.id === 'bookshelf') items.push({ y: obj.y, draw: () => drawBookshelf(obj) });
        else if (obj.id === 'coffee') items.push({ y: obj.y, draw: () => drawCoffeeMachine(obj) });
        else if (obj.id === 'server') items.push({ y: obj.y, draw: () => drawServerRack(obj) });
      }
      for (const d of layout.decor) {
        if (d.type !== 'rug' && d.type !== 'zone-label' && d.type !== 'ceiling-light') {
          items.push({ y: d.y || 0, draw: () => drawDecorItem(d) });
        }
      }
      for (const s of sprites.values()) {
        items.push({ y: s.y + DRAW_H, draw: () => { s.update(); s.draw(); } });
      }
      items.sort((a, b) => a.y - b.y);
      for (const it of items) it.draw();
    }

    updateHUD();
    statusEl.textContent = sprites.size + ' agents';
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
        sprites.clear(); break;
    }
  });

  function hitSprite(mx, my) {
    for (const [name, sprite] of sprites) {
      if (mx >= sprite.x && mx <= sprite.x + DRAW_W &&
          my >= sprite.y + sprite.bobOffset + sprite.jumpY &&
          my <= sprite.y + sprite.bobOffset + sprite.jumpY + DRAW_H) return { name, sprite };
    }
    return null;
  }
  function hitClickable(mx, my) {
    if (!layout) return null;
    for (const f of layout.clickables) { if (mx >= f.x && mx <= f.x + f.w && my >= f.y && my <= f.y + f.h) return f; }
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
  resize(); loop();
  vscode.postMessage({ type: 'ready' });

  // ── Demo agents ──
  setTimeout(() => {
    const demos = [
      { name: 'agent-alpha',   label: 'Alpha',   active: true,  bubble: 'Compiling...' },
      { name: 'agent-beta',    label: 'Beta',     active: false, bubble: 'Coffee time' },
      { name: 'agent-gamma',   label: 'Gamma',    active: true,  bubble: 'Debugging' },
      { name: 'agent-delta',   label: 'Delta',    active: true,  bubble: 'Deploying' },
      { name: 'agent-epsilon', label: 'Epsilon',  active: false, bubble: 'Reading' },
      { name: 'agent-zeta',    label: 'Zeta',     active: true,  bubble: 'Code review' },
    ];
    for (const d of demos) {
      const s = new Sprite(d.name, d.label);
      sprites.set(d.name, s);
      if (d.active) s.setActive(true);
      if (d.bubble) s.showBubble(d.bubble);
    }
  }, 300);
})();
