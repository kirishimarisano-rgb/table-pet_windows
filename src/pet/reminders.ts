// =============================================================
// 提醒檢查：每 20 秒讀一次 reminders.json，看有沒有到時間的
// =============================================================
import { emit } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { EV } from "../common/events";
import { todayStr, type Reminder } from "../common/types";

export function startReminderCheck(onFire: (r: Reminder) => void): void {
  const check = async () => {
    const list = (await api.loadData<Reminder[]>("reminders")) ?? [];
    const now = new Date();
    const today = todayStr(now);
    const hhmm = now.toTimeString().slice(0, 5); // "15:04"
    let changed = false;

    for (const r of list) {
      if (r.kind === "once") {
        // 過了指定時間、還沒提醒過（程式沒開的時候錯過的，開啟後會補提醒）
        if (!r.done && new Date(r.at) <= now) {
          r.done = true;
          changed = true;
          onFire(r);
        }
      } else if (r.kind === "daily") {
        if (r.at <= hhmm && r.lastFiredDate !== today) {
          r.lastFiredDate = today;
          changed = true;
          onFire(r);
        }
      }
    }
    if (changed) await api.saveData("reminders", list);
    return changed;
  };

  const run = async () => {
    try {
      if (await check()) await emit(EV.remindersChanged);
    } catch (e) {
      console.error("檢查提醒失敗", e);
    }
  };
  void run();
  setInterval(run, 20_000);
}
