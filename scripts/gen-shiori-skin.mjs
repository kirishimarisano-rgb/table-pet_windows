// =============================================================
// 產生造型「栞（しおり）」的高清像素精靈圖（64×64）
// 用法：node scripts/gen-shiori-skin.mjs
// 產出：skins/shiori/sprite.png，並更新 manifest.json 的 animations
// =============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { newFrame, put, ellipse, dots, outline, poly, line, writeSheet, writeIcon } from "./pixel.mjs";

const S = 64;

// ---------- 調色盤（奶茶米色頭髮 + 咖啡色斗篷 + 橘色花） ----------
const C = {
  line: [92, 58, 44],
  hair: [236, 222, 204],
  hairMid: [222, 204, 182],
  hairShade: [200, 178, 154],
  hairLight: [250, 243, 233],
  skin: [254, 241, 232],
  skinShade: [247, 222, 210],
  blush: [240, 162, 150],
  lash: [66, 40, 28],
  iris1: [104, 58, 34],
  iris2: [148, 88, 52],
  iris3: [196, 132, 84],
  iris4: [226, 176, 128],
  pupil: [70, 38, 24],
  white: [255, 255, 255],
  petal: [236, 118, 76],
  petalLight: [252, 170, 128],
  petalDark: [206, 88, 56],
  shirt: [252, 249, 244],
  shirtShade: [230, 224, 216],
  cape: [96, 62, 46],
  capeLight: [128, 88, 64],
  gold: [212, 168, 104],
  skirt: [164, 118, 88],
  boot: [84, 52, 38],
  shadow: [0, 0, 0, 40],
  zz: [150, 160, 230],
  spark: [255, 196, 120],
  sweat: [140, 190, 240],
  heart: [255, 120, 150],
  cookie: [214, 156, 92],
  cookieDot: [120, 72, 44],
};

const inE = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
function fill(f, cond, color) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (cond(x, y)) put(f, x, y, color);
}

/** 細花瓣的放射狀花（髮夾、胸針） */
function flower(f, cx, cy, r, petals = 10) {
  for (let a = 0; a < petals; a++) {
    const ang = (a / petals) * Math.PI * 2 + 0.2;
    for (let d = 1; d <= r; d += 0.5) {
      put(f, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, d > r - 1.2 ? C.petalDark : d < 2 ? C.petalLight : C.petal);
    }
  }
  put(f, cx, cy, C.petalLight);
}

/**
 * 畫一格栞
 *  bob   上下位移      sway  頭髮擺動
 *  eyes  open | half | look（往左上看）| blink | happy | sleep | wide
 *  mouth none | small | smile | o
 *  legs  [左, 右] 腳的位移   dangle 被拎起來腳垂下
 *  arms  手的高度      zz / spark / dotsN 裝飾
 */
function draw(p) {
  const o = { bob: 0, sway: 0, eyes: "open", mouth: "none", legs: [0, 0], dangle: false, arms: 0, zz: -1, spark: false, dotsN: 0, heart: -1, cookie: 0, ...p };
  const f = newFrame(S);
  const b = o.bob;
  const hy = 27 + b; // 頭的中心

  ellipse(f, 32, 62.3, 12, 1.5, C.shadow);

  // ================= 1. 後面的長髮（大波浪） =================
  fill(f, (x, y) => inE(x, y, 32, hy, 23, 20), C.hair);
  // 兩側垂下來的長捲髮：越往下越細，最後收成尖尖的髮尾
  for (let y = hy + 6; y <= hy + 31; y++) {
    const k = y - hy - 6;
    const w = Math.round(Math.sin((y + o.sway * 2) / 3.5) * 1.3);
    const outer = 9.5 + Math.max(0, k - 16) * 0.45;
    const inner = 18 - Math.max(0, k - 16) * 0.55;
    const col = k < 10 ? C.hair : k < 18 ? C.hairMid : C.hairShade;
    for (let x = outer; x <= inner; x++) { put(f, x + w, y, col); put(f, 63 - x - w, y, col); }
  }

  // ================= 2. 身體（獨立圖層） =================
  const hairLayer = f;
  const body = newFrame(S);
  {
  const f = body;
  const by = hy + 18; // 肩膀
  // 腳
  const legY = by + 13;
  [[27, o.legs[0]], [34, o.legs[1]]].forEach(([x0, dy]) => {
    const d = o.dangle ? 2 : 0;
    for (let x = x0; x < x0 + 3; x++) {
      put(f, x, legY + dy, C.skin); put(f, x, legY + 1 + dy + d, C.skin);
      put(f, x, legY + 2 + dy + d, C.boot); put(f, x, legY + 3 + dy + d, C.boot);
    }
    put(f, x0 + (x0 < 32 ? -1 : 3), legY + 3 + dy + d, C.boot);
  });
  // 裙子（有褶）
  for (let y = by + 9; y <= by + 12; y++) {
    const spread = y - (by + 9);
    for (let x = 23 - spread; x <= 41 + spread; x++) put(f, x, y, (x + 1) % 4 === 0 ? C.capeLight : C.skirt);
  }
  // 白襯衫
  for (let y = by; y <= by + 9; y++) for (let x = 24; x <= 40; x++) put(f, x, y, C.shirt);
  for (let y = by + 2; y <= by + 9; y++) put(f, 32, y, C.shirtShade); // 前襟
  // 袖子 + 手
  const ay = by + 3 + o.arms;
  for (let y = ay; y <= ay + 5; y++) {
    for (const x of [20, 21, 22, 42, 43, 44]) put(f, x, y, C.shirt);
    put(f, 22, y, C.shirtShade); put(f, 42, y, C.shirtShade);
  }
  dots(f, [[20, 6], [21, 6], [43, 6], [44, 6], [20, 7], [21, 7], [43, 7], [44, 7]], C.skin, 0, ay);
  // 咖啡色斗篷（有帽子，披在肩上），兩側打開露出襯衫
  // 斗篷只披在肩膀上（短短的），下面露出白色袖子
  poly(f, [[19, by + 4], [23, by - 1], [31, by - 1], [29, by + 5], [20, by + 6]], C.cape);
  poly(f, [[45, by + 4], [41, by - 1], [33, by - 1], [35, by + 5], [44, by + 6]], C.cape);
  // 金色滾邊（沿著 V 字開口）與肩膀亮面
  line(f, 30, by, 29, by + 5, C.gold);
  line(f, 34, by, 35, by + 5, C.gold);
  line(f, 20, by + 6, 29, by + 5, C.gold);
  line(f, 44, by + 6, 35, by + 5, C.gold);
  line(f, 21, by + 1, 24, by, C.capeLight);
  line(f, 43, by + 1, 40, by, C.capeLight);
  // 袖子下半露在斗篷外面
  for (let y = by + 7 + o.arms; y <= by + 8 + o.arms; y++) for (const x of [20, 21, 43, 44]) put(f, x, y, C.shirt);
  // 高領
  dots(f, [[30, -1], [31, -1], [33, -1], [34, -1], [31, 0], [33, 0]], C.shirt, 0, by);
  // 胸前小花
  flower(f, 32, by + 1, 2.5, 8);
  }
  outline(body, C.line);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (body[y][x]) hairLayer[y][x] = body[y][x];

  // ================= 3. 臉（圓圓的，臉頰寬） =================
  fill(f, (x, y) => inE(x, y, 32, hy + 5, 16.5, 13.5) || inE(x, y, 32, hy + 9, 17.5, 9), C.skin);
  // 下緣一點陰影，讓臉有立體感
  fill(f, (x, y) => (inE(x, y, 32, hy + 5, 16.5, 13.5) || inE(x, y, 32, hy + 9, 17.5, 9)) && y < hy + 1, C.skinShade);

  // ================= 4. 瀏海：一束一束、長短不一的尖髮束 =================
  const top = hy - 14;
  // [左上 x, 右上 x, 尖端 x, 尖端 y（相對頭中心）]
  const strands = [
    [12, 20, 15, 14], [16, 24, 19, 6], [20, 28, 23, 9], [24, 31, 27, 4],
    [28, 35, 31, 8], [32, 39, 35, 3], [36, 43, 40, 7], [40, 47, 44, 4], [44, 52, 49, 13],
  ];
  for (const [l, r, tx, ty] of strands) poly(f, [[l, top], [r, top], [tx + 0.5, hy + ty]], C.hair);
  // 髮束之間的細線（只畫幾條，才不會像窗簾）
  for (const i of [2, 4, 6]) {
    const [l, , tx, ty] = strands[i];
    line(f, l + 2, top + 8, tx - 1, hy + ty - 3, C.hairMid);
  }
  // 兩側鬢髮（沿著臉頰垂下來）
  for (let y = hy - 4; y <= hy + 20; y++) {
    const w = y > hy + 14 ? 2 : 3;
    const wave = Math.round(Math.sin((y + o.sway) / 3) * 0.6);
    for (let i = 0; i < w; i++) { put(f, 15 + i + wave, y, C.hair); put(f, 49 - i - wave, y, C.hair); }
    put(f, 17 + wave, y, C.hairMid); put(f, 47 - wave, y, C.hairMid);
  }
  // 頭頂光澤（像原圖那樣一小塊一小塊）
  dots(f, [[22, -17], [23, -17], [24, -18], [25, -18], [22, -16]], C.hairLight, 0, hy);
  dots(f, [[34, -19], [35, -19], [36, -19], [35, -18]], C.hairLight, 0, hy);
  dots(f, [[42, -16], [43, -15]], C.hairLight, 0, hy);
  dots(f, [[23, -17], [35, -19]], C.white, 0, hy);

  // ================= 5. 呆毛（一根往左彎的勾） =================
  const ax = 33, ay0 = hy - 20;
  // 從頭頂往上、再往左彎下來的一根呆毛（像原圖）
  const hook = [[0, 0], [0, -1], [0, -2], [-1, -3], [-1, -4], [-2, -5], [-3, -6], [-4, -6], [-5, -6], [-6, -6], [-7, -5], [-8, -4], [-8, -3], [-9, -2]];
  for (const [dx, dy] of hook) { put(f, ax + dx, ay0 + dy, C.hair); put(f, ax + dx + 1, ay0 + dy, C.hairMid); }

  outline(f, C.line, [C.shadow]);

  // ================= 6. 花髮夾（右邊） =================
  flower(f, 50, hy - 8, 6, 10);

  // ================= 7. 眼睛（大、偏低、眼皮有點下垂） =================
  const ey = hy + 3;
  for (const ex of [19, 37]) {
    const left = ex < 32;
    const outerX = left ? ex - 1 : ex + 9;
    const openEye = (lookX, lookY, lid) => {
      // 虹膜（圓角）
      for (let y = ey + lid; y <= ey + 9; y++)
        for (let x = ex; x <= ex + 8; x++) {
          const corner = (y === ey + 9 || y === ey + lid) && (x === ex || x === ex + 8);
          if (corner) continue;
          const t = (y - ey) / 9;
          put(f, x, y, t < 0.35 ? C.iris1 : t < 0.6 ? C.iris2 : t < 0.85 ? C.iris3 : C.iris4);
        }
      // 瞳孔
      for (let y = ey + 3 + lookY; y <= ey + 6 + lookY; y++) for (let x = ex + 3 + lookX; x <= ex + 5 + lookX; x++) put(f, x, y, C.pupil);
      // 下半部淡色的月牙
      dots(f, [[2, 7], [3, 8], [4, 8], [5, 8], [6, 7]], C.iris4, ex, ey);
      // 反光：左上大、右下小
      dots(f, [[1, 0], [2, 0], [3, 0], [1, 1], [2, 1], [3, 1], [2, 2]], C.white, ex + lookX, ey + lid + 1 + lookY);
      put(f, ex + 6, ey + 7, C.white);
      // 上眼皮（粗睫毛，外眼角往下拉）
      for (let x = ex - (left ? 1 : 0); x <= ex + 8 + (left ? 0 : 1); x++) { put(f, x, ey + lid - 1, C.lash); put(f, x, ey + lid - 2, C.lash); }
      put(f, outerX, ey + lid, C.lash); put(f, outerX + (left ? -1 : 1), ey + lid + 1, C.lash);
    };
    switch (o.eyes) {
      case "open": openEye(0, 0, 1); break;
      case "half": openEye(0, 0, 2); break; // 原圖那種有點睏睏的眼神
      case "look": openEye(left ? -1 : -1, -1, 2); break; // 往左上看（想事情）
      case "blink":
        for (let x = ex; x <= ex + 8; x++) put(f, x, ey + 7, C.lash);
        put(f, outerX, ey + 6, C.lash);
        break;
      case "happy":
        dots(f, [[0, 7], [1, 6], [2, 5], [3, 4], [4, 4], [5, 4], [6, 5], [7, 6], [8, 7]], C.lash, ex, ey);
        dots(f, [[1, 5], [7, 5]], C.lash, ex, ey);
        break;
      case "sleep":
        dots(f, [[0, 5], [1, 6], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 6], [8, 5]], C.lash, ex, ey);
        put(f, outerX, ey + 5, C.lash);
        break;
      case "wide": {
        for (let x = ex; x <= ex + 8; x++) put(f, x, ey - 1, C.lash);
        for (let y = ey; y <= ey + 9; y++)
          for (let x = ex; x <= ex + 8; x++) {
            if ((y === ey + 9) && (x === ex || x === ex + 8)) continue;
            put(f, x, y, x === ex || x === ex + 8 || y === ey ? C.white : C.iris3);
          }
        for (let y = ey + 4; y <= ey + 5; y++) for (let x = ex + 4; x <= ex + 4; x++) put(f, x, y, C.pupil);
        put(f, ex + 2, ey + 2, C.white); put(f, ex + 3, ey + 2, C.white);
        break;
      }
    }
  }

  // ================= 8. 腮紅（斜線）、嘴巴 =================
  for (const bx of [17, 42]) dots(f, [[0, 2], [1, 1], [2, 0], [2, 2], [3, 1], [4, 0]], C.blush, bx, ey + 11);
  const my = ey + 13;
  if (o.mouth === "small") dots(f, [[32, 0], [33, 0]], C.line, 0, my);
  if (o.mouth === "smile") dots(f, [[30, 0], [31, 1], [32, 1], [33, 1], [34, 0]], C.line, 0, my);
  if (o.mouth === "o") dots(f, [[32, 0], [33, 0], [31, 1], [34, 1], [32, 2], [33, 2]], C.line, 0, my);

  // ================= 9. 裝飾 =================
  if (o.eyes === "wide") dots(f, [[0, 0], [0, 1], [-1, 2], [0, 2], [1, 2], [0, 3]], C.sweat, 55, hy + 2);
  if (o.zz >= 0) {
    const z = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [4, 1], [3, 2], [2, 3], [1, 4], [0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5]];
    dots(f, z, C.zz, 3, 4 + o.zz);
  }
  if (o.spark) for (const [sx, sy] of [[6, 18], [58, 30], [10, 36]])
    dots(f, [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]], C.spark, sx, sy);
  // 被摸頭：頭旁邊冒出兩顆愛心
  if (o.heart >= 0) {
    const h = [[1, 0], [2, 0], [4, 0], [5, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [2, 4], [3, 4], [4, 4], [3, 5]];
    dots(f, h, C.heart, 4, 12 + o.heart);
    dots(f, [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]], C.heart, 55, 18 - o.heart);
  }
  // 吃點心：雙手拿著一塊餅乾（cookie = 1 完整、2 咬了一口）
  if (o.cookie > 0) {
    const cx = 29, cy = hy + 16;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 6; x++) {
      if ((x === 0 || x === 5) && (y === 0 || y === 4)) continue;
      if (o.cookie === 2 && x >= 4 && y <= 1) continue;
      put(f, cx + x, cy + y, C.cookie);
    }
    dots(f, [[1, 1], [3, 3], [4, 2]], C.cookieDot, cx, cy);
    dots(f, [[-1, 3], [6, 3]], C.skin, cx, cy);
  }
  // 思考泡泡（跟原圖一樣，往左上飄）
  const bubbles = [[12, 18, 1.4], [8, 12, 2.2], [4.5, 5.5, 3.2]];
  for (let i = 0; i < o.dotsN; i++) {
    const [x, y, r] = bubbles[i];
    ellipse(f, x, y, r + 1, r + 1, C.line);
    ellipse(f, x, y, r, r, C.white);
  }
  return f;
}

// ---------- 動畫表 ----------
const anims = {
  idle: [{}, { sway: 1 }, { eyes: "blink" }, { bob: 1, sway: 2, arms: 1 }],
  walk: [{ legs: [-1, 0], arms: 1 }, { bob: -1, sway: 1, eyes: "open" }, { legs: [0, -1], sway: 2, arms: 1 }, { bob: -1, sway: 3, eyes: "open" }],
  sleep: [{ eyes: "sleep", bob: 1, zz: 2 }, { eyes: "sleep", bob: 1, zz: 0, sway: 1 }],
  drag: [{ eyes: "wide", mouth: "o", dangle: true, legs: [1, 0], arms: -2 }, { eyes: "wide", mouth: "o", dangle: true, legs: [0, 1], sway: 1, arms: -3 }],
  react: [{ bob: -3, eyes: "happy", mouth: "smile", spark: true, arms: -2 }, { bob: -5, eyes: "happy", mouth: "smile", arms: -3 },
    { bob: -2, eyes: "happy", mouth: "smile", spark: true, arms: -1 }, { eyes: "open", mouth: "smile" }],
  pet: [{ eyes: "happy", mouth: "smile", heart: 1, bob: 1 }, { eyes: "happy", mouth: "smile", heart: 0, sway: 1 }],
  eat: [{ eyes: "happy", mouth: "o", cookie: 1, arms: -2 }, { eyes: "happy", mouth: "smile", cookie: 2, arms: -2, bob: 1 }],
  sit: [{ bob: 1, dangle: true, legs: [1, 0] }, { bob: 1, dangle: true, legs: [0, 1], sway: 1, eyes: "blink" }],
  think: [{ eyes: "look", dotsN: 1 }, { eyes: "look", dotsN: 2 }, { eyes: "look", dotsN: 3 }, { eyes: "blink", dotsN: 3 }],
};

const frames = Object.fromEntries(Object.entries(anims).map(([k, list]) => [k, list.map(draw)]));
const animations = writeSheet("skins/shiori/sprite.png", frames, { w: S, h: S },
  { idle: 2.5, walk: 7, sleep: 1.5, drag: 6, react: 8, pet: 4, eat: 5, sit: 1.5, think: 3 });

const mPath = "skins/shiori/manifest.json";
let manifest = {};
try { manifest = JSON.parse(readFileSync(mPath, "utf8")); } catch {}
manifest = { name: "栞", author: "desk-pet", image: "sprite.png", ...manifest, frameWidth: S, frameHeight: S, scale: 2, animations };
writeFileSync(mPath, JSON.stringify(manifest, null, 2) + "\n");
writeIcon("skins/shiori/preview.png", frames.idle[0], 4);
console.log("完成：skins/shiori/sprite.png");
