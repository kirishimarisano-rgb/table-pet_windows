// =============================================================
// 產生預設造型「柑柑」的像素精靈圖
// 用法：node scripts/gen-default-skin.mjs
// 產出：skins/default/sprite.png、app-icon.png（給 tauri icon 用）
//
// 這支程式不依賴任何套件，用 Node 內建的 zlib 自己寫 PNG。
// 想改角色外觀，改下面的「調色盤」和 drawKankan() 就好。
// =============================================================
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const SIZE = 32; // 每一格 32×32 像素

// ---------- 調色盤（暖色系） ----------
const C = {
  outline: [122, 74, 42],   // 深焦糖色描邊
  body: [255, 179, 92],     // 蜜柑橘
  shade: [240, 138, 60],    // 陰影橘
  light: [255, 219, 160],   // 亮面
  belly: [255, 241, 220],   // 奶油色肚子
  earIn: [255, 170, 170],   // 耳朵內側
  blush: [255, 143, 163],   // 腮紅
  eye: [74, 42, 26],        // 眼睛
  white: [255, 255, 255],
  leaf: [124, 196, 106],    // 葉子
  leafDark: [78, 154, 72],
  spark: [255, 224, 102],   // 開心的星星
  heart: [255, 110, 140],   // 愛心
  cookie: [214, 150, 80],   // 點心
  cookieDot: [120, 70, 40],
  zz: [150, 130, 200],      // 睡覺的 z
};

// ---------- 小工具：一格畫布 ----------
function newFrame() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}
function put(f, x, y, color) {
  if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) f[y][x] = color;
}

/**
 * 畫一格柑柑。
 * @param {object} p 參數
 *  bob   上下位移（負數往上跳）
 *  sx/sy 身體橫向／縱向伸縮
 *  eyes  open | blink | happy | sleep | dizzy
 *  mouth w | o | none
 *  feet  [左腳位移, 右腳位移]
 *  tail  尾巴擺動 0/1
 *  zz    睡覺 z 的位置（-1 = 不畫）
 *  spark 是否畫星星
 */
function drawKankan(p) {
  const o = { bob: 0, sx: 1, sy: 1, eyes: "open", mouth: "w", feet: [0, 0], tail: 0, zz: -1, spark: false, heart: -1, cookie: 0, ...p };
  const f = newFrame();
  const cx = 16, cy = 20 + o.bob;
  const rx = 11 * o.sx, ry = 8.5 * o.sy;
  const inBody = (x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  const top = Math.round(cy - ry);
  const bottom = Math.round(cy + ry);

  // 1. 身體（圓滾滾的蜜柑）
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++)
      if (inBody(x, y)) put(f, x, y, C.body);

  // 2. 耳朵（左右對稱的小三角）
  const earRows = [[9, 9], [8, 10], [8, 11], [7, 12]];
  earRows.forEach(([a, b], i) => {
    const y = top - 3 + i;
    for (let x = a; x <= b; x++) {
      put(f, x, y, C.body);
      put(f, 31 - x, y, C.body);
    }
  });
  // 耳朵內側粉紅
  [[9, top - 1], [9, top], [10, top]].forEach(([x, y]) => {
    put(f, x, y, C.earIn);
    put(f, 31 - x, y, C.earIn);
  });

  // 3. 尾巴（右邊捲起來）
  const t = o.tail;
  [[27, cy + 1 - t], [28, cy - t], [28, cy - 1 - t], [29, cy - 2 - t], [29, cy - 3 - t]].forEach(([x, y]) =>
    put(f, x, y, C.body));

  // 4. 腳（兩個小圓腳）
  const footY = bottom - 1;
  [[10, o.feet[0]], [19, o.feet[1]]].forEach(([fx, dy]) => {
    for (let x = fx; x < fx + 3; x++) {
      put(f, x, footY + dy, C.belly);
      put(f, x, footY + 1 + dy, C.belly);
    }
  });

  // 5. 肚子、陰影、亮面、額頭花紋
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      if (!inBody(x, y)) continue;
      const bx = (x + 0.5 - cx) / 7, by = (y + 0.5 - (cy + 3.5)) / 4.2;
      if (bx * bx + by * by <= 1) put(f, x, y, C.belly);
      else if (!inBody(x, y + 1) || !inBody(x + 1, y + 1)) put(f, x, y, C.shade);
    }
  [[9, top + 2], [10, top + 2], [9, top + 3]].forEach(([x, y]) => put(f, x, y, C.light));
  [[14, top + 1], [16, top + 1], [16, top + 2], [18, top + 1]].forEach(([x, y]) => put(f, x, y, C.shade));

  // 6. 頭上的小葉子
  put(f, 16, top - 1, C.leafDark);
  put(f, 17, top - 2, C.leaf);
  put(f, 18, top - 2, C.leaf);
  put(f, 18, top - 3, C.leaf);
  put(f, 19, top - 3, C.leafDark);

  // 7. 描邊：透明格子只要旁邊有顏色就塗成描邊色
  const filled = f.map((row) => row.map((c) => c !== null));
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      if (filled[y][x]) continue;
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => filled[y + dy]?.[x + dx]);
      if (near) put(f, x, y, C.outline);
    }

  // 8. 臉：眼睛、腮紅、嘴巴
  const ey = cy - 1;
  for (const ex of [11, 19]) {
    switch (o.eyes) {
      case "open":
        put(f, ex, ey, C.eye); put(f, ex + 1, ey, C.eye);
        put(f, ex, ey + 1, C.eye); put(f, ex + 1, ey + 1, C.eye);
        put(f, ex, ey, C.white); // 眼睛反光
        break;
      case "blink":
        put(f, ex, ey + 1, C.eye); put(f, ex + 1, ey + 1, C.eye);
        break;
      case "happy": // ^ ^
        put(f, ex - 1, ey + 1, C.eye); put(f, ex, ey, C.eye);
        put(f, ex + 1, ey, C.eye); put(f, ex + 2, ey + 1, C.eye);
        break;
      case "sleep": // ︶︶
        put(f, ex - 1, ey, C.eye); put(f, ex, ey + 1, C.eye);
        put(f, ex + 1, ey + 1, C.eye); put(f, ex + 2, ey, C.eye);
        break;
      case "dizzy": // > <
        if (ex === 11) { put(f, ex, ey - 1, C.eye); put(f, ex + 1, ey, C.eye); put(f, ex, ey + 1, C.eye); }
        else { put(f, ex + 1, ey - 1, C.eye); put(f, ex, ey, C.eye); put(f, ex + 1, ey + 1, C.eye); }
        break;
    }
  }
  [[8, ey + 2], [9, ey + 2], [22, ey + 2], [23, ey + 2]].forEach(([x, y]) => put(f, x, y, C.blush));
  const my = ey + 2;
  if (o.mouth === "w") {
    [[14, my], [15, my + 1], [16, my], [17, my + 1], [18, my]].forEach(([x, y]) => put(f, x, y, C.eye));
  } else if (o.mouth === "o") {
    [[15, my], [16, my], [15, my + 1], [16, my + 1]].forEach(([x, y]) => put(f, x, y, C.eye));
  }

  // 9. 裝飾：z 和星星
  if (o.zz >= 0) {
    const zx = 24, zy = 1 + o.zz;
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [3, 1], [2, 2], [1, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]].forEach(([dx, dy]) => put(f, zx + dx, zy + dy, C.zz));
  }
  if (o.spark) {
    for (const [sx, sy] of [[3, 6], [27, 9]]) {
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => put(f, sx + dx, sy + dy, C.spark));
    }
  }
  // 被摸頭：頭上冒愛心（heart = 高度位移）
  if (o.heart >= 0) {
    dots(f, [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]], C.heart, 23, 1 + o.heart);
  }
  // 吃點心：嘴邊的餅乾（cookie = 1 完整、2 咬掉一口）
  if (o.cookie > 0) {
    const ck = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [1, 3], [2, 3]];
    dots(f, o.cookie === 2 ? ck.filter(([x, y]) => x < 2 || y > 1) : ck, C.cookie, 17, cy + 1);
    put(f, 18, cy + 2, C.cookieDot);
  }
  return f;
}

function dots(f, list, color, ox = 0, oy = 0) {
  for (const [x, y] of list) put(f, x + ox, y + oy, color);
}

// ---------- 動畫表：每一列是一個動畫 ----------
const ANIMS = {
  idle: [
    { tail: 0 }, { tail: 1 }, { eyes: "blink", tail: 0 }, { tail: 1, bob: 1 },
  ],
  walk: [
    { feet: [0, -1], tail: 0 }, { bob: -1, tail: 1 }, { feet: [-1, 0], tail: 0 }, { bob: -1, tail: 1 },
  ],
  sleep: [
    { bob: 1, sy: 0.92, eyes: "sleep", mouth: "none", zz: 2 },
    { bob: 1, sy: 0.9, eyes: "sleep", mouth: "none", zz: 0 },
  ],
  drag: [
    { sy: 1.12, sx: 0.9, eyes: "dizzy", mouth: "o", feet: [1, 1], tail: -1 },
    { sy: 1.15, sx: 0.88, eyes: "dizzy", mouth: "o", feet: [2, 1], tail: -1 },
  ],
  react: [
    { bob: -2, eyes: "happy", spark: true }, { bob: -3, eyes: "happy", tail: 1 },
    { bob: -1, eyes: "happy", spark: true }, { bob: 0, eyes: "happy", tail: 1 },
  ],
  pet: [
    { bob: 1, sy: 0.94, eyes: "happy", heart: 1, tail: 1 }, { bob: 0, eyes: "happy", heart: 0, tail: 0 },
  ],
  eat: [
    { eyes: "happy", mouth: "o", cookie: 1 }, { eyes: "happy", mouth: "w", cookie: 2, bob: 1 },
  ],
  sit: [
    { bob: 1, feet: [1, 0], tail: 0 }, { bob: 1, feet: [0, 1], tail: 1 },
  ],
};

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
function encodePng(w, h, getPixel) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const c = getPixel(x, y);
      const i = y * (w * 4 + 1) + 1 + x * 4;
      if (c) { raw[i] = c[0]; raw[i + 1] = c[1]; raw[i + 2] = c[2]; raw[i + 3] = 255; }
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

// ---------- 輸出精靈圖 ----------
const names = Object.keys(ANIMS);
const cols = Math.max(...names.map((n) => ANIMS[n].length));
const frames = names.map((n) => ANIMS[n].map(drawKankan));
const sheet = encodePng(cols * SIZE, names.length * SIZE, (x, y) => {
  const row = Math.floor(y / SIZE), col = Math.floor(x / SIZE);
  return frames[row][col]?.[y % SIZE][x % SIZE] ?? null;
});
mkdirSync("skins/default", { recursive: true });
writeFileSync("skins/default/sprite.png", sheet);

// 應用程式圖示：把第一格放大 16 倍 → 512×512
const icon = encodePng(512, 512, (x, y) => frames[0][0][Math.floor(y / 16)][Math.floor(x / 16)]);
writeFileSync("app-icon.png", icon);

console.log(`完成：skins/default/sprite.png（${cols * SIZE}×${names.length * SIZE}）、app-icon.png`);
console.log("動畫列順序：", names.join(", "));
