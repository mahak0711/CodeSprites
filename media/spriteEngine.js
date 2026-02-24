// @ts-nocheck
/* Pixel Agent – Connected Apartment-Style Office */
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

  // ── Diverse character palettes ──
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

  // ── 16x16 top-down human sprites ──
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

  // ── Apartment Colors ──
  const C = {
    // Main background
    wallTop:    '#e8dcc8', wallMid:    '#ddd0b8', wallBot:    '#d4c4a8',
    wallTrim:   '#b8a080', wallAccent: '#c8b898',
    // Floors
    woodA: '#c8a060', woodB: '#b89050', woodLine: 'rgba(80,50,20,0.12)',
    tileA: '#d8d0c0', tileB: '#ccc4b4', tileLine: 'rgba(100,80,60,0.08)',
    carpetA: '#8aaa6a', carpetB: '#7a9a5a',
    // Furniture
    deskWood:  '#a07840', deskTop:   '#b88850', deskLeg:   '#705028',
    chairSeat: '#7a5830', chairBack: '#6a4a28',
    sofaBrown: '#8a6040', sofaCush:  '#a07858', sofaArm:   '#6a4a30',
    shelfWood: '#8a6a3a', shelfBack: '#705830',
    // Tech
    monitorBody: '#444', monitorScreen: '#1a2a3a', monitorStand: '#555',
    laptopBody:  '#555', laptopScreen:  '#1a2a3a', laptopKey:     '#3a3a3a',
    pcCase:      '#505050', pcFront:     '#404040',
    // Accents
    green:  '#5dbe5d', red:    '#e06060', blue:   '#5b9bd5',
    yellow: '#e0c040', purple: '#b07de0', orange: '#e09030',
    white:  '#f0f0e8', cream:  '#f0e8d0', brown:  '#6a4a2a',
    sky:    '#80c8f0', grass:  '#5daa3a',
    potTerra: '#c07040', potRim: '#d08850',
    mugWhite: '#f0e8e0', mugHandle: '#d0c8b8',
    coffeeBody: '#666', coffeeDark: '#444',
    waterBlue: '#a0d8f0', waterBody: '#ddd',
  };

  // ══════════════════════════════════
  //  APARTMENT LAYOUT (single map)
  // ══════════════════════════════════

  // The apartment is divided into zones drawn on one canvas:
  //   Left zone:  OFFICE (wood floor)
  //   Center zone: DEV LAB (tile floor)
  //   Right zone: LOUNGE (carpet floor)
  // Walls along top with windows, divider walls between zones with doorways

  let layout = null; // built on resize

  function buildLayout(w, h) {
    const WS = [], DECOR = [], CLICK = [];
    const wallH = 42;       // wall height
    const floorY = wallH;   // floor starts here
    const zoneW = w / 3;    // each zone width
    const doorW = 36;       // doorway width
    const bottomPad = 24;   // status bar

    // ─── Zone boundaries ───
    const z0 = { x: 0,          w: zoneW,     label: 'OFFICE' };
    const z1 = { x: zoneW,      w: zoneW,     label: 'DEV LAB' };
    const z2 = { x: zoneW * 2,  w: zoneW,     label: 'LOUNGE' };

    // ─── OFFICE (zone 0): 3 desks with monitors, filing cabinet, plant ───
    const offDesk1X = z0.x + 16, offDesk1Y = floorY + 30;
    const offDesk2X = z0.x + 16, offDesk2Y = floorY + 80;
    const offDesk3X = z0.x + zoneW * 0.55, offDesk3Y = floorY + 55;

    WS.push({ x: offDesk1X, y: offDesk1Y, type: 'desk-monitor', chairX: offDesk1X + 14, chairY: offDesk1Y + 28, occupant: null });
    WS.push({ x: offDesk2X, y: offDesk2Y, type: 'desk-monitor', chairX: offDesk2X + 14, chairY: offDesk2Y + 28, occupant: null });
    WS.push({ x: offDesk3X, y: offDesk3Y, type: 'desk-laptop',  chairX: offDesk3X + 14, chairY: offDesk3Y + 28, occupant: null });

    DECOR.push({ type: 'window', x: z0.x + 20, y: 6, w: 36, h: 28 });
    DECOR.push({ type: 'window', x: z0.x + zoneW - 56, y: 6, w: 36, h: 28 });
    DECOR.push({ type: 'clock', x: z0.x + zoneW / 2, y: 18 });
    DECOR.push({ type: 'plant-large', x: z0.x + 8, y: h - bottomPad - 40 });
    DECOR.push({ type: 'filing-cabinet', x: z0.x + zoneW - 30, y: floorY + 8 });
    DECOR.push({ type: 'trash-can', x: offDesk1X + 50, y: offDesk1Y + 20 });
    DECOR.push({ type: 'zone-label', x: z0.x + zoneW / 2, y: floorY + 10, text: 'OFFICE' });

    // ─── DEV LAB (zone 1): 3 desks with PCs, server rack, whiteboard ───
    const labDesk1X = z1.x + 16, labDesk1Y = floorY + 30;
    const labDesk2X = z1.x + 16, labDesk2Y = floorY + 80;
    const labDesk3X = z1.x + zoneW * 0.55, labDesk3Y = floorY + 40;

    WS.push({ x: labDesk1X, y: labDesk1Y, type: 'desk-pc', chairX: labDesk1X + 14, chairY: labDesk1Y + 28, occupant: null });
    WS.push({ x: labDesk2X, y: labDesk2Y, type: 'desk-pc', chairX: labDesk2X + 14, chairY: labDesk2Y + 28, occupant: null });
    WS.push({ x: labDesk3X, y: labDesk3Y, type: 'desk-laptop', chairX: labDesk3X + 14, chairY: labDesk3Y + 28, occupant: null });

    CLICK.push({ id: 'server', label: 'SERVER RACK', x: z1.x + zoneW - 34, y: floorY + 6, w: 24, h: 50, color: C.blue });
    DECOR.push({ type: 'whiteboard', x: z1.x + 20, y: 6, w: 60, h: 28 });
    DECOR.push({ type: 'plant-small', x: z1.x + zoneW - 22, y: h - bottomPad - 30 });
    DECOR.push({ type: 'plant-small', x: z1.x + 10, y: h - bottomPad - 26 });
    DECOR.push({ type: 'zone-label', x: z1.x + zoneW / 2, y: floorY + 10, text: 'DEV LAB' });

    // ─── LOUNGE (zone 2): sofa, coffee table, coffee machine, bookshelf, plants ───
    WS.push({ x: z2.x + 14, y: floorY + 36, type: 'desk-laptop', chairX: z2.x + 28, chairY: floorY + 64, occupant: null });
    WS.push({ x: z2.x + zoneW * 0.5, y: floorY + 36, type: 'desk-laptop', chairX: z2.x + zoneW * 0.5 + 14, chairY: floorY + 64, occupant: null });

    CLICK.push({ id: 'coffee', label: 'COFFEE MACHINE', x: z2.x + zoneW - 36, y: floorY + 8, w: 26, h: 34, color: C.orange });
    CLICK.push({ id: 'bookshelf', label: 'BOOKSHELF', x: z2.x + 8, y: floorY + 4, w: 44, h: 36, color: C.brown });

    DECOR.push({ type: 'sofa', x: z2.x + 20, y: h - bottomPad - 44 });
    DECOR.push({ type: 'coffee-table', x: z2.x + 28, y: h - bottomPad - 70 });
    DECOR.push({ type: 'rug', x: z2.x + 14, y: h - bottomPad - 80, w: zoneW - 28, h: 24 });
    DECOR.push({ type: 'plant-large', x: z2.x + zoneW - 24, y: h - bottomPad - 42 });
    DECOR.push({ type: 'plant-small', x: z2.x + 6, y: h - bottomPad - 28 });
    DECOR.push({ type: 'window', x: z2.x + zoneW * 0.35, y: 6, w: 40, h: 28 });
    DECOR.push({ type: 'poster', x: z2.x + zoneW - 44, y: 8, w: 28, h: 22 });
    DECOR.push({ type: 'zone-label', x: z2.x + zoneW / 2, y: floorY + 10, text: 'LOUNGE' });
    DECOR.push({ type: 'water-cooler', x: z2.x + zoneW * 0.48, y: floorY + 6 });
    DECOR.push({ type: 'ceiling-light', x: z0.x + zoneW * 0.5, y: floorY });
    DECOR.push({ type: 'ceiling-light', x: z1.x + zoneW * 0.5, y: floorY });
    DECOR.push({ type: 'ceiling-light', x: z2.x + zoneW * 0.5, y: floorY });

    return {
      workstations: WS, decor: DECOR, clickables: CLICK,
      wallH, floorY, zoneW, doorW, bottomPad,
      zones: [z0, z1, z2],
    };
  }

  let hoveredClickable = null;
  let dialogOpen = false;
  let typewriterInterval = null;

  function openDialog(obj) {
    dialogOpen = true;
    dialogBox.classList.add('open');
    dialogTitle.textContent = obj.label;
    const texts = {
      bookshelf: 'Library loaded!\n2,481 entries indexed.\nKnowledge is power!',
      coffee:    'Brewing fresh coffee...\nEnergy +20!\nMorale boost activated.',
      board:     'Checking task board...\nPriority missions queued.\nAgents standing by!',
      server:    'Server rack humming.\nAll 8 nodes operational.\nUptime: 99.97%',
    };
    const full = texts[obj.id] || 'Inspecting...';
    dialogText.textContent = '';
    let i = 0;
    clearInterval(typewriterInterval);
    typewriterInterval = setInterval(() => {
      if (i < full.length) { dialogText.textContent += full[i]; i++; }
      else clearInterval(typewriterInterval);
    }, 25);
  }
  function closeDialog() { dialogOpen = false; dialogBox.classList.remove('open'); clearInterval(typewriterInterval); }
  dialogClose.addEventListener('click', closeDialog);

  // ══════════════════════════════════
  //  DRAWING FUNCTIONS
  // ══════════════════════════════════

  function drawApartment(w, h) {
    if (!layout) return;
    const { wallH, floorY, zoneW, doorW, zones } = layout;

    // ── FLOORS ──
    const ts = 18;
    // Zone 0: wood
    for (let y = floorY; y < h - layout.bottomPad; y += ts) {
      for (let x = 0; x < zoneW; x += ts) {
        const odd = ((Math.floor(x / ts) + Math.floor((y - floorY) / ts)) % 2 === 0);
        ctx.fillStyle = odd ? C.woodA : C.woodB;
        ctx.fillRect(x, y, ts, ts);
      }
    }
    // Wood grain lines
    ctx.strokeStyle = C.woodLine; ctx.lineWidth = 1;
    for (let y = floorY; y < h - layout.bottomPad; y += ts) {
      for (let x = 0; x < zoneW; x += ts) {
        const off = (Math.floor(x / ts) % 2) * (ts / 2);
        ctx.beginPath(); ctx.moveTo(x, y + off + ts * 0.3); ctx.lineTo(x + ts, y + off + ts * 0.3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x, y + off + ts * 0.7); ctx.lineTo(x + ts, y + off + ts * 0.7); ctx.stroke();
      }
    }

    // Zone 1: tile
    for (let y = floorY; y < h - layout.bottomPad; y += ts) {
      for (let x = Math.floor(zoneW); x < Math.floor(zoneW * 2); x += ts) {
        const odd = ((Math.floor(x / ts) + Math.floor((y - floorY) / ts)) % 2 === 0);
        ctx.fillStyle = odd ? C.tileA : C.tileB;
        ctx.fillRect(x, y, ts, ts);
      }
    }
    ctx.strokeStyle = C.tileLine; ctx.lineWidth = 0.5;
    for (let x = Math.floor(zoneW); x <= Math.floor(zoneW * 2); x += ts) {
      ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, h - layout.bottomPad); ctx.stroke();
    }
    for (let y = floorY; y <= h - layout.bottomPad; y += ts) {
      ctx.beginPath(); ctx.moveTo(Math.floor(zoneW), y); ctx.lineTo(Math.floor(zoneW * 2), y); ctx.stroke();
    }

    // Zone 2: carpet
    for (let y = floorY; y < h - layout.bottomPad; y += ts) {
      for (let x = Math.floor(zoneW * 2); x < w; x += ts) {
        const odd = ((Math.floor(x / ts) + Math.floor((y - floorY) / ts)) % 2 === 0);
        ctx.fillStyle = odd ? C.carpetA : C.carpetB;
        ctx.fillRect(x, y, ts, ts);
      }
    }

    // ── WALLS ──
    const wallG = ctx.createLinearGradient(0, 0, 0, wallH);
    wallG.addColorStop(0, C.wallTop); wallG.addColorStop(0.5, C.wallMid); wallG.addColorStop(1, C.wallBot);
    ctx.fillStyle = wallG;
    ctx.fillRect(0, 0, w, wallH);

    // Wainscoting / lower wall panel
    ctx.fillStyle = C.wallAccent;
    ctx.fillRect(0, wallH - 8, w, 8);
    // Top crown molding
    ctx.fillStyle = C.wallTrim; ctx.fillRect(0, 0, w, 3);
    // Bottom baseboard
    ctx.fillStyle = C.wallTrim; ctx.fillRect(0, wallH - 2, w, 2);

    // Subtle vertical panel lines on wall
    ctx.strokeStyle = 'rgba(160,140,110,0.15)'; ctx.lineWidth = 1;
    for (let px = 50; px < w; px += 60) {
      ctx.beginPath(); ctx.moveTo(px, 3); ctx.lineTo(px, wallH - 2); ctx.stroke();
    }

    // ── DIVIDER WALLS with doorways ──
    const dividers = [zoneW, zoneW * 2];
    const divW = 6;
    for (const dx of dividers) {
      const doorTop = floorY + 10;
      const doorBot = h - layout.bottomPad - 6;
      const doorMid = (doorTop + doorBot) / 2;
      const doorHalf = doorW / 2;

      // Wall above door
      ctx.fillStyle = C.wallTrim;
      ctx.fillRect(dx - divW / 2, floorY, divW, doorMid - doorHalf - floorY);
      // Wall below door
      ctx.fillRect(dx - divW / 2, doorMid + doorHalf, divW, h - layout.bottomPad - doorMid - doorHalf);

      // Door frame
      ctx.fillStyle = C.brown;
      ctx.fillRect(dx - divW / 2 - 2, doorMid - doorHalf - 3, divW + 4, 3); // top lintel
      ctx.fillRect(dx - divW / 2 - 2, doorMid - doorHalf - 3, 3, doorW + 6); // left jamb
      ctx.fillRect(dx + divW / 2 - 1, doorMid - doorHalf - 3, 3, doorW + 6); // right jamb

      // Floor in doorway (blend)
      ctx.fillStyle = C.woodA;
      ctx.fillRect(dx - divW / 2, doorMid - doorHalf, divW, doorW);

      // Shadow on doorway edges
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(dx - divW / 2, doorMid - doorHalf, 2, doorW);
      ctx.fillRect(dx + divW / 2 - 2, doorMid - doorHalf, 2, doorW);
    }
  }

  // ── Detailed furniture drawing ──

  function drawChair(x, y) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + 1, y + 1, 22, 16);
    // Seat
    ctx.fillStyle = C.chairSeat; ctx.fillRect(x, y, 22, 14);
    ctx.fillStyle = '#8a6838'; ctx.fillRect(x + 2, y + 2, 18, 10);
    // Back
    ctx.fillStyle = C.chairBack; ctx.fillRect(x + 2, y - 6, 18, 8);
    ctx.fillStyle = '#7a5830'; ctx.fillRect(x + 4, y - 5, 14, 5);
    // Legs
    ctx.fillStyle = '#5a4020';
    ctx.fillRect(x + 1, y + 13, 2, 3); ctx.fillRect(x + 19, y + 13, 2, 3);
  }

  function drawDeskWithMonitor(x, y, occupied) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + 2, y + 2, 48, 24);
    // Desk surface
    ctx.fillStyle = C.deskWood; ctx.fillRect(x, y, 48, 24);
    ctx.fillStyle = C.deskTop; ctx.fillRect(x, y, 48, 3);
    // Legs
    ctx.fillStyle = C.deskLeg;
    ctx.fillRect(x + 2, y + 22, 3, 4); ctx.fillRect(x + 43, y + 22, 3, 4);
    // Drawer
    ctx.fillStyle = '#906830'; ctx.fillRect(x + 32, y + 6, 13, 14);
    ctx.fillStyle = C.deskTop; ctx.fillRect(x + 33, y + 7, 11, 5);
    ctx.fillRect(x + 33, y + 14, 11, 5);
    ctx.fillStyle = '#c0a060';
    ctx.fillRect(x + 37, y + 8, 3, 2); ctx.fillRect(x + 37, y + 15, 3, 2);

    // Monitor
    const mx = x + 6, my = y + 2;
    ctx.fillStyle = C.monitorBody; ctx.fillRect(mx, my - 14, 22, 14);
    ctx.fillStyle = occupied ? C.monitorScreen : '#222'; ctx.fillRect(mx + 2, my - 12, 18, 10);
    // Monitor stand
    ctx.fillStyle = C.monitorStand; ctx.fillRect(mx + 8, my, 6, 3);
    ctx.fillRect(mx + 5, my + 2, 12, 2);

    if (occupied) {
      // Screen content — code lines
      const cc = [C.green, C.blue, C.yellow, C.orange, C.purple];
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = cc[i % cc.length];
        ctx.fillRect(mx + 4, my - 10 + i * 2.5, 4 + ((i * 5 + frameTick) % 10), 1);
      }
      // Cursor blink
      if (Math.floor(frameTick / 20) % 2 === 0) {
        ctx.fillStyle = C.green;
        ctx.fillRect(mx + 4 + (frameTick % 12), my - 2, 1, 2);
      }
    }

    // Keyboard
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(mx + 2, my + 5, 16, 5);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(mx + 3, my + 6, 14, 3);
    // Mouse
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(mx + 20, my + 6, 4, 5);
    ctx.fillStyle = '#555'; ctx.fillRect(mx + 21, my + 7, 2, 2);

    // Coffee mug on desk
    ctx.fillStyle = C.mugWhite; ctx.fillRect(x + 28, y + 5, 5, 6);
    ctx.fillStyle = C.mugHandle; ctx.fillRect(x + 33, y + 6, 2, 3);
    ctx.fillStyle = '#7a4a20'; ctx.fillRect(x + 29, y + 6, 3, 3);
    // Steam
    if (occupied && frameTick % 60 < 30) {
      ctx.fillStyle = 'rgba(200,200,200,0.25)';
      const sy = y + 3 - (frameTick % 20) * 0.2;
      ctx.fillRect(x + 30, sy, 1, 2);
      ctx.fillRect(x + 29, sy - 2, 1, 2);
    }
  }

  function drawDeskWithLaptop(x, y, occupied) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + 2, y + 2, 44, 22);
    ctx.fillStyle = C.deskWood; ctx.fillRect(x, y, 44, 22);
    ctx.fillStyle = C.deskTop; ctx.fillRect(x, y, 44, 3);
    ctx.fillStyle = C.deskLeg;
    ctx.fillRect(x + 2, y + 20, 3, 4); ctx.fillRect(x + 39, y + 20, 3, 4);

    // Laptop
    const lx = x + 8, ly = y + 3;
    // Screen (angled)
    ctx.fillStyle = C.laptopBody; ctx.fillRect(lx, ly, 22, 13);
    ctx.fillStyle = occupied ? C.laptopScreen : '#222'; ctx.fillRect(lx + 2, ly + 1, 18, 9);
    if (occupied) {
      const cc = [C.green, C.blue, C.yellow, C.red];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = cc[i];
        ctx.fillRect(lx + 4, ly + 2 + i * 2.5, 3 + ((i * 4 + frameTick) % 8), 1);
      }
      if (Math.floor(frameTick / 22) % 2 === 0) {
        ctx.fillStyle = C.green;
        ctx.fillRect(lx + 4 + (frameTick % 10), ly + 8, 1, 2);
      }
    }
    // Keyboard base
    ctx.fillStyle = C.laptopKey; ctx.fillRect(lx + 1, ly + 13, 20, 4);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(lx + 2, ly + 14, 18, 2);

    // Notepad & pen
    ctx.fillStyle = '#f0e8c0'; ctx.fillRect(x + 32, y + 5, 8, 10);
    ctx.fillStyle = '#e0d8b0'; ctx.fillRect(x + 32, y + 5, 8, 1);
    ctx.fillStyle = C.blue; ctx.fillRect(x + 34, y + 7, 4, 0.5);
    ctx.fillStyle = C.blue; ctx.fillRect(x + 34, y + 9, 3, 0.5);
    // Pen
    ctx.fillStyle = '#333'; ctx.fillRect(x + 36, y + 3, 1, 8);
    ctx.fillStyle = C.red; ctx.fillRect(x + 36, y + 3, 1, 2);
  }

  function drawDeskWithPC(x, y, occupied) {
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(x + 2, y + 2, 52, 24);
    ctx.fillStyle = C.deskWood; ctx.fillRect(x, y, 52, 24);
    ctx.fillStyle = C.deskTop; ctx.fillRect(x, y, 52, 3);
    ctx.fillStyle = C.deskLeg;
    ctx.fillRect(x + 2, y + 22, 3, 4); ctx.fillRect(x + 47, y + 22, 3, 4);

    // PC tower (on desk)
    const px = x + 36, py = y + 2;
    ctx.fillStyle = C.pcCase; ctx.fillRect(px, py, 12, 18);
    ctx.fillStyle = C.pcFront; ctx.fillRect(px + 1, py + 1, 10, 16);
    // Drive bay
    ctx.fillStyle = '#383838'; ctx.fillRect(px + 2, py + 2, 8, 3);
    // Power LED
    ctx.fillStyle = occupied ? C.green : '#333';
    ctx.fillRect(px + 3, py + 7, 2, 2);
    // Activity LED
    if (occupied && frameTick % 10 < 5) {
      ctx.fillStyle = C.orange; ctx.fillRect(px + 6, py + 7, 2, 2);
    }
    // Vent lines
    ctx.strokeStyle = '#383838'; ctx.lineWidth = 0.5;
    for (let vy = py + 11; vy < py + 16; vy += 2) {
      ctx.beginPath(); ctx.moveTo(px + 2, vy); ctx.lineTo(px + 10, vy); ctx.stroke();
    }

    // Monitor
    const mx = x + 6, my = y + 2;
    ctx.fillStyle = C.monitorBody; ctx.fillRect(mx, my - 14, 24, 15);
    ctx.fillStyle = occupied ? C.monitorScreen : '#222'; ctx.fillRect(mx + 2, my - 12, 20, 11);
    ctx.fillStyle = C.monitorStand; ctx.fillRect(mx + 9, my + 1, 6, 3);
    ctx.fillRect(mx + 6, my + 3, 12, 2);

    if (occupied) {
      const cc = [C.green, C.blue, C.yellow, C.orange, C.purple];
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = cc[i];
        ctx.fillRect(mx + 4, my - 10 + i * 2.2, 3 + ((i * 3 + frameTick) % 12), 1);
      }
    }

    // Keyboard
    ctx.fillStyle = '#3a3a3a'; ctx.fillRect(mx + 1, my + 6, 18, 5);
    ctx.fillStyle = '#4a4a4a'; ctx.fillRect(mx + 2, my + 7, 16, 3);
    // Mouse
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
    // Status light on desk
    ctx.fillStyle = occ ? C.green : '#888';
    ctx.beginPath(); ctx.arc(ws.x + 3, ws.y + 3, 2, 0, Math.PI * 2); ctx.fill();
  }

  function drawSofa(d) {
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(d.x + 2, d.y + 2, 56, 22);
    // Frame
    ctx.fillStyle = C.sofaBrown; ctx.fillRect(d.x, d.y, 56, 20);
    // Cushions
    ctx.fillStyle = C.sofaCush;
    ctx.fillRect(d.x + 3, d.y + 3, 24, 14);
    ctx.fillRect(d.x + 29, d.y + 3, 24, 14);
    // Stitch lines
    ctx.strokeStyle = 'rgba(0,0,0,0.1)'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(d.x + 27, d.y + 4); ctx.lineTo(d.x + 27, d.y + 16); ctx.stroke();
    // Back
    ctx.fillStyle = C.sofaArm; ctx.fillRect(d.x, d.y - 8, 56, 10);
    // Pillows on back
    ctx.fillStyle = '#c09868'; ctx.fillRect(d.x + 6, d.y - 6, 12, 6);
    ctx.fillStyle = '#c8a878'; ctx.fillRect(d.x + 38, d.y - 6, 12, 6);
    // Arm rests
    ctx.fillStyle = C.sofaArm;
    ctx.fillRect(d.x - 4, d.y - 8, 6, 28);
    ctx.fillRect(d.x + 54, d.y - 8, 6, 28);
    // Feet
    ctx.fillStyle = '#5a4020';
    ctx.fillRect(d.x, d.y + 19, 3, 3); ctx.fillRect(d.x + 53, d.y + 19, 3, 3);
  }

  function drawCoffeeTable(d) {
    ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(d.x + 1, d.y + 1, 36, 14);
    ctx.fillStyle = C.deskWood; ctx.fillRect(d.x, d.y, 36, 12);
    ctx.fillStyle = C.deskTop; ctx.fillRect(d.x, d.y, 36, 2);
    ctx.fillStyle = C.deskLeg;
    ctx.fillRect(d.x + 2, d.y + 11, 2, 3); ctx.fillRect(d.x + 32, d.y + 11, 2, 3);
    // Magazine
    ctx.fillStyle = '#e0c0a0'; ctx.fillRect(d.x + 6, d.y + 3, 8, 5);
    ctx.fillStyle = C.red; ctx.fillRect(d.x + 7, d.y + 4, 6, 1);
    // Coaster + cup
    ctx.fillStyle = '#c8b898'; ctx.fillRect(d.x + 22, d.y + 3, 7, 7);
    ctx.fillStyle = C.mugWhite; ctx.fillRect(d.x + 23, d.y + 4, 5, 5);
    ctx.fillStyle = '#7a4a20'; ctx.fillRect(d.x + 24, d.y + 5, 3, 3);
  }

  function drawBookshelf(obj) {
    const { x, y, w, h } = obj;
    const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x + 2, y + 2, w, h);
    // Frame
    ctx.fillStyle = C.shelfWood; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.shelfBack; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
    // Shelves and books
    const bookColors = ['#c04040','#4080c0','#40a040','#e0a020','#8050b0','#e07020','#30b0a0','#d05020','#e05050','#40c060','#a06080','#60a0a0'];
    for (let s = 0; s < 3; s++) {
      const sy = y + 3 + s * 10;
      // Shelf plank
      ctx.fillStyle = '#9a7a4a'; ctx.fillRect(x + 2, sy + 8, w - 4, 2);
      // Books
      for (let b = 0; b < 5 && (x + 4 + b * 8) < x + w - 4; b++) {
        const bh = 5 + (b % 3);
        ctx.fillStyle = bookColors[(s * 5 + b) % bookColors.length];
        ctx.fillRect(x + 4 + b * 8, sy + (8 - bh), 6, bh);
        // Spine line
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 6 + b * 8, sy + (8 - bh) + 1, 1, bh - 2);
      }
    }
    // Frame border
    ctx.strokeStyle = hov ? C.yellow : C.brown; ctx.lineWidth = hov ? 2 : 1;
    ctx.strokeRect(x, y, w, h);
  }

  function drawCoffeeMachine(obj) {
    const { x, y, w, h } = obj;
    const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x + 2, y + 2, w, h);
    // Table
    ctx.fillStyle = C.deskWood; ctx.fillRect(x - 2, y + h - 6, w + 4, 6);
    // Machine body
    ctx.fillStyle = C.coffeeBody; ctx.fillRect(x + 3, y, 18, 24);
    ctx.fillStyle = C.coffeeDark; ctx.fillRect(x + 5, y + 2, 14, 10);
    // Display
    ctx.fillStyle = '#1a3a2a'; ctx.fillRect(x + 6, y + 3, 12, 6);
    ctx.fillStyle = C.green; ctx.font = '4px monospace'; ctx.fillText('RDY', x + 8, y + 8);
    // Drip tray
    ctx.fillStyle = '#555'; ctx.fillRect(x + 6, y + 16, 12, 3);
    // Cup under spout
    ctx.fillStyle = C.mugWhite; ctx.fillRect(x + 9, y + 14, 5, 5);
    ctx.fillStyle = '#7a4a20'; ctx.fillRect(x + 10, y + 15, 3, 2);
    // Buttons
    ctx.fillStyle = C.red; ctx.fillRect(x + 6, y + 12, 3, 2);
    ctx.fillStyle = C.green; ctx.fillRect(x + 11, y + 12, 3, 2);
    // Power indicator
    const blink = (Math.floor(frameTick / 35) % 2);
    ctx.fillStyle = blink ? C.green : '#1a3a1a'; ctx.fillRect(x + 16, y + 12, 2, 2);

    // Steam from cup
    if (frameTick % 80 < 40) {
      ctx.fillStyle = 'rgba(200,200,200,0.2)';
      const sy2 = y + 12 - (frameTick % 16) * 0.3;
      ctx.fillRect(x + 11, sy2, 1, 3);
      ctx.fillRect(x + 10, sy2 - 2, 1, 2);
    }
    ctx.strokeStyle = hov ? C.yellow : C.orange; ctx.lineWidth = hov ? 2 : 1;
    ctx.strokeRect(x - 2, y, w + 4, h);
  }

  function drawServerRack(obj) {
    const { x, y, w, h } = obj;
    const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = '#505050'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#444'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    for (let r = 0; r < 5; r++) {
      const ry = y + 3 + r * 9;
      ctx.fillStyle = '#3a3a3a'; ctx.fillRect(x + 2, ry, w - 4, 7);
      ctx.fillStyle = '#333'; ctx.fillRect(x + 3, ry + 1, w - 6, 5);
      // Blinking LEDs
      for (let l = 0; l < 3; l++) {
        const on = ((r + l + Math.floor(frameTick / 25)) % 4) === 0;
        ctx.fillStyle = on ? C.green : '#1a1a1a';
        ctx.fillRect(x + 5 + l * 5, ry + 2, 2, 2);
      }
      // HDD activity
      if (r < 3 && frameTick % (12 + r * 3) < 6) {
        ctx.fillStyle = C.orange; ctx.fillRect(x + w - 6, ry + 2, 2, 2);
      }
    }
    ctx.strokeStyle = hov ? C.yellow : C.blue; ctx.lineWidth = hov ? 2 : 1;
    ctx.strokeRect(x, y, w, h);
  }

  function drawDecorItem(d) {
    switch (d.type) {
      case 'plant-large': {
        // Pot
        ctx.fillStyle = C.potTerra; ctx.fillRect(d.x, d.y + 10, 16, 14);
        ctx.fillStyle = C.potRim; ctx.fillRect(d.x - 1, d.y + 10, 18, 3);
        ctx.fillStyle = '#7a5030'; ctx.fillRect(d.x + 2, d.y + 22, 12, 2);
        // Soil
        ctx.fillStyle = '#5a4020'; ctx.fillRect(d.x + 2, d.y + 12, 12, 2);
        // Foliage (lush layered circles)
        ctx.fillStyle = '#3a8a30';
        ctx.beginPath(); ctx.arc(d.x + 4, d.y + 6, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.grass;
        ctx.beginPath(); ctx.arc(d.x + 12, d.y + 4, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#5dbe4d';
        ctx.beginPath(); ctx.arc(d.x + 8, d.y, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6ad060';
        ctx.beginPath(); ctx.arc(d.x + 6, d.y - 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(d.x + 11, d.y - 2, 3, 0, Math.PI * 2); ctx.fill();
        // Gentle sway
        const sw = Math.sin(frameTick * 0.02 + d.x) * 0.8;
        ctx.fillStyle = '#4aa040';
        ctx.beginPath(); ctx.arc(d.x + 8 + sw, d.y + 2, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'plant-small': {
        ctx.fillStyle = C.potTerra; ctx.fillRect(d.x + 2, d.y + 6, 10, 10);
        ctx.fillStyle = C.potRim; ctx.fillRect(d.x + 1, d.y + 6, 12, 2);
        ctx.fillStyle = C.grass;
        ctx.beginPath(); ctx.arc(d.x + 7, d.y + 3, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a9a30';
        ctx.beginPath(); ctx.arc(d.x + 4, d.y + 4, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(d.x + 10, d.y + 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6ac050';
        ctx.beginPath(); ctx.arc(d.x + 7, d.y - 1, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'filing-cabinet': {
        ctx.fillStyle = '#888'; ctx.fillRect(d.x, d.y, 18, 40);
        ctx.fillStyle = '#777'; ctx.fillRect(d.x + 1, d.y + 1, 16, 38);
        for (let dr = 0; dr < 3; dr++) {
          ctx.fillStyle = '#808080'; ctx.fillRect(d.x + 2, d.y + 3 + dr * 12, 14, 10);
          ctx.fillStyle = '#999'; ctx.fillRect(d.x + 3, d.y + 4 + dr * 12, 12, 8);
          // Handle
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
        // Taps
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 2, d.y + 24, 3, 3);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 9, d.y + 24, 3, 3);
        // Drip tray
        ctx.fillStyle = '#bbb'; ctx.fillRect(d.x - 1, d.y + 28, 16, 2);
        // Cup holder
        ctx.fillStyle = '#ccc'; ctx.fillRect(d.x + 14, d.y + 14, 6, 8);
        ctx.fillStyle = C.mugWhite; ctx.fillRect(d.x + 15, d.y + 15, 4, 4);
        break;
      }
      case 'clock': {
        const cx = d.x, cy = d.y, r = 10;
        // Frame
        ctx.fillStyle = C.brown; ctx.beginPath(); ctx.arc(cx, cy, r + 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        // Hour marks
        ctx.fillStyle = '#555';
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          ctx.fillRect(cx + Math.cos(a) * (r - 2) - 0.5, cy + Math.sin(a) * (r - 2) - 0.5, 1.5, 1.5);
        }
        // Hands
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
        // Center dot
        ctx.fillStyle = '#333'; ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'window': {
        // Frame
        ctx.fillStyle = C.brown;
        ctx.fillRect(d.x - 3, d.y - 3, d.w + 6, d.h + 6);
        ctx.fillStyle = '#8a6a3a';
        ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
        // Sky gradient
        const skyG = ctx.createLinearGradient(0, d.y, 0, d.y + d.h);
        skyG.addColorStop(0, '#60b8e8'); skyG.addColorStop(0.7, C.sky); skyG.addColorStop(1, '#a0d8a0');
        ctx.fillStyle = skyG; ctx.fillRect(d.x, d.y, d.w, d.h);
        // Sun
        ctx.fillStyle = '#f0d840';
        ctx.beginPath(); ctx.arc(d.x + d.w * 0.75, d.y + 8, 5, 0, Math.PI * 2); ctx.fill();
        // Sun rays
        ctx.fillStyle = 'rgba(240,216,64,0.2)';
        ctx.beginPath(); ctx.arc(d.x + d.w * 0.75, d.y + 8, 8, 0, Math.PI * 2); ctx.fill();
        // Clouds
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        const cx1 = d.x + 8 + (frameTick * 0.02) % (d.w + 10) - 5;
        ctx.beginPath(); ctx.arc(cx1, d.y + 14, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx1 + 6, d.y + 12, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx1 + 3, d.y + 11, 3, 0, Math.PI * 2); ctx.fill();
        // Cross dividers
        ctx.strokeStyle = C.brown; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(d.x + d.w / 2, d.y); ctx.lineTo(d.x + d.w / 2, d.y + d.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(d.x, d.y + d.h / 2); ctx.lineTo(d.x + d.w, d.y + d.h / 2); ctx.stroke();
        // Window sill
        ctx.fillStyle = '#9a7a4a'; ctx.fillRect(d.x - 4, d.y + d.h + 2, d.w + 8, 3);
        // Curtain hints
        ctx.fillStyle = 'rgba(180,160,130,0.25)';
        ctx.fillRect(d.x, d.y, 4, d.h);
        ctx.fillRect(d.x + d.w - 4, d.y, 4, d.h);
        break;
      }
      case 'whiteboard': {
        ctx.fillStyle = '#777'; ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
        ctx.fillStyle = C.white; ctx.fillRect(d.x, d.y, d.w, d.h);
        // Content
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 4, d.y + 4, 20, 2);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 4, d.y + 9, 30, 2);
        ctx.fillStyle = C.green; ctx.fillRect(d.x + 4, d.y + 14, 14, 2);
        ctx.fillStyle = '#333'; ctx.fillRect(d.x + 4, d.y + 19, 26, 2);
        // Diagram box
        ctx.strokeStyle = C.purple; ctx.lineWidth = 1;
        ctx.strokeRect(d.x + 38, d.y + 4, 16, 12);
        ctx.strokeStyle = C.orange;
        ctx.beginPath(); ctx.moveTo(d.x + 42, d.y + 10); ctx.lineTo(d.x + 50, d.y + 10); ctx.stroke();
        // Marker tray
        ctx.fillStyle = '#999'; ctx.fillRect(d.x + 10, d.y + d.h, 34, 3);
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 12, d.y + d.h, 6, 3);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 20, d.y + d.h, 6, 3);
        ctx.fillStyle = '#333'; ctx.fillRect(d.x + 28, d.y + d.h, 6, 3);
        break;
      }
      case 'poster': {
        ctx.fillStyle = C.brown; ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
        // Pixel art landscape
        ctx.fillStyle = '#60b8e8'; ctx.fillRect(d.x, d.y, d.w, d.h * 0.5);
        ctx.fillStyle = C.grass; ctx.fillRect(d.x, d.y + d.h * 0.5, d.w, d.h * 0.3);
        ctx.fillStyle = '#4a8a30'; ctx.fillRect(d.x, d.y + d.h * 0.8, d.w, d.h * 0.2);
        // Mountains
        ctx.fillStyle = '#8a8a8a';
        ctx.beginPath(); ctx.moveTo(d.x + 4, d.y + d.h * 0.5);
        ctx.lineTo(d.x + 10, d.y + 4); ctx.lineTo(d.x + 16, d.y + d.h * 0.5); ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.beginPath(); ctx.moveTo(d.x + 14, d.y + d.h * 0.5);
        ctx.lineTo(d.x + 20, d.y + 6); ctx.lineTo(d.x + 26, d.y + d.h * 0.5); ctx.fill();
        // Sun
        ctx.fillStyle = '#f0d040'; ctx.beginPath(); ctx.arc(d.x + d.w - 6, d.y + 5, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'sofa': drawSofa(d); break;
      case 'coffee-table': drawCoffeeTable(d); break;
      case 'rug': {
        ctx.fillStyle = '#a06040'; ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = '#b87858'; ctx.fillRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
        ctx.strokeStyle = '#c89070'; ctx.lineWidth = 1;
        ctx.strokeRect(d.x + 4, d.y + 4, d.w - 8, d.h - 8);
        // Diamond pattern
        ctx.fillStyle = '#c89070';
        for (let rx = d.x + 12; rx < d.x + d.w - 8; rx += 14) {
          const ry = d.y + d.h / 2;
          ctx.beginPath(); ctx.moveTo(rx, ry - 4); ctx.lineTo(rx + 4, ry);
          ctx.lineTo(rx, ry + 4); ctx.lineTo(rx - 4, ry); ctx.closePath(); ctx.fill();
        }
        // Fringe
        ctx.fillStyle = '#b87858';
        for (let fx = d.x + 2; fx < d.x + d.w - 2; fx += 4) {
          ctx.fillRect(fx, d.y + d.h, 2, 3);
          ctx.fillRect(fx, d.y - 3, 2, 3);
        }
        break;
      }
      case 'ceiling-light': {
        // Light cone
        ctx.fillStyle = 'rgba(255,245,200,0.06)';
        ctx.beginPath();
        ctx.moveTo(d.x - 4, d.y); ctx.lineTo(d.x - 30, d.y + 50);
        ctx.lineTo(d.x + 30, d.y + 50); ctx.lineTo(d.x + 4, d.y);
        ctx.closePath(); ctx.fill();
        // Fixture
        ctx.fillStyle = '#888'; ctx.fillRect(d.x - 1, d.y - 4, 2, 4);
        ctx.fillStyle = C.cream;
        ctx.beginPath(); ctx.moveTo(d.x - 6, d.y + 4); ctx.lineTo(d.x - 3, d.y);
        ctx.lineTo(d.x + 3, d.y); ctx.lineTo(d.x + 6, d.y + 4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#f0e8c0'; ctx.beginPath(); ctx.arc(d.x, d.y + 2, 3, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'zone-label': {
        ctx.font = '6px monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(100,80,50,0.25)';
        ctx.fillText(d.text, d.x, d.y);
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

  // ── Sprite class ──
  class Sprite {
    constructor(name, label) {
      this.name = name; this.label = label || name;
      this.palette = PALETTES[Math.abs(hashStr(name)) % PALETTES.length];
      // Random starting position across full apartment
      const rect = canvas.getBoundingClientRect();
      this.x = 20 + Math.random() * (rect.width - DRAW_W - 40);
      this.y = 50 + Math.random() * Math.max(40, rect.height - DRAW_H - 80);
      this.vx = 0; this.vy = 0; this.state = 'idle';
      this.frame = 0; this.frameTick = 0; this.direction = 1;
      this.bubble = null; this.bubbleTimer = 0;
      this.idleTimer = randomRange(120, 360);
      this.walkTimer = 0; this.bobOffset = 0;
      this.spawnAnim = 1.0; this.jumpY = 0; this.jumpVel = 0;
      this.assignedSeat = null;
    }

    update() {
      this.spawnAnim = Math.max(0, this.spawnAnim - 0.03);
      this.frameTick++;
      if (this.jumpVel !== 0 || this.jumpY < 0) {
        this.jumpY += this.jumpVel; this.jumpVel += 0.8;
        if (this.jumpY >= 0) { this.jumpY = 0; this.jumpVel = 0; }
      }
      if (this.bubbleTimer > 0) { this.bubbleTimer--; if (this.bubbleTimer <= 0) this.bubble = null; }

      const rect = canvas.getBoundingClientRect();
      const minX = 10, minY = (layout ? layout.floorY : 42) + 4;
      const maxX = rect.width - DRAW_W - 8, maxY = rect.height - DRAW_H - (layout ? layout.bottomPad : 24) - 4;

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
        case 'walking':
          this.bobOffset = Math.sin(this.frameTick * 0.15);
          this.x += this.vx; this.y += this.vy; this.walkTimer--;
          if (this.x < minX) { this.x = minX; this.vx = Math.abs(this.vx); this.direction = 1; }
          if (this.x > maxX) { this.x = maxX; this.vx = -Math.abs(this.vx); this.direction = -1; }
          if (this.y < minY) { this.y = minY; this.vy = Math.abs(this.vy); }
          if (this.y > maxY) { this.y = maxY; this.vy = -Math.abs(this.vy); }
          if (this.frameTick % 10 === 0) this.frame = this.frame === 0 ? 1 : 0;
          if (this.walkTimer <= 0) { this.state = 'idle'; this.vx = 0; this.vy = 0; this.frame = 0; this.idleTimer = randomRange(100, 300); }
          break;
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

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(drawX + DRAW_W / 2, this.y + DRAW_H - 2, DRAW_W / 3, 4, 0, 0, Math.PI * 2); ctx.fill();

      // Active glow
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

      // Name tag
      ctx.font = '8px monospace'; ctx.textAlign = 'center';
      const tw = ctx.measureText(this.label).width + 8;
      const tx = drawX + DRAW_W / 2 - tw / 2, ty = drawY - 12;
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      roundRect(ctx, tx, ty, tw, 12, 3); ctx.fill();
      ctx.strokeStyle = this.palette.shirt; ctx.lineWidth = 1; ctx.globalAlpha = 0.6;
      roundRect(ctx, tx, ty, tw, 12, 3); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.fillStyle = '#333';
      ctx.fillText(this.label, drawX + DRAW_W / 2, ty + 9);

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
            if (!layout.workstations[i].occupant) {
              layout.workstations[i].occupant = this.name;
              this.assignedSeat = i; break;
            }
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

    drawApartment(w, h);

    if (layout) {
      // Draw rugs first (under everything)
      for (const d of layout.decor) { if (d.type === 'rug') drawDecorItem(d); }
      // Zone labels
      for (const d of layout.decor) { if (d.type === 'zone-label') drawDecorItem(d); }
      // Ceiling lights
      for (const d of layout.decor) { if (d.type === 'ceiling-light') drawDecorItem(d); }
      // Furniture (sorted by Y for depth)
      const allFurniture = [];
      for (const ws of layout.workstations) allFurniture.push({ y: ws.y, draw: () => drawWorkstation(ws) });
      for (const obj of layout.clickables) {
        if (obj.id === 'bookshelf') allFurniture.push({ y: obj.y, draw: () => drawBookshelf(obj) });
        else if (obj.id === 'coffee') allFurniture.push({ y: obj.y, draw: () => drawCoffeeMachine(obj) });
        else if (obj.id === 'server') allFurniture.push({ y: obj.y, draw: () => drawServerRack(obj) });
      }
      for (const d of layout.decor) {
        if (d.type !== 'rug' && d.type !== 'zone-label' && d.type !== 'ceiling-light') {
          const dy = d.y || 0;
          allFurniture.push({ y: dy, draw: () => drawDecorItem(d) });
        }
      }

      // Sprites mixed with furniture for proper depth
      const allSprites = [...sprites.values()];
      for (const s of allSprites) {
        allFurniture.push({ y: s.y + DRAW_H, draw: () => { s.update(); s.draw(); }, isSprite: true });
      }

      allFurniture.sort((a, b) => a.y - b.y);
      for (const item of allFurniture) item.draw();

      // Update sprites that weren't drawn (none in single-map mode, but keep pattern)
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

  // ── Demo agents spread across the apartment ──
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
