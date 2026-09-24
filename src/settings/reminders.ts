// =============================================================
// 提醒設定（存在 reminders.json）；實際檢查時間的是桌寵視窗的 pet/reminders.ts
// =============================================================
import { listen } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { EV } from "../common/events";
import { newId, todayStr, type Reminder } from "../common/types";

let reminders: Reminder[] = [];
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function save(): Promise<void> {
  await api.saveData("reminders", reminders);
  render();
}

function describe(r: Reminder): string {
  if (r.kind === "daily") return `每天 ${r.at}`;
  return r.at.replace("T", " ") + (r.done ? "（已提醒）" : "");
}

function render(): void {
  const ul = $("rem-list");
  ul.innerHTML = "";
  if (reminders.length === 0) {
    ul.innerHTML = '<li class="muted">還沒有提醒</li>';
    return;
  }
  for (const r of reminders) {
    const li = document.createElement("li");
    li.className = r.done ? "done" : "";
    const span = document.createElement("span");
    span.textContent = `${r.text}　—　${describe(r)}`;
    const del = document.createElement("button");
    del.textContent = "刪除";
    del.className = "link";
    del.addEventListener("click", async () => {
      reminders = reminders.filter((x) => x.id !== r.id);
      await save();
    });
    li.append(span, del);
    ul.appendChild(li);
  }
}

export async function setupReminders(): Promise<void> {
  reminders = (await api.loadData<Reminder[]>("reminders")) ?? [];
  render();

  const kind = $<HTMLSelectElement>("rem-kind");
  kind.addEventListener("change", () => {
    $("rem-once-label").classList.toggle("hidden", kind.value !== "once");
    $("rem-daily-label").classList.toggle("hidden", kind.value !== "daily");
  });

  $("rem-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = $<HTMLInputElement>("rem-text").value.trim();
    if (!text) return;

    if (kind.value === "once") {
      const at = $<HTMLInputElement>("rem-datetime").value;
      if (!at) return alert("請選擇時間");
      reminders.push({ id: newId(), text, kind: "once", at });
    } else {
      const at = $<HTMLInputElement>("rem-time").value;
      if (!at) return alert("請選擇時間");
      // 如果今天的時間已經過了，就從明天開始提醒
      const now = new Date().toTimeString().slice(0, 5);
      reminders.push({ id: newId(), text, kind: "daily", at, lastFiredDate: at <= now ? todayStr() : undefined });
    }
    $<HTMLInputElement>("rem-text").value = "";
    await save();
  });

  // 桌寵觸發提醒後，重新讀取清單
  await listen(EV.remindersChanged, async () => {
    reminders = (await api.loadData<Reminder[]>("reminders")) ?? [];
    render();
  });
}
