// =============================================================
// 視窗之間溝通用的事件名稱（集中管理，避免打錯字）
// =============================================================
export const EV = {
  /** 設定視窗改了設定 → 桌寵重新讀設定 */
  settingsChanged: "settings-changed",
  /** 造型切換（Rust 托盤也會送） */
  skinChanged: "skin-changed",
  /** 叫柑柑說某一類台詞，payload = 分類名稱 */
  petSay: "pet-say",
  /** 完成待辦，payload = { allDone: boolean } */
  todoDone: "todo-done",
  /** 番茄鐘指令，payload = "work" | "break" | "stop" */
  pomodoroCommand: "pomodoro-command",
  /** 桌寵回報番茄鐘狀態給設定視窗 */
  pomodoroStatus: "pomodoro-status",
  /** API 金鑰新增或刪除 */
  apiKeyChanged: "api-key-changed",
  /** 桌寵觸發了提醒（設定視窗要重新整理清單） */
  remindersChanged: "reminders-changed",
  /** 台詞檔重新載入 */
  linesChanged: "lines-changed",
} as const;
