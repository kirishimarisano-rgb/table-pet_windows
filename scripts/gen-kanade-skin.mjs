// =============================================================
// 產生造型「小奏」的像素精靈圖
// 用法：node scripts/gen-kanade-skin.mjs
// 產出：skins/kanade/sprite.png，並更新 manifest.json 的 animations
// =============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { newFrame, put, ellipse, dots, outline, writeSheet, writeIcon } from "./pixel.mjs";

const S = 32;

// ---------- 調色盤（夜空靛藍 + 羊皮紙 + 星光金） ----------
const C = {
  outline: [27, 25, 53],
  body: [62, 67, 128],
  light: [91, 99, 176],
  dark: [43, 47, 94],
  cream: [244, 231, 201],
  creamDark: [214, 196, 160],
  gold: [242, 193, 78],
  goldDim: [168, 140, 80],
  eye: [20, 17, 42],
  white: [255, 255, 255],
  blush: [217, 163, 214],
  glow: [255, 214, 107, 90],
  shadow: [0, 0, 0, 45],
  zz: [150, 160, 230],
  heart: [255, 130, 170],
  candy: [255, 200, 120],
};

/**
 * 畫一格小奏
 *  bob    上下漂浮位移
 *  sway   尾巴擺動（-1 / 0 / 1）
 *  eyes   open | blink | happy | sleep | wide | think
 *  lamp   星燈亮度 0 暗 / 1 一般 / 2 很亮
 *  lampDy 星燈自己的上下位移
 *  mouth  none | smile | o
 *  zz     睡覺 z 位置（-1 = 不畫）
 *  dotsN  思考中的點點數量（0～3）
 *  stretch 被拎起來時身體拉長
 */
function drawKanade(p) {
  const o = { bob: 0, sway: 0, eyes: "open", lamp: 1, lampDy: 0, mouth: "none", zz: -1, dotsN: 0, stretch: 0, heart: -1, candy: 0, ...p };
  const f = newFrame(S);
  const cx = 15, cy = 16 + o.bob;
  const rx = 9 - o.stretch * 0.5, ry = 8.5 + o.stretch;
  const top = Math.round(cy - ry);

  // 地上的影子（離地越高越小）
  ellipse(f, 16, 30.8, 6 - Math.max(0, -o.bob) * 0.5, 1.2, C.shadow);

  // 1. 尾巴：像一縷墨煙往下捲
  const tail = [[13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [14, 9], [15, 9], [16, 9], [17, 9],
    [15, 10], [16, 10], [17, 10], [16, 11], [17, 11], [18, 11], [17, 12], [18, 12], [19, 12], [20, 12], [21, 11]];
  for (const [x, y] of tail) {
    const dx = y >= 10 ? o.sway * (y - 9) * 0.5 : 0;
    put(f, x + dx, cy + y + o.stretch, y >= 11 ? C.dark : C.body);
  }

  // 2. 身體（圓圓的一團夜空）
  ellipse(f, cx, cy, rx, ry, C.body);
  // 下半部陰影
  ellipse(f, cx, cy, rx, ry, C.dark, (x, y) => y > cy + ry - 2.5 || (x > cx + rx - 2 && y > cy));

  // 3. 羊皮紙圍巾 + 金色扣子
  const sy = Math.round(cy + 3 + o.stretch * 0.5);
  for (let x = 0; x < S; x++) {
    if (f[sy][x] && f[sy][x] !== C.shadow) put(f, x, sy, C.cream);
    if (f[sy + 1]?.[x] && f[sy + 1][x] !== C.shadow) put(f, x, sy + 1, C.creamDark);
  }
  put(f, 15, sy, C.gold); put(f, 15, sy + 1, C.gold);
  // 圍巾尾巴垂下來
  dots(f, [[8, sy + 2], [9, sy + 2], [8, sy + 3]], C.cream);

  // 4. 頭上的羽毛筆（呆毛）
  const quill = [[14, -1], [15, -2], [15, -3], [16, -4], [17, -5]];
  for (const [x, y] of quill) { put(f, x, top + y, C.cream); put(f, x + 1, top + y, C.creamDark); }
  dots(f, [[18, -6], [19, -6], [18, -5]], C.gold, 0, top);

  // 5. 亮面
  dots(f, [[10, 2], [11, 2], [12, 2], [10, 3]], C.light, 0, top);

  // 6. 描邊（影子和星光不描邊）
  outline(f, C.outline, [C.shadow]);

  // 7. 臉
  const ey = cy - 2;
  for (const ex of [10, 18]) {
    switch (o.eyes) {
      case "open":
        dots(f, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], C.eye, ex, ey);
        put(f, ex + 1, ey, C.gold); // 眼睛裡的星光
        break;
      case "think": // 眼睛往右上看
        dots(f, [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], C.eye, ex, ey);
        put(f, ex, ey + 2, C.light); put(f, ex + 1, ey, C.gold);
        put(f, ex, ey + 1, C.light);
        break;
      case "blink":
        dots(f, [[0, 2], [1, 2]], C.eye, ex, ey);
        break;
      case "happy":
        dots(f, [[-1, 2], [0, 1], [1, 1], [2, 2]], C.eye, ex, ey);
        break;
      case "sleep":
        dots(f, [[-1, 1], [0, 2], [1, 2], [2, 1]], C.eye, ex, ey);
        break;
      case "wide":
        dots(f, [[0, -1], [1, -1], [-1, 0], [2, 0], [-1, 1], [2, 1], [0, 2], [1, 2]], C.eye, ex, ey);
        dots(f, [[0, 0], [1, 0], [0, 1], [1, 1]], C.white, ex, ey);
        put(f, ex + (ex < 15 ? 1 : 0), ey + 1, C.eye);
        break;
    }
  }
  dots(f, [[8, 3], [9, 3], [21, 3], [22, 3]], C.blush, 0, ey);
  if (o.mouth === "smile") dots(f, [[14, 4], [15, 5], [16, 4]], C.eye, 0, ey);
  if (o.mouth === "o") dots(f, [[14, 4], [15, 4], [14, 5], [15, 5]], C.eye, 0, ey);

  // 8. 星燈（小奏的靈感，會在旁邊漂浮）
  const lx = 28, ly = cy + 1 + o.lampDy;
  const lampColor = o.lamp === 0 ? C.goldDim : C.gold;
  if (o.lamp >= 1) dots(f, [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -2], [0, 2], [-2, 0], [2, 0]], C.glow, lx, ly);
  if (o.lamp >= 2) dots(f, [[-2, -2], [2, -2], [-2, 2], [2, 2], [0, -3], [0, 3], [-3, 0], [3, 0]], C.glow, lx, ly);
  dots(f, [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]], lampColor, lx, ly);
  put(f, lx, ly, C.white);

  // 9. 裝飾
  if (o.zz >= 0) dots(f, [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [3, 1], [2, 2], [1, 3], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]], C.zz, 1, 1 + o.zz);
  for (let i = 0; i < o.dotsN; i++) dots(f, [[0, 0], [1, 0], [0, 1], [1, 1]], C.gold, 2 + i * 3, top);
  if (o.heart >= 0) dots(f, [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]], C.heart, 2, 3 + o.heart);
  // 吃點心：嘴邊一顆星星糖（candy = 1 完整、2 咬了一口）
  if (o.candy > 0) {
    const star = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
    dots(f, o.candy === 2 ? star.slice(1) : star, C.candy, 16, ey + 4);
  }
  return f;
}

// ---------- 動畫表 ----------
const anims = {
  idle: [
    { bob: 0, lampDy: 0 }, { bob: -1, lampDy: -1, sway: 1 }, { bob: -1, eyes: "blink", lampDy: -1 }, { bob: 0, lampDy: 0, sway: -1 },
  ],
  walk: [
    { bob: -1, sway: -1, lampDy: 0 }, { bob: -2, sway: -1, lampDy: -1 }, { bob: -1, sway: 0, lampDy: -1 }, { bob: 0, sway: 1, lampDy: 0 },
  ],
  sleep: [
    { bob: 2, eyes: "sleep", lamp: 0, zz: 2, sway: 0 }, { bob: 2, eyes: "sleep", lamp: 0, zz: 0, sway: 1 },
  ],
  drag: [
    { eyes: "wide", mouth: "o", stretch: 1, sway: -1, lamp: 2 }, { eyes: "wide", mouth: "o", stretch: 2, sway: 1, lamp: 2, lampDy: -1 },
  ],
  react: [
    { bob: -2, eyes: "happy", mouth: "smile", lamp: 2 }, { bob: -3, eyes: "happy", mouth: "smile", lamp: 2, lampDy: -1 },
    { bob: -2, eyes: "happy", mouth: "smile", lamp: 1 }, { bob: -1, eyes: "happy", mouth: "smile", lamp: 2 },
  ],
  pet: [
    { eyes: "happy", mouth: "smile", lamp: 2, heart: 1, bob: 1 }, { eyes: "happy", mouth: "smile", lamp: 2, heart: 0, sway: 1 },
  ],
  eat: [
    { eyes: "happy", mouth: "o", candy: 1 }, { eyes: "happy", mouth: "smile", candy: 2, bob: -1 },
  ],
  sit: [
    { bob: 2, sway: 0, lampDy: 0 }, { bob: 2, sway: 1, lampDy: -1, eyes: "blink" },
  ],
  think: [
    { eyes: "think", lamp: 1, dotsN: 1 }, { eyes: "think", lamp: 2, dotsN: 2, bob: -1 },
    { eyes: "think", lamp: 1, dotsN: 3, bob: -1 }, { eyes: "blink", lamp: 2, dotsN: 3 },
  ],
};

const frames = Object.fromEntries(Object.entries(anims).map(([k, list]) => [k, list.map(drawKanade)]));
const animations = writeSheet("skins/kanade/sprite.png", frames, { w: S, h: S },
  { idle: 3, walk: 6, sleep: 1.5, drag: 6, react: 8, pet: 4, eat: 5, sit: 1.5, think: 4 });

// 只更新 manifest 的 animations，其他欄位（名字、台詞、個性）保留
const mPath = "skins/kanade/manifest.json";
let manifest = {};
try { manifest = JSON.parse(readFileSync(mPath, "utf8")); } catch {}
manifest = { name: "小奏", author: "desk-pet", image: "sprite.png", frameWidth: S, frameHeight: S, scale: 4, ...manifest, animations };
writeFileSync(mPath, JSON.stringify(manifest, null, 2) + "\n");
writeIcon("skins/kanade/preview.png", frames.idle[0], 8);
console.log("完成：skins/kanade/sprite.png");
