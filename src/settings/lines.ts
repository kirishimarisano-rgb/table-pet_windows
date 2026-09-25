// =============================================================
// 台詞分頁：顯示目前語言＋角色的每個分類有幾句，提供重新載入／還原
// =============================================================
import { emit } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { EV } from "../common/events";
import { t } from "../common/i18n";
import type { Settings } from "../common/settings";

/** 分類的中文說明（使用者自己加的分類會顯示「自訂」） */
const NAMES: Record<string, string> = {
  greeting: "打招呼 / あいさつ / Greeting",
  greeting_morning: "早上 / 朝 / Morning",
  greeting_afternoon: "下午 / 昼 / Afternoon",
  greeting_evening: "晚上 / 夜 / Evening",
  idle: "閒置 / ひとりごと / Idle",
  busy: "你在忙 / 作業中 / Busy",
  away_return: "回來 / おかえり / Welcome back",
  late_night: "深夜 / 深夜 / Late night",
  todo_done: "完成待辦 / ToDo 完了 / To-do done",
  todo_all_done: "全部完成 / 全部完了 / All done",
  click: "點擊 / クリック / Click",
  drag: "拖曳 / ドラッグ / Drag",
  drop: "放下 / おろす / Drop",
  pomodoro_start: "番茄鐘開始 / 集中開始 / Focus start",
  pomodoro_break: "休息 / 休憩 / Break",
  pomodoro_break_end: "休息結束 / 休憩終了 / Break end",
  reminder: "提醒 / リマインダー / Reminder",
  pet: "摸頭 / なでなで / Pat",
  feed: "點心 / おやつ / Snack",
  feed_full: "吃飽了 / 満腹 / Full",
  love_up: "好感度上升 / なかよし度アップ / Friendship up",
};

export async function setupLines(settings: Settings): Promise<void> {
  async function render(): Promise<void> {
    const table = document.getElementById("lines-table")!;
    table.innerHTML = "";
    const head = document.createElement("tr");
    for (const k of ["lines.category", "lines.key", "lines.count"]) {
      const th = document.createElement("th");
      th.textContent = t(k);
      head.appendChild(th);
    }
    table.appendChild(head);
    try {
      const data = await api.getLines(settings.language, settings.skin);
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith("_") || !Array.isArray(value)) continue;
        const tr = document.createElement("tr");
        for (const text of [NAMES[key] ?? t("lines.custom"), key, String(value.length)]) {
          const td = document.createElement("td");
          td.textContent = text;
          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
    } catch (e) {
      const tr = document.createElement("tr");
      tr.innerHTML = '<td class="error"></td>';
      tr.firstElementChild!.textContent = t("lines.error") + e;
      table.appendChild(tr);
    }
  }

  await render();
  document.getElementById("lines-open")!.addEventListener("click", () => api.openDataDir(""));
  document.getElementById("lines-reload")!.addEventListener("click", async () => {
    await render();
    await emit(EV.linesChanged);
    await emit(EV.petSay, "greeting");
  });
  document.getElementById("lines-reset")!.addEventListener("click", async () => {
    if (!confirm(t("lines.resetConfirm"))) return;
    await api.resetLines(settings.language);
    await render();
    await emit(EV.linesChanged);
  });
}
