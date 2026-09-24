// =============================================================
// 台詞分頁：顯示每個分類有幾句，提供重新載入／還原
// =============================================================
import { emit } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { EV } from "../common/events";

/** 分類的中文說明（使用者自己加的分類會直接顯示英文名稱） */
const NAMES: Record<string, string> = {
  greeting: "打招呼",
  greeting_morning: "打招呼（早上）",
  greeting_afternoon: "打招呼（下午）",
  greeting_evening: "打招呼（晚上）",
  idle: "閒置時自言自語",
  busy: "你在忙的時候",
  away_return: "你離開後回來",
  late_night: "深夜（23:00～05:00）",
  todo_done: "完成待辦",
  todo_all_done: "完成全部待辦",
  click: "被點擊",
  drag: "被拖曳",
  drop: "被放下",
  pomodoro_start: "番茄鐘開始",
  pomodoro_break: "番茄鐘休息",
  pomodoro_break_end: "休息結束",
  reminder: "提醒開頭",
};

async function render(): Promise<void> {
  const table = document.getElementById("lines-table")!;
  table.innerHTML = "<tr><th>分類</th><th>名稱</th><th>句數</th></tr>";
  try {
    const data = await api.getLines();
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("_") || !Array.isArray(value)) continue;
      const tr = document.createElement("tr");
      for (const text of [NAMES[key] ?? "（自訂）", key, String(value.length)]) {
        const td = document.createElement("td");
        td.textContent = text;
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
  } catch (e) {
    table.innerHTML = `<tr><td class="error">讀取失敗：${String(e).replace(/</g, "&lt;")}</td></tr>`;
  }
}

export async function setupLines(): Promise<void> {
  await render();
  document.getElementById("lines-open")!.addEventListener("click", () => api.openDataDir(""));
  document.getElementById("lines-reload")!.addEventListener("click", async () => {
    await render();
    await emit(EV.linesChanged);
    await emit(EV.petSay, "greeting");
  });
  document.getElementById("lines-reset")!.addEventListener("click", async () => {
    if (!confirm("確定要把 lines.json 還原成內建台詞嗎？你自己加的台詞會消失。")) return;
    await api.resetLines();
    await render();
    await emit(EV.linesChanged);
  });
}
