const fs = require('fs');
const zlib = require('zlib');

// Same cropping parameters
const startX = 76;
const startY = 133;
const cropW = 813;
const cropH = 357;

const buf = fs.readFileSync('./public/images/logo.png');
let pos = 8;
const idatChunks = [];
let ihdr;
while (pos < buf.length) {
  const len = buf.readUInt32BE(pos);
  const type = buf.toString('ascii', pos + 4, pos + 8);
  if (type === 'IHDR') {
    ihdr = { width: buf.readUInt32BE(pos + 8), height: buf.readUInt32BE(pos + 12) };
  } else if (type === 'IDAT') {
    idatChunks.push(buf.subarray(pos + 8, pos + 8 + len));
  }
  pos += 12 + len;
}

const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
const origW = ihdr.width;
const origH = ihdr.height;
const bpp = 4;
const origStride = 1 + origW * bpp;

const pixels = Buffer.alloc(origW * origH * 4);
for (let y = 0; y < origH; y++) {
  const lineStart = y * origStride;
  for (let x = 0; x < origW; x++) {
    const srcIdx = lineStart + 1 + x * bpp;
    const destIdx = (y * origW + x) * 4;
    pixels[destIdx] = decompressed[srcIdx];
    pixels[destIdx + 1] = decompressed[srcIdx + 1];
    pixels[destIdx + 2] = decompressed[srcIdx + 2];
    pixels[destIdx + 3] = decompressed[srcIdx + 3];
  }
}

const cropStride = 1 + cropW * 4;
const darkRaw = Buffer.alloc(cropStride * cropH);

for (let cy = 0; cy < cropH; cy++) {
  const origY = startY + cy;
  const lineStart = cy * cropStride;
  darkRaw[lineStart] = 0; // Filter None

  for (let cx = 0; cx < cropW; cx++) {
    const origX = startX + cx;
    const origIdx = (origY * origW + origX) * 4;
    const destIdx = lineStart + 1 + cx * 4;

    const r = pixels[origIdx];
    const g = pixels[origIdx + 1];
    const b = pixels[origIdx + 2];
    const maxVal = Math.max(r, g, b);

    if (maxVal <= 15) {
      darkRaw[destIdx] = 0;
      darkRaw[destIdx + 1] = 0;
      darkRaw[destIdx + 2] = 0;
      darkRaw[destIdx + 3] = 0;
    } else {
      // Check if pixel is part of the warm ribbon vs the white letters
      // White letters: r ~ g ~ b ~ 230-255
      // Ribbon: r=169, g=149, b=133 -> r is noticeably higher than b (r - b > 20)
      const isRibbon = (r - b > 18) && (g - b > 8);
      const alpha = maxVal < 45 ? Math.min(255, Math.round(((maxVal - 15) / 30) * 255)) : 255;

      if (isRibbon) {
        darkRaw[destIdx] = r;
        darkRaw[destIdx + 1] = g;
        darkRaw[destIdx + 2] = b;
      } else {
        // Dark letters
        darkRaw[destIdx] = 20;
        darkRaw[destIdx + 1] = 18;
        darkRaw[destIdx + 2] = 16;
      }
      darkRaw[destIdx + 3] = alpha;
    }
  }
}

// CRC32 table
const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  table[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}
function makePng(w, h, rawData) {
  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = Buffer.alloc(13);
  ihdrChunk.writeUInt32BE(w, 0); ihdrChunk.writeUInt32BE(h, 4);
  ihdrChunk[8] = 8; ihdrChunk[9] = 6; ihdrChunk[10] = 0; ihdrChunk[11] = 0; ihdrChunk[12] = 0;
  const ihdrLen = Buffer.alloc(4); ihdrLen.writeUInt32BE(13, 0);
  const ihdrType = Buffer.from('IHDR');
  const ihdrCrc = Buffer.alloc(4); ihdrCrc.writeUInt32BE(crc32(Buffer.concat([ihdrType, ihdrChunk])), 0);

  const idatLen = Buffer.alloc(4); idatLen.writeUInt32BE(compressed.length, 0);
  const idatType = Buffer.from('IDAT');
  const idatCrc = Buffer.alloc(4); idatCrc.writeUInt32BE(crc32(Buffer.concat([idatType, compressed])), 0);

  const iendLen = Buffer.alloc(4); iendLen.writeUInt32BE(0, 0);
  const iendType = Buffer.from('IEND');
  const iendCrc = Buffer.alloc(4); iendCrc.writeUInt32BE(crc32(iendType), 0);

  return Buffer.concat([signature, ihdrLen, ihdrType, ihdrChunk, ihdrCrc, idatLen, idatType, compressed, idatCrc, iendLen, iendType, iendCrc]);
}

const darkPng = makePng(cropW, cropH, darkRaw);
fs.writeFileSync('./public/images/logo-dark.png', darkPng);
console.log('Saved cropped dark-letter logo to public/images/logo-dark.png!');
