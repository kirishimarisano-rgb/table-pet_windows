// =============================================================
// 設定視窗入口：切換分頁、語言、綁定一般設定欄位，其餘交給各分頁模組
// =============================================================
import { emit } from "@tauri-apps/api/event";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { api } from "../common/api";
import { EV } from "../common/events";
import { applyI18n, LANGS, setLang, t } from "../common/i18n";
import { loadSettings, saveSettings, type Settings } from "../common/settings";
import { setupTodos } from "./todos";
import { setupReminders } from "./reminders";
import { setupPomodoro } from "./pomodoro";
import { setupLines } from "./lines";
import { setupSkins } from "./skins";
import { setupClaude } from "./claude";
import { renderAbout } from "./about";

// ---------- 分頁切換（記住上次開的分頁） ----------
function setupTabs(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>("#tabs button");
  const select = (tab: string) => {
    buttons.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll("main section").forEach((s) => s.classList.toggle("active", s.id === `tab-${tab}`));
    try { sessionStorage.setItem("tab", tab); } catch { /* 無法儲存也沒關係 */ }
  };
  buttons.forEach((btn) => btn.addEventListener("click", () => select(btn.dataset.tab!)));
  try {
    const saved = sessionStorage.getItem("tab");
    if (saved) select(saved);
  } catch { /* 忽略 */ }
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
      // 換語言：整個設定視窗重新載入，所有文字一次換好
      if (path === "language") location.reload();
    });
  });
}

// ---------- 開機自動啟動 ----------
async function setupAutostart(): Promise<void> {
  const box = document.getElementById("autostart") as HTMLInputElement;
  try {
    box.checked = await isEnabled();
  } catch {
    box.disabled = true;
    return;
  }
  box.addEventListener("change", async () => {
    try {
      box.checked ? await enable() : await disable();
    } catch (e) {
      alert(String(e));
      box.checked = await isEnabled();
    }
  });
}

// ---------- 啟動 ----------
async function main(): Promise<void> {
  const settings = await loadSettings();
  setLang(settings.language);

  const langSelect = document.getElementById("lang-select") as HTMLSelectElement;
  for (const l of LANGS) langSelect.add(new Option(l.label, l.id));

  applyI18n();
  setupTabs();
  bindSettings(settings);

  document.getElementById("open-data")!.addEventListener("click", () => api.openDataDir(""));
  // 顯示目前閒置秒數，讓使用者調整門檻時有參考
  const idleEl = document.getElementById("idle-now")!;
  const showIdle = async () => (idleEl.textContent = t("gen.idleNow", { sec: await api.getIdleSeconds() }));
  void showIdle();
  setInterval(showIdle, 1000);

  await Promise.all([
    setupAutostart(),
    setupTodos(),
    setupReminders(),
    setupPomodoro(),
    setupLines(settings),
    setupSkins(settings, () => void renderAbout(settings)),
    setupClaude(),
    renderAbout(settings),
  ]);
}

main().catch((e) => alert(`Error: ${e}`));
