// 待辦與提醒的資料格式（存在 todos.json、reminders.json）

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  doneAt?: string;
}

export interface Reminder {
  id: string;
  text: string;
  /** once：指定日期時間一次；daily：每天固定時間 */
  kind: "once" | "daily";
  /** once → "2026-09-24T15:00"；daily → "15:00" */
  at: string;
  /** once 提醒過後會標成 true */
  done?: boolean;
  /** daily 上次提醒的日期（YYYY-MM-DD），避免同一天重複提醒 */
  lastFiredDate?: string;
}

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** 今天的日期字串 YYYY-MM-DD（本地時間） */
export function todayStr(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 互動紀錄（存在 stats.json） */
export interface Stats {
  /** 好感度，互動會慢慢增加 */
  affection: number;
  /** 今天餵了幾次（YYYY-MM-DD → 次數） */
  fedDate?: string;
  fedCount?: number;
}

/** 好感度等級（0～4），每一級需要的點數 */
export const AFFECTION_LEVELS = [0, 10, 30, 60, 100];
export function affectionLevel(points: number): number {
  let lv = 0;
  AFFECTION_LEVELS.forEach((need, i) => { if (points >= need) lv = i; });
  return lv;
}
