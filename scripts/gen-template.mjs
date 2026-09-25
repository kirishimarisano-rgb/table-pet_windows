// =============================================================
// 產生「像素角色範本」：templates/skin-template/
//   sprite.png  全透明、尺寸正確的精靈圖（直接在上面畫）
//   guide.png   參考用格線圖：每一列一種顏色，標出每一格的範圍和地面線
// 用法：node scripts/gen-template.mjs
// =============================================================
import { writeFileSync, mkdirSync } from "node:fs";
import { encodePng } from "./pixel.mjs";

const SIZE = 32, COLS = 4;
const ROWS = ["idle", "walk", "sleep", "drag", "react", "think", "pet", "eat", "sit"];
const TINTS = [[255, 200, 150], [200, 230, 160], [170, 190, 240], [240, 170, 170], [255, 225, 130],
  [210, 180, 240], [255, 180, 210], [240, 210, 170], [180, 225, 225]];
const W = SIZE * COLS, H = SIZE * ROWS.length;

mkdirSync("templates/skin-template", { recursive: true });
writeFileSync("templates/skin-template/sprite.png", encodePng(W, H, () => null));
writeFileSync("templates/skin-template/guide.png", encodePng(W, H, (x, y) => {
  const row = Math.floor(y / SIZE), cx = x % SIZE, cy = y % SIZE;
  const [r, g, b] = TINTS[row];
  if (cx === 0 || cy === 0) return [r - 60, g - 60, b - 60];       // 格線
  if (cy === SIZE - 2) return [120, 90, 70];                        // 地面線（腳踩在這條線上）
  if (cx === SIZE / 2 && cy % 2 === 0) return [r - 30, g - 30, b - 30]; // 中心線
  return [r, g, b];
}));
console.log(`完成：${W}×${H}，列順序：${ROWS.join(", ")}`);
