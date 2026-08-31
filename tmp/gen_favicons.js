const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create favicon.svg
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" rx="112" fill="#2563EB" />
  <path d="M 144 152 L 256 376 L 368 152" fill="none" stroke="#FFFFFF" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" />
</svg>
`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf8');

// Helper for PNG CRC
function crc32(buf) {
  let c; const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) { c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)); }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) { crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF]; }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

function generatePng(size) {
  const width = size, height = size;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const rawLines = [];
  const radius = Math.floor(size * 0.22);
  const blueR = 0x25, blueG = 0x63, blueB = 0xEB;

  for (let y = 0; y < height; y++) {
    const line = [0];
    for (let x = 0; x < width; x++) {
      let isInsideRect = true;
      let dx = 0, dy = 0;
      if (x < radius) dx = radius - x;
      else if (x >= width - radius) dx = x - (width - radius - 1);
      if (y < radius) dy = radius - y;
      else if (y >= height - radius) dy = y - (height - radius - 1);
      if (dx > 0 && dy > 0 && (dx * dx + dy * dy > radius * radius)) isInsideRect = false;

      const nx = (x + 0.5) / width;
      const ny = (y + 0.5) / height;
      let isWhiteV = false;
      const strokeWidth = 0.13;
      if (ny >= 0.26 && ny <= 0.76 && nx >= 0.20 && nx <= 0.80) {
        const leftArmDist = pointToSegmentDist(nx, ny, 0.28, 0.30, 0.50, 0.73);
        const rightArmDist = pointToSegmentDist(nx, ny, 0.72, 0.30, 0.50, 0.73);
        if (leftArmDist <= strokeWidth / 2 || rightArmDist <= strokeWidth / 2) isWhiteV = true;
      }

      if (!isInsideRect) line.push(0, 0, 0, 0);
      else if (isWhiteV) line.push(255, 255, 255, 255);
      else line.push(blueR, blueG, blueB, 255);
    }
    rawLines.push(Buffer.from(line));
  }

  const uncompressed = Buffer.concat(rawLines);
  const compressed = zlib.deflateSync(uncompressed);
  const sig = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([sig, makeChunk('IHDR', ihdr), makeChunk('IDAT', compressed), makeChunk('IEND', Buffer.alloc(0))]);
}

function generateIco(png16, png32) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(2, 4);

  const offset16 = 6 + 16 * 2;
  const offset32 = offset16 + png16.length;

  const entry16 = Buffer.alloc(16);
  entry16[0] = 16; entry16[1] = 16; entry16[2] = 0; entry16[3] = 0;
  entry16.writeUInt16LE(1, 4); entry16.writeUInt16LE(32, 6);
  entry16.writeUInt32LE(png16.length, 8); entry16.writeUInt32LE(offset16, 12);

  const entry32 = Buffer.alloc(16);
  entry32[0] = 32; entry32[1] = 32; entry32[2] = 0; entry32[3] = 0;
  entry32.writeUInt16LE(1, 4); entry32.writeUInt16LE(32, 6);
  entry32.writeUInt32LE(png32.length, 8); entry32.writeUInt32LE(offset32, 12);

  return Buffer.concat([header, entry16, entry32, png16, png32]);
}

const p16 = generatePng(16);
const p32 = generatePng(32);
const p180 = generatePng(180);
const p192 = generatePng(192);
const p512 = generatePng(512);

const ico = generateIco(p16, p32);

fs.writeFileSync(path.join(publicDir, 'favicon-16x16.png'), p16);
fs.writeFileSync(path.join(publicDir, 'favicon-32x32.png'), p32);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), p180);
fs.writeFileSync(path.join(publicDir, 'android-chrome-192x192.png'), p192);
fs.writeFileSync(path.join(publicDir, 'android-chrome-512x512.png'), p512);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico);

// site.webmanifest
const manifest = {
  name: 'VEYRA — Video Intelligence',
  short_name: 'VEYRA',
  description: 'Turn videos into searchable, editable, timestamped information with VEYRA.',
  start_url: '/',
  display: 'standalone',
  background_color: '#FFFFFF',
  theme_color: '#2563EB',
  icons: [
    { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' }
  ]
};

fs.writeFileSync(path.join(publicDir, 'site.webmanifest'), JSON.stringify(manifest, null, 2), 'utf8');

console.log('Public favicons successfully generated!');
