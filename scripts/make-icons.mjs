// Generates the PWA icons (PNG) from the Omni Model logo mark.
// Run: npm run icons
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'

const BG = [12, 18, 34]
const DOT = [125, 147, 255]
const RING = [255, 255, 255]
const RING_R = 9
const RING_HALF = 1.5
const DOT_R = 3.2
const CORNER = 8
const CIRC = 2 * Math.PI * RING_R
const DASH_ON = 42 + RING_HALF
const DASH_PERIOD = 42 + 14.5

const CRC_TABLE = new Uint32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c >>> 0
}

function crc32(buf) {
  let crc = 0xffffffff
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const head = Buffer.alloc(4)
  head.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([head, typeBuf, data, crcBuf])
}

function encodePng(width, height, sample) {
  const stride = 1 + width * 4
  const raw = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const row = y * stride
    raw[row] = 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = sample(x, y)
      const o = row + 1 + x * 4
      raw[o] = r
      raw[o + 1] = g
      raw[o + 2] = b
      raw[o + 3] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function sdRoundRect(dx, dy, size, r) {
  const qx = Math.abs(dx) - (size / 2 - r)
  const qy = Math.abs(dy) - (size / 2 - r)
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r
  )
}

function logoPixel(u, v, { scale, fullBleed }) {
  const off = (32 * (1 - scale)) / 2
  const lu = (u - off) / scale
  const lv = (v - off) / scale
  if (lu < 0 || lu > 32 || lv < 0 || lv > 32) {
    return fullBleed ? [...BG, 255] : [0, 0, 0, 0]
  }
  const dx = lu - 16
  const dy = lv - 16
  if (Math.hypot(dx, dy) <= DOT_R) return [...DOT, 255]
  const rot = Math.PI / 3
  const rx = dx * Math.cos(rot) - dy * Math.sin(rot)
  const ry = dx * Math.sin(rot) + dy * Math.cos(rot)
  const angle = Math.atan2(ry, rx)
  const s = ((angle < 0 ? angle + 2 * Math.PI : angle) / (2 * Math.PI)) * CIRC
  if (s % DASH_PERIOD < DASH_ON && Math.abs(Math.hypot(rx, ry) - RING_R) <= RING_HALF) {
    return [...RING, 255]
  }
  if (sdRoundRect(dx, dy, 32, CORNER) <= 0) return [...BG, 255]
  return fullBleed ? [...BG, 255] : [0, 0, 0, 0]
}

function render(size, { scale, fullBleed }) {
  const SAMPLES = 3
  return (px, py) => {
    let r = 0
    let g = 0
    let b = 0
    let a = 0
    for (let sy = 0; sy < SAMPLES; sy++) {
      for (let sx = 0; sx < SAMPLES; sx++) {
        const u = ((px + (sx + 0.5) / SAMPLES) / size) * 32
        const v = ((py + (sy + 0.5) / SAMPLES) / size) * 32
        const [pr, pg, pb, pa] = logoPixel(u, v, { scale, fullBleed })
        r += pr
        g += pg
        b += pb
        a += pa
      }
    }
    const n = SAMPLES * SAMPLES
    return [r / n, g / n, b / n, a / n]
  }
}

mkdirSync('public/icons', { recursive: true })

const jobs = [
  ['icon-192.png', 192, { scale: 1, fullBleed: false }],
  ['icon-512.png', 512, { scale: 1, fullBleed: false }],
  ['icon-maskable-192.png', 192, { scale: 0.8, fullBleed: true }],
  ['icon-maskable-512.png', 512, { scale: 0.8, fullBleed: true }],
  ['apple-touch-icon.png', 180, { scale: 0.8, fullBleed: true }],
]

for (const [name, size, opts] of jobs) {
  const png = encodePng(size, size, render(size, opts))
  writeFileSync(`public/icons/${name}`, png)
  console.log(`public/icons/${name} (${png.length} bytes)`)
}
