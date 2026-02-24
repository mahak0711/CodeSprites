// Generates a minimal 128x128 PNG icon for CodeSprites
// Uses raw PNG encoding (no dependencies)

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 128, H = 128;
const pixels = Buffer.alloc(W * H * 4, 0);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 4;
  pixels[i] = r; pixels[i+1] = g; pixels[i+2] = b; pixels[i+3] = a;
}

function fillRect(x, y, w, h, r, g, b) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, r, g, b);
}

// Background
fillRect(0, 0, 128, 128, 26, 26, 46);

// Rounded corners (approximate by clearing corners)
const bg = [26, 26, 46];
const clear = [0, 0, 0, 0];
for (let i = 0; i < 8; i++) {
  for (let j = 0; j < 8 - i; j++) {
    // Approximate circle mask
    if (Math.sqrt(i*i + j*j) > 8) continue;
    const corners = [[i, j], [127-i, j], [i, 127-j], [127-i, 127-j]];
    for (const [cx, cy] of corners) {
      if (Math.sqrt(Math.pow(cx < 64 ? cx : 127-cx, 2) + Math.pow(cy < 64 ? cy : 127-cy, 2)) > 120) {
        setPixel(cx, cy, 0, 0, 0, 0);
      }
    }
  }
}

// Sprite body (blue: #58a6ff = 88,166,255)
const body = [88, 166, 255];
const outline = [31, 111, 235];
const eye = [240, 246, 252];

// Head
fillRect(44, 16, 40, 8, ...outline);
fillRect(36, 24, 56, 8, ...body);
fillRect(32, 32, 64, 8, ...body);
fillRect(32, 40, 64, 8, ...body);

// Eyes
fillRect(40, 40, 12, 12, ...eye);
fillRect(64, 40, 12, 12, ...eye);

// Pupils
fillRect(44, 44, 4, 4, 30, 30, 50);
fillRect(68, 44, 4, 4, 30, 30, 50);

// Face
fillRect(32, 52, 64, 8, ...body);
fillRect(36, 60, 56, 8, ...body);

// Mouth
fillRect(52, 60, 24, 4, ...outline);

// Body
fillRect(40, 68, 48, 8, ...body);
fillRect(40, 76, 48, 8, ...body);
fillRect(40, 84, 48, 8, ...body);

// Legs
fillRect(40, 92, 16, 12, ...outline);
fillRect(72, 92, 16, 12, ...outline);
fillRect(40, 104, 16, 8, ...outline);
fillRect(72, 104, 16, 8, ...outline);

// Ground
fillRect(0, 112, 128, 16, 22, 27, 34);
fillRect(0, 112, 128, 2, 33, 38, 45);

// Grass dots
for (let x = 4; x < 128; x += 10) {
  fillRect(x, 109, 2, 3, 35, 134, 54);
}

// --- Encode PNG ---
function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData));
  return Buffer.concat([len, typeData, crc]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

// IDAT
const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0; // filter none
  pixels.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}
const compressed = zlib.deflateSync(raw);

// IEND
const iend = Buffer.alloc(0);

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([
  signature,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', iend),
]);

const outPath = path.join(__dirname, '..', 'media', 'icon.png');
fs.writeFileSync(outPath, png);
console.log('Icon written to', outPath, '(' + png.length + ' bytes)');
