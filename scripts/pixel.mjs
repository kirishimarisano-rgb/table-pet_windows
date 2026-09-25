// =============================================================
// 像素畫共用工具：畫布、PNG 編碼、精靈圖輸出
// 各角色的產生程式（gen-*.mjs）都用這支。
// 顏色格式：[r, g, b] 或 [r, g, b, a]
// =============================================================
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

/** 建立一格空白畫布 */
export function newFrame(w, h = w) {
  const f = Array.from({ length: h }, () => Array(w).fill(null));
  f.w = w;
  f.h = h;
  return f;
}

export function put(f, x, y, color) {
  x = Math.round(x); y = Math.round(y);
  if (x >= 0 && y >= 0 && x < f.w && y < f.h) f[y][x] = color;
}

export function get(f, x, y) {
  return f[y]?.[x] ?? null;
}

/** 畫實心橢圓（inside 回傳 true 的格子才塗） */
export function ellipse(f, cx, cy, rx, ry, color, only = () => true) {
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++)
      if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 && only(x, y)) put(f, x, y, color);
}

/** 一次畫很多點 */
export function dots(f, list, color, ox = 0, oy = 0) {
  for (const [x, y] of list) put(f, x + ox, y + oy, color);
}

/** 描邊：透明格子只要上下左右有顏色，就塗成描邊色（skip 可排除某些顏色，例如陰影） */
export function outline(f, color, skip = []) {
  const filled = f.map((row) => row.map((c) => c !== null && !skip.includes(c)));
  for (let y = 0; y < f.h; y++)
    for (let x = 0; x < f.w; x++) {
      if (f[y][x] !== null) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => filled[y + dy]?.[x + dx])) put(f, x, y, color);
    }
}

// ---------- PNG 編碼 ----------
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
export function encodePng(w, h, getPixel) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = getPixel(x, y);
      const i = y * (w * 4 + 1) + 1 + x * 4;
      if (c) { raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2]; raw[i + 3] = c[3] ?? 255; }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * 把動畫表輸出成精靈圖（每個動畫一列）
 * @param anims { 動畫名: [畫好的格子, ...] }
 * @returns manifest 用的 animations 欄位（fps 另外指定）
 */
export function writeSheet(path, anims, size, fps) {
  const names = Object.keys(anims);
  const cols = Math.max(...names.map((n) => anims[n].length));
  const png = encodePng(cols * size.w, names.length * size.h, (x, y) => {
    const row = Math.floor(y / size.h), col = Math.floor(x / size.w);
    return anims[names[row]][col]?.[y % size.h][x % size.w] ?? null;
  });
  mkdirSync(path.replace(/[\\/][^\\/]+$/, ""), { recursive: true });
  writeFileSync(path, png);
  return Object.fromEntries(names.map((n, row) => [n, { row, frames: anims[n].length, fps: fps[n] ?? 4 }]));
}

/** 放大某一格輸出成圖示 */
export function writeIcon(path, frame, px) {
  writeFileSync(path, encodePng(frame.w * px, frame.h * px, (x, y) => frame[Math.floor(y / px)][Math.floor(x / px)]));
}

/** 填滿多邊形（pts = [[x, y], ...]），用來畫一束一束的頭髮 */
export function poly(f, pts, color) {
  const inside = (px, py) => {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (inside(x + 0.5, y + 0.5)) put(f, x, y, color);
}

/** 畫一條線（Bresenham） */
export function line(f, x0, y0, x1, y1, color) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    put(f, x0, y0, color);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
