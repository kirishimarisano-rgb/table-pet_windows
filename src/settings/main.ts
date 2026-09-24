// =============================================================
// 設定視窗入口：切換分頁、綁定一般設定欄位，其餘交給各分頁模組
// =============================================================
import { emit } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { EV } from "../common/events";
import { loadSettings, saveSettings, type Settings } from "../common/settings";
import { setupTodos } from "./todos";
import { setupReminders } from "./reminders";
import { setupPomodoro } from "./pomodoro";
import { setupLines } from "./lines";
import { setupSkins } from "./skins";
import { setupClaude } from "./claude";

// ---------- 分頁切換 ----------
function setupTabs(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>("#tabs button");
  buttons.forEach((btn) =>
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      document.querySelectorAll("main section").forEach((s) =>
        s.classList.toggle("active", s.id === `tab-${btn.dataset.tab}`));
    }),
  );
}

// ---------- 自動綁定設定欄位 ----------
// HTML 上寫 data-setting="pomodoro.workMin"，這裡就會自動讀取／儲存對應的設定。

function getPath(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => o?.[k], obj);
}
function setPath(obj: any, path: string, value: unknown): void {
  const keys = path.split(".");
  const last = keys.pop()!;
  keys.reduce((o, k) => o[k], obj)[last] = value;
}

function bindSettings(settings: Settings): void {
  document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-setting]").forEach((el) => {
    const path = el.dataset.setting!;
    const value = getPath(settings, path);
    if (el instanceof HTMLInputElement && el.type === "checkbox") el.checked = Boolean(value);
    else el.value = String(value);

    el.addEventListener("change", async () => {
      let v: unknown;
      if (el instanceof HTMLInputElement && el.type === "checkbox") v = el.checked;
      else if ((el instanceof HTMLInputElement && el.type === "number") || el.dataset.type === "number") {
        v = Number(el.value);
        if (!Number.isFinite(v)) return;
      } else v = el.value.trim();
      setPath(settings, path, v);
      await saveSettings(settings);
      await emit(EV.settingsChanged);
    });
  });
}

// ---------- 啟動 ----------
async function main(): Promise<void> {
  setupTabs();
  const settings = await loadSettings();
  bindSettings(settings);

  document.getElementById("open-data")!.addEventListener("click", () => api.openDataDir(""));
  // 顯示目前閒置秒數，讓使用者調整門檻時有參考
  const idleEl = document.getElementById("idle-now")!;
  setInterval(async () => (idleEl.textContent = String(await api.getIdleSeconds())), 1000);

  await Promise.all([setupTodos(), setupReminders(), setupPomodoro(), setupLines(), setupSkins(settings), setupClaude()]);
}

main().catch((e) => alert(`設定視窗發生錯誤：${e}`));
