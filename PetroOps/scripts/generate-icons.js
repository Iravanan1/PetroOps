/**
 * generate-icons.js
 * ─────────────────
 * Programmatically resizes and compiles the master icon.png into:
 *  - build-resources/icon.ico (multi-res Windows icon)
 *  - build-resources/icon.icns (multi-res macOS icon)
 * Uses the local 'sharp' library.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WORKSPACE_DIR = path.resolve(__dirname, '..');
const SRC_PNG = path.join(WORKSPACE_DIR, 'build-resources', 'icon.png');
const OUT_ICO = path.join(WORKSPACE_DIR, 'build-resources', 'icon.ico');
const OUT_ICNS = path.join(WORKSPACE_DIR, 'build-resources', 'icon.icns');

const ICO_SIZES = [16, 32, 48, 64, 128, 256];
const ICNS_CONFIGS = [
  { type: 'icp4', size: 16 },
  { type: 'icp5', size: 32 },
  { type: 'icp6', size: 64 },
  { type: 'ic07', size: 128 },
  { type: 'ic08', size: 256 },
  { type: 'ic09', size: 512 }
];

async function generateIco(sourceBuffer) {
  console.log('[IconGen] Generating Windows .ico...');
  const directoryEntries = [];
  const pngBuffers = [];
  let currentOffset = 6 + ICO_SIZES.length * 16;

  for (const size of ICO_SIZES) {
    const resized = await sharp(sourceBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    pngBuffers.push(resized);

    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    entry.writeUInt8(size >= 256 ? 0 : size, 1); // height (0 means 256)
    entry.writeUInt8(0, 2);                     // color palette count
    entry.writeUInt8(0, 3);                     // reserved
    entry.writeUInt16LE(1, 4);                  // color planes
    entry.writeUInt16LE(32, 6);                 // bits per pixel
    entry.writeUInt32LE(resized.length, 8);      // size of image data
    entry.writeUInt32LE(currentOffset, 12);     // offset
    directoryEntries.push(entry);

    currentOffset += resized.length;
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type (1 for ico)
  header.writeUInt16LE(ICO_SIZES.length, 4); // image count

  const fileBuffer = Buffer.concat([header, ...directoryEntries, ...pngBuffers]);
  fs.writeFileSync(OUT_ICO, fileBuffer);
  console.log(`[IconGen] Successfully created Windows icon at: ${OUT_ICO} (${fileBuffer.length} bytes)`);
}

async function generateIcns(sourceBuffer) {
  console.log('[IconGen] Generating macOS .icns...');
  const blocks = [];
  let totalSize = 8; // starts with 'icns' + size (8 bytes)

  for (const conf of ICNS_CONFIGS) {
    const resized = await sharp(sourceBuffer)
      .resize(conf.size, conf.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    const blockSize = 8 + resized.length;
    const blockHeader = Buffer.alloc(8);
    blockHeader.write(conf.type, 0, 4, 'ascii');
    blockHeader.writeUInt32BE(blockSize, 4);

    blocks.push(Buffer.concat([blockHeader, resized]));
    totalSize += blockSize;
  }

  const fileHeader = Buffer.alloc(8);
  fileHeader.write('icns', 0, 4, 'ascii');
  fileHeader.writeUInt32BE(totalSize, 4);

  const fileBuffer = Buffer.concat([fileHeader, ...blocks]);
  fs.writeFileSync(OUT_ICNS, fileBuffer);
  console.log(`[IconGen] Successfully created macOS icon at: ${OUT_ICNS} (${fileBuffer.length} bytes)`);
}

async function main() {
  try {
    if (!fs.existsSync(SRC_PNG)) {
      console.error(`[IconGen] Error: Source PNG not found at ${SRC_PNG}`);
      process.exit(1);
    }

    const sourceBuffer = fs.readFileSync(SRC_PNG);
    await generateIco(sourceBuffer);
    await generateIcns(sourceBuffer);
    console.log('[IconGen] Complete! Desktop shell resources generated successfully.');
  } catch (err) {
    console.error('[IconGen] Critical error generating icons:', err);
    process.exit(1);
  }
}

main();
