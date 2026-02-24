// @ts-nocheck
/* Pixel Agent – Multi-Room Minecraft-Style Office */
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
  const roomTabs = document.querySelectorAll('.room-tab');

  let CONFIG = { maxSprites: 12, spriteSpeed: 1.0, showBubbles: true };

  // ── Bright Minecraft-style palettes ──
  const PALETTES = [
    { hair: '#5b3a1a', skin: '#f5c6a0', shirt: '#5b9bd5', outline: '#3a2a10' },
    { hair: '#e0a830', skin: '#e8b88a', shirt: '#e06060', outline: '#8a6a10' },
    { hair: '#2a2a2a', skin: '#8d5524', shirt: '#5dbe5d', outline: '#1a1a1a' },
    { hair: '#c04040', skin: '#fddcb5', shirt: '#b07de0', outline: '#7a2020' },
    { hair: '#f0c080', skin: '#c68642', shirt: '#e0c040', outline: '#a08040' },
    { hair: '#8050b0', skin: '#fce0c8', shirt: '#50a0e0', outline: '#5030a0' },
    { hair: '#405060', skin: '#a0785a', shirt: '#e09030', outline: '#2a3040' },
    { hair: '#d07020', skin: '#f0d5b8', shirt: '#e05080', outline: '#904010' },
  ];

  const TILE = 16, SCALE = 3;
  const DRAW_W = TILE * SCALE, DRAW_H = TILE * SCALE;
  const sprites = new Map();
  let frameTick = 0;

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
      case 'E': return '#f0f0f0';  case 'P': return '#2a2a30';
      case 'T': return pal.shirt;  case 'O': return pal.outline;
      case 'L': return '#4a4050';  default: return null;
    }
  }

  // ── Minecraft-bright colors ──
  const C = {
    // Floors
    oakPlank:  '#b8935a', oakPlankB: '#a88348', plankLine: 'rgba(90,60,20,0.15)',
    stoneTile: '#a0a0a0', stoneTileB:'#909090', stoneLine: 'rgba(60,60,60,0.12)',
    carpet:    '#7a9e5a', carpetB:   '#6a8e4a',
    // Walls
    wallOak:   '#8a6a3a', wallOakTop:'#705528', wallStone: '#888888', wallStoneTop: '#707070',
    wallBrick: '#b07050', wallBrickTop:'#905838',
    // Furniture
    oakDesk:   '#9a7a48', oakDeskTop:'#b08a58', oakChair: '#7a6030',
    // Accents
    green:  '#5dbe5d', red:    '#e06060', blue:   '#5b9bd5',
    yellow: '#e0c040', purple: '#b07de0', orange: '#e09030',
    white:  '#f0f0e8', cream:  '#e8e0d0', brown:  '#6a4a2a',
    sky:    '#80c8f0', grass:  '#5daa3a', dirt:   '#8a6a3a',
  };

  // ══════════════════════════
  //  ROOM SYSTEM
  // ══════════════════════════
  const ROOMS = [
    { id: 'office',  label: 'OFFICE',    floorA: C.oakPlank, floorB: C.oakPlankB, floorLine: C.plankLine,
      wallColor: C.wallOak, wallTop: C.wallOakTop },
    { id: 'devlab',  label: 'DEV LAB',   floorA: C.stoneTile, floorB: C.stoneTileB, floorLine: C.stoneLine,
      wallColor: C.wallStone, wallTop: C.wallStoneTop },
    { id: 'lounge',  label: 'LOUNGE',    floorA: C.carpet, floorB: C.carpetB, floorLine: 'rgba(40,80,20,0.08)',
      wallColor: C.wallBrick, wallTop: C.wallBrickTop },
  ];

  let currentRoom = 0;

  // Per-room layout data
  const roomLayouts = [null, null, null]; // built on resize

  function buildRoomLayout(roomIdx, w, h) {
    const WS = [], DECOR = [], CLICK = [];
    const wallB = 36, pad = 10;

    switch (roomIdx) {
      case 0: { // OFFICE — 2 workstations, coffee, plant, clock
        const gx = Math.floor((w - 40) / 2.5);
        for (let i = 0; i < 2; i++) {
          const dx = pad + 20 + i * gx;
          const dy = wallB + 30;
          WS.push({ x: dx, y: dy, w: 44, h: 26, chairX: dx + 12, chairY: dy + 30, occupant: null });
        }
        CLICK.push({ id: 'coffee', label: 'COFFEE', x: w - 46, y: h - 56, w: 28, h: 22, color: C.orange });
        CLICK.push({ id: 'board', label: 'TASKS', x: w * 0.35, y: wallB - 4, w: 50, h: 16, color: C.green });
        DECOR.push({ type: 'plant', x: pad + 4, y: wallB + 6 });
        DECOR.push({ type: 'plant', x: w - 26, y: wallB + 6 });
        DECOR.push({ type: 'clock', x: w * 0.18, y: wallB - 2 });
        DECOR.push({ type: 'window', x: w * 0.7, y: 6, w: 40, h: 24 });
        DECOR.push({ type: 'light', x: w * 0.4, y: wallB });
        break;
      }
      case 1: { // DEV LAB — 2 workstations, bookshelf, servers, whiteboard
        const gx = Math.floor((w - 40) / 2.5);
        for (let i = 0; i < 2; i++) {
          const dx = pad + 20 + i * gx;
          const dy = wallB + 40;
          WS.push({ x: dx, y: dy, w: 44, h: 26, chairX: dx + 12, chairY: dy + 30, occupant: null });
        }
        CLICK.push({ id: 'bookshelf', label: 'BOOKS', x: w - 54, y: wallB + 2, w: 40, h: 30, color: C.brown });
        CLICK.push({ id: 'server', label: 'SERVERS', x: pad + 2, y: wallB + 50, w: 24, h: 40, color: C.blue });
        DECOR.push({ type: 'whiteboard', x: w * 0.3, y: wallB - 4, w: 56, h: 18 });
        DECOR.push({ type: 'plant', x: w - 22, y: h - 50 });
        DECOR.push({ type: 'light', x: w * 0.35, y: wallB });
        DECOR.push({ type: 'light', x: w * 0.7, y: wallB });
        break;
      }
      case 2: { // LOUNGE — 2 workstations, couch, cooler, plants, rug
        const gx = Math.floor((w - 40) / 2.5);
        for (let i = 0; i < 2; i++) {
          const dx = pad + 30 + i * gx;
          const dy = wallB + 20;
          WS.push({ x: dx, y: dy, w: 44, h: 26, chairX: dx + 12, chairY: dy + 30, occupant: null });
        }
        CLICK.push({ id: 'coffee', label: 'DRINKS', x: w - 40, y: wallB + 4, w: 26, h: 20, color: C.orange });
        DECOR.push({ type: 'couch', x: pad + 6, y: h - 60 });
        DECOR.push({ type: 'cooler', x: pad + 4, y: wallB + 30 });
        DECOR.push({ type: 'plant', x: w * 0.5, y: h - 48 });
        DECOR.push({ type: 'plant', x: w - 24, y: h - 48 });
        DECOR.push({ type: 'plant', x: pad + 4, y: h - 46 });
        DECOR.push({ type: 'rug', x: w * 0.25, y: h * 0.55, w: w * 0.4, h: 16 });
        DECOR.push({ type: 'window', x: w * 0.35, y: 6, w: 44, h: 24 });
        DECOR.push({ type: 'window', x: w * 0.65, y: 6, w: 36, h: 24 });
        break;
      }
    }
    return { workstations: WS, decor: DECOR, clickables: CLICK };
  }

  function getCurrentLayout() { return roomLayouts[currentRoom]; }

  // Room tab click
  roomTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => {
      currentRoom = i;
      roomTabs.forEach((t, j) => t.classList.toggle('active', j === i));
    });
  });

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
      server:    'Server rack online.\nAll nodes operational.\nUptime: 99.97%',
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

  // ══════════════════════════
  //  DRAWING
  // ══════════════════════════

  function drawFloor(w, h, room) {
    const ts = 20;
    for (let y = 0; y < h; y += ts) {
      for (let x = 0; x < w; x += ts) {
        ctx.fillStyle = ((Math.floor(x / ts) + Math.floor(y / ts)) % 2 === 0) ? room.floorA : room.floorB;
        ctx.fillRect(x, y, ts, ts);
      }
    }
    ctx.strokeStyle = room.floorLine; ctx.lineWidth = 1;
    for (let x = 0; x <= w; x += ts) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y <= h; y += ts) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }

  function drawWalls(w, h, room) {
    // Top wall
    ctx.fillStyle = room.wallColor; ctx.fillRect(0, 0, w, 36);
    ctx.fillStyle = room.wallTop; ctx.fillRect(0, 0, w, 5);
    // Trim
    ctx.fillStyle = C.cream; ctx.fillRect(0, 34, w, 2);
    // Left wall
    ctx.fillStyle = room.wallColor; ctx.fillRect(0, 0, 8, h);
    ctx.fillStyle = room.wallTop; ctx.fillRect(0, 0, 3, h);
    ctx.fillStyle = C.cream; ctx.fillRect(6, 36, 2, h - 36);
  }

  function drawWorkstation(ws) {
    const { x, y, w, h, chairX, chairY, occupant } = ws;
    // Chair
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(chairX + 2, chairY + 2, 20, 14);
    ctx.fillStyle = C.oakChair; ctx.fillRect(chairX, chairY, 20, 12);
    ctx.fillStyle = '#8a7038'; ctx.fillRect(chairX + 2, chairY + 1, 16, 8);
    ctx.fillStyle = '#6a5020'; ctx.fillRect(chairX + 4, chairY - 3, 12, 5);

    // Desk
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = C.oakDesk; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.oakDeskTop; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = C.brown;
    ctx.fillRect(x + 2, y + h - 2, 3, 2);
    ctx.fillRect(x + w - 5, y + h - 2, 3, 2);

    // Laptop
    const lx = x + 6, ly = y + 4, lw = 20, lh = 12;
    ctx.fillStyle = '#555'; ctx.fillRect(lx, ly, lw, lh);
    ctx.fillStyle = occupant ? '#2a4a6a' : '#333'; ctx.fillRect(lx + 2, ly + 2, lw - 4, lh - 4);
    if (occupant) {
      const cc = [C.green, C.blue, C.yellow, C.red];
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = cc[i]; ctx.fillRect(lx + 4, ly + 3 + i * 3, 4 + (i * 3) % 8, 1.5);
      }
      if (Math.floor(frameTick / 25) % 2 === 0) {
        ctx.fillStyle = C.green; ctx.fillRect(lx + 4 + (frameTick % 30) * 0.3, ly + 3 + 9, 2, 2);
      }
    }
    // Keyboard
    ctx.fillStyle = '#444'; ctx.fillRect(lx + 2, ly + lh + 1, lw - 4, 3);

    // Mug
    ctx.fillStyle = C.cream; ctx.fillRect(x + w - 10, y + 5, 5, 5);
    ctx.fillStyle = '#7a5020'; ctx.fillRect(x + w - 9, y + 6, 3, 2);

    // Status light
    ctx.fillStyle = occupant ? C.green : '#888';
    ctx.beginPath(); ctx.arc(x + w - 3, y + 3, 2, 0, Math.PI * 2); ctx.fill();
  }

  function drawBookshelf(obj) {
    const { x, y, w, h } = obj;
    const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = C.brown; ctx.fillRect(x, y, w, h);
    const bk = ['#c04040','#4080c0','#40a040','#e0a020','#8050b0','#e07020','#30b0a0','#d05020','#e05050','#40c060'];
    for (let s = 0; s < 3; s++) {
      const sy = y + 2 + s * 9;
      ctx.fillStyle = '#8a6a3a'; ctx.fillRect(x + 2, sy + 7, w - 4, 2);
      for (let b = 0; b < 5 && (x + 4 + b * 7) < x + w - 3; b++) {
        ctx.fillStyle = bk[(s * 5 + b) % bk.length];
        ctx.fillRect(x + 4 + b * 7, sy, 5, 6 + (b % 2));
      }
    }
    ctx.strokeStyle = hov ? C.yellow : C.brown; ctx.lineWidth = hov ? 2 : 1;
    ctx.strokeRect(x, y, w, h);
  }

  function drawCoffee(obj) {
    const { x, y, w, h } = obj;
    const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = C.oakDesk; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = C.oakDeskTop; ctx.fillRect(x, y, w, 2);
    // Machine
    ctx.fillStyle = '#666'; ctx.fillRect(x + 3, y + 3, 10, 12);
    ctx.fillStyle = '#444'; ctx.fillRect(x + 5, y + 5, 6, 5);
    ctx.fillStyle = (Math.floor(frameTick / 35) % 2) ? C.red : '#600'; ctx.fillRect(x + 6, y + 12, 3, 2);
    // Cups
    ctx.fillStyle = C.cream; ctx.fillRect(x + 16, y + 6, 4, 5); ctx.fillRect(x + 21, y + 7, 3, 4);
    // Steam
    if (frameTick % 70 < 35) {
      ctx.fillStyle = 'rgba(200,200,200,0.2)';
      const sy = y + 2 - (frameTick % 15) * 0.3;
      ctx.fillRect(x + 17, sy, 2, 3);
    }
    ctx.strokeStyle = hov ? C.yellow : C.orange; ctx.lineWidth = hov ? 2 : 1;
    ctx.strokeRect(x, y, w, h);
  }

  function drawServer(obj) {
    const { x, y, w, h } = obj;
    const hov = hoveredClickable === obj;
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(x + 2, y + 2, w, h);
    ctx.fillStyle = '#555'; ctx.fillRect(x, y, w, h);
    for (let r = 0; r < 4; r++) {
      ctx.fillStyle = '#444'; ctx.fillRect(x + 2, y + 3 + r * 9, w - 4, 7);
      ctx.fillStyle = '#333'; ctx.fillRect(x + 3, y + 4 + r * 9, w - 6, 5);
      // Blinking lights
      for (let l = 0; l < 3; l++) {
        const on = ((r + l + Math.floor(frameTick / 30)) % 3) === 0;
        ctx.fillStyle = on ? C.green : '#2a2a2a';
        ctx.fillRect(x + 5 + l * 5, y + 5 + r * 9, 3, 2);
      }
    }
    ctx.strokeStyle = hov ? C.yellow : C.blue; ctx.lineWidth = hov ? 2 : 1;
    ctx.strokeRect(x, y, w, h);
  }

  function drawBoard(obj) {
    const { x, y, w, h } = obj;
    const hov = hoveredClickable === obj;
    ctx.fillStyle = C.cream; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = C.brown; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
    const mc = [C.green, C.yellow, C.red, C.blue, C.purple];
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = mc[i]; ctx.fillRect(x + 3 + i * 9, y + 3, 7, 8);
      ctx.fillStyle = '#555'; ctx.fillRect(x + 4 + i * 9, y + 6, 5, 1);
    }
    if (hov) { ctx.strokeStyle = C.yellow; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h); }
  }

  function drawDecorItem(d) {
    switch (d.type) {
      case 'plant': {
        ctx.fillStyle = '#c07040'; ctx.fillRect(d.x, d.y + 6, 12, 9);
        ctx.fillStyle = '#d08050'; ctx.fillRect(d.x - 1, d.y + 6, 14, 3);
        ctx.fillStyle = C.grass;
        ctx.beginPath(); ctx.arc(d.x + 6, d.y + 2, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4a9a30';
        ctx.beginPath(); ctx.arc(d.x + 3, d.y + 4, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(d.x + 10, d.y + 3, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6ac050';
        ctx.beginPath(); ctx.arc(d.x + 7, d.y - 1, 3, 0, Math.PI * 2); ctx.fill();
        const sw = Math.sin(frameTick * 0.03 + d.x) * 0.5;
        ctx.fillStyle = C.grass;
        ctx.beginPath(); ctx.arc(d.x + 5 + sw, d.y + 1, 2, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'cooler': {
        ctx.fillStyle = '#ddd'; ctx.fillRect(d.x, d.y + 6, 14, 26);
        ctx.fillStyle = '#a0d8ef'; ctx.fillRect(d.x + 3, d.y, 8, 8);
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 2, d.y + 22, 3, 3);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 9, d.y + 22, 3, 3);
        ctx.fillStyle = '#bbb'; ctx.fillRect(d.x - 1, d.y + 30, 16, 3);
        break;
      }
      case 'rug': {
        ctx.fillStyle = '#a06040'; ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.strokeStyle = '#c08060'; ctx.lineWidth = 1;
        ctx.strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
        ctx.fillStyle = '#c08060';
        for (let rx = d.x + 8; rx < d.x + d.w - 6; rx += 10) {
          const ry = d.y + d.h / 2;
          ctx.beginPath(); ctx.moveTo(rx, ry - 3); ctx.lineTo(rx + 3, ry);
          ctx.lineTo(rx, ry + 3); ctx.lineTo(rx - 3, ry); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'clock': {
        const cx = d.x, cy = d.y, r = 8;
        ctx.fillStyle = C.brown; ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
        const now = new Date();
        const ha = ((now.getHours() % 12 + now.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2;
        const ma = (now.getMinutes() / 60) * Math.PI * 2 - Math.PI / 2;
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ha) * r * 0.5, cy + Math.sin(ha) * r * 0.5); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ma) * r * 0.7, cy + Math.sin(ma) * r * 0.7); ctx.stroke();
        break;
      }
      case 'window': {
        ctx.fillStyle = C.brown; ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
        const skyG = ctx.createLinearGradient(0, d.y, 0, d.y + d.h);
        skyG.addColorStop(0, '#60b0e0'); skyG.addColorStop(1, C.sky);
        ctx.fillStyle = skyG; ctx.fillRect(d.x, d.y, d.w, d.h);
        // Sun
        ctx.fillStyle = '#f0d040'; ctx.beginPath(); ctx.arc(d.x + d.w * 0.7, d.y + 8, 5, 0, Math.PI * 2); ctx.fill();
        // Clouds
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.arc(d.x + 8, d.y + 12, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(d.x + 14, d.y + 10, 4, 0, Math.PI * 2); ctx.fill();
        // Cross
        ctx.strokeStyle = C.brown; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(d.x + d.w / 2, d.y); ctx.lineTo(d.x + d.w / 2, d.y + d.h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(d.x, d.y + d.h / 2); ctx.lineTo(d.x + d.w, d.y + d.h / 2); ctx.stroke();
        break;
      }
      case 'whiteboard': {
        ctx.fillStyle = '#666'; ctx.fillRect(d.x - 2, d.y - 2, d.w + 4, d.h + 4);
        ctx.fillStyle = C.white; ctx.fillRect(d.x, d.y, d.w, d.h);
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 4, d.y + 3, 16, 2);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 4, d.y + 7, 24, 2);
        ctx.fillStyle = C.green; ctx.fillRect(d.x + 4, d.y + 11, 12, 2);
        // Marker tray
        ctx.fillStyle = '#888'; ctx.fillRect(d.x + 8, d.y + d.h, 30, 3);
        ctx.fillStyle = C.red; ctx.fillRect(d.x + 10, d.y + d.h, 5, 3);
        ctx.fillStyle = C.blue; ctx.fillRect(d.x + 18, d.y + d.h, 5, 3);
        break;
      }
      case 'couch': {
        ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(d.x + 2, d.y + 2, 44, 20);
        ctx.fillStyle = '#7a5a3a'; ctx.fillRect(d.x, d.y, 44, 18);
        ctx.fillStyle = '#8a6a4a'; ctx.fillRect(d.x + 2, d.y + 2, 40, 12);
        // Cushions
        ctx.fillStyle = '#a08060'; ctx.fillRect(d.x + 3, d.y + 3, 18, 10);
        ctx.fillRect(d.x + 23, d.y + 3, 18, 10);
        // Back
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(d.x, d.y - 4, 44, 6);
        // Arm rests
        ctx.fillStyle = '#6a4a2a'; ctx.fillRect(d.x - 3, d.y - 4, 5, 22);
        ctx.fillRect(d.x + 42, d.y - 4, 5, 22);
        break;
      }
      case 'light': {
        ctx.fillStyle = 'rgba(255,240,180,0.08)';
        ctx.beginPath(); ctx.ellipse(d.x, d.y + 16, 28, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(d.x, d.y + 3, 3, 0, Math.PI * 2); ctx.fill();
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
    hudHpBar.style.width = Math.min(100, 60 + active * 15) + '%';
    hudEpBar.style.width = Math.max(10, 100 - total * 8) + '%';
  }

  // ── Sprite (with room assignment) ──
  class Sprite {
    constructor(name, label, room) {
      this.name = name; this.label = label || name;
      this.room = room != null ? room : 0;
      this.palette = PALETTES[Math.abs(hashStr(name)) % PALETTES.length];
      this.x = 40 + Math.random() * 80; this.y = 50 + Math.random() * 60;
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
      const minX = 10, minY = 38, maxX = rect.width - DRAW_W - 8, maxY = rect.height - DRAW_H - 24;

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
            this.walkTimer = randomRange(80, 200);
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
          const layout = roomLayouts[this.room];
          if (layout && this.assignedSeat !== null && layout.workstations[this.assignedSeat]) {
            const ws = layout.workstations[this.assignedSeat];
            this.x += (ws.chairX - 2 - this.x) * 0.08;
            this.y += (ws.chairY - 6 - this.y) * 0.08;
          }
          this.bobOffset = Math.sin(this.frameTick * 0.12);
          break;
        }
      }
    }

    draw() {
      if (this.room !== currentRoom) return;
      const scale = 1 - this.spawnAnim * 0.5;
      const drawX = this.x, drawY = this.y + this.bobOffset + this.jumpY;

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath(); ctx.ellipse(drawX + DRAW_W / 2, this.y + DRAW_H - 2, DRAW_W / 3, 4, 0, 0, Math.PI * 2); ctx.fill();

      if (this.state === 'active') {
        const p = 0.5 + 0.5 * Math.sin(this.frameTick * 0.08);
        ctx.fillStyle = hexToRgba(this.palette.shirt, 0.06 + p * 0.06);
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
      ctx.font = '9px monospace'; ctx.textAlign = 'center';
      const tw = ctx.measureText(this.label).width + 8;
      const tx = drawX + DRAW_W / 2 - tw / 2, ty = drawY - 10;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      roundRect(ctx, tx, ty, tw, 12, 3); ctx.fill();
      ctx.strokeStyle = this.palette.shirt; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
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
        if (this.assignedSeat === null) {
          const layout = roomLayouts[this.room];
          if (layout) {
            for (let i = 0; i < layout.workstations.length; i++) {
              if (!layout.workstations[i].occupant) {
                layout.workstations[i].occupant = this.name;
                this.assignedSeat = i; break;
              }
            }
          }
        }
      } else {
        const layout = roomLayouts[this.room];
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
    for (let i = 0; i < 3; i++) roomLayouts[i] = buildRoomLayout(i, rect.width, rect.height);
  }

  function loop() {
    frameTick++;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const room = ROOMS[currentRoom];
    const layout = getCurrentLayout();

    drawFloor(w, h, room);
    drawWalls(w, h, room);

    if (layout) {
      for (const d of layout.decor) drawDecorItem(d);
      for (const ws of layout.workstations) drawWorkstation(ws);
      for (const obj of layout.clickables) {
        if (obj.id === 'bookshelf') drawBookshelf(obj);
        else if (obj.id === 'coffee') drawCoffee(obj);
        else if (obj.id === 'board') drawBoard(obj);
        else if (obj.id === 'server') drawServer(obj);
      }
    }

    const sorted = [...sprites.values()].filter(s => s.room === currentRoom).sort((a, b) => a.y - b.y);
    for (const s of sorted) { s.update(); s.draw(); }
    // Update off-screen sprites too
    for (const [, s] of sprites) { if (s.room !== currentRoom) s.update(); }

    updateHUD();
    const inRoom = [...sprites.values()].filter(s => s.room === currentRoom).length;
    statusEl.textContent = inRoom + '/' + sprites.size + ' agents';
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
        // Distribute to room with fewest agents
        const counts = [0, 0, 0];
        for (const [, s] of sprites) counts[s.room]++;
        let minRoom = 0;
        for (let i = 1; i < 3; i++) { if (counts[i] < counts[minRoom]) minRoom = i; }
        const s = new Sprite(msg.name, msg.label || msg.name, minRoom);
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
        if (t) { t.setActive(true); currentRoom = t.room; roomTabs.forEach((tab, i) => tab.classList.toggle('active', i === currentRoom)); }
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
      if (sprite.room !== currentRoom) continue;
      if (mx >= sprite.x && mx <= sprite.x + DRAW_W &&
          my >= sprite.y + sprite.bobOffset + sprite.jumpY &&
          my <= sprite.y + sprite.bobOffset + sprite.jumpY + DRAW_H) return { name, sprite };
    }
    return null;
  }
  function hitClickable(mx, my) {
    const layout = getCurrentLayout();
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

  // ── Demo agents (2 per room) ──
  setTimeout(() => {
    const demos = [
      { name: 'agent-alpha',   label: 'Alpha',   room: 0, active: true,  bubble: 'Compiling...' },
      { name: 'agent-beta',    label: 'Beta',     room: 0, active: false, bubble: 'Coffee time' },
      { name: 'agent-gamma',   label: 'Gamma',    room: 1, active: true,  bubble: 'Debugging' },
      { name: 'agent-delta',   label: 'Delta',    room: 1, active: true,  bubble: 'Deploying' },
      { name: 'agent-epsilon', label: 'Epsilon',  room: 2, active: false, bubble: 'Relaxing' },
      { name: 'agent-zeta',    label: 'Zeta',     room: 2, active: true,  bubble: 'Code review' },
    ];
    for (const d of demos) {
      const s = new Sprite(d.name, d.label, d.room);
      sprites.set(d.name, s);
      if (d.active) s.setActive(true);
      if (d.bubble) s.showBubble(d.bubble);
    }
  }, 300);
})();
