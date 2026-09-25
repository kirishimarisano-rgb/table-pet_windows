// =============================================================
// 隱私檢查：確認沒有把私人東西放進 repo
//
//   node scripts/check-privacy.mjs          檢查所有已追蹤的檔案（CI 用）
//   node scripts/check-privacy.mjs --staged 只檢查這次要 commit 的檔案（pre-commit 用）
//
// 會擋下：
//   1. skins/ 裡「公開角色」以外的資料夾（你的私人角色）
//   2. secrets.json、.env 這類設定檔
//   3. 內容看起來像 Anthropic API 金鑰（sk-ant-…）的檔案
// =============================================================
import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

/** 可以公開的角色（要公開新角色時，把資料夾名稱加到這裡，也要改 .gitignore 和 tauri.conf.json） */
export const PUBLIC_SKINS = ["default", "kanade", "shiori"];

const staged = process.argv.includes("--staged");
const files = execSync(staged ? "git diff --cached --name-only --diff-filter=ACMR" : "git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const problems = [];
const KEY_PATTERN = /sk-ant-[A-Za-z0-9_-]{20,}/;

for (const f of files) {
  const parts = f.split("/");
  if (parts[0] === "skins" && parts.length > 2 && !PUBLIC_SKINS.includes(parts[1])) {
    problems.push(`私人角色不能放進 repo：${f}`);
  }
  const base = parts[parts.length - 1];
  if (base === "secrets.json" || base === ".env" || base.startsWith(".env.")) {
    problems.push(`設定／金鑰檔不能放進 repo：${f}`);
  }
  if (existsSync(f) && !/\.(png|ico|icns|jpg|gif)$/i.test(f)) {
    const text = readFileSync(f, "utf8");
    if (KEY_PATTERN.test(text)) problems.push(`檔案裡好像有 API 金鑰：${f}`);
  }
}

if (problems.length) {
  console.error("❌ 隱私檢查沒通過：\n  " + problems.join("\n  "));
  console.error("\n這些東西請放在 %APPDATA%\\tw.deskpet.kankan\\ 裡，不要放進 repo。");
  process.exit(1);
}
console.log(`✅ 隱私檢查通過（檢查了 ${files.length} 個檔案）`);
