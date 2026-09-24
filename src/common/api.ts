// =============================================================
// 所有「呼叫 Rust」的地方都集中在這裡，方便查找。
// 對應的 Rust 程式在 src-tauri/src/ 底下。
// =============================================================
import { invoke } from "@tauri-apps/api/core";

export type DataName = "settings" | "todos" | "reminders" | "stats";

export interface SkinInfo {
  id: string;
  name: string;
  author: string;
  /** 各語言的名字，例如 { "ja": "カナデ" } */
  names: Record<string, string> | null;
}

export interface SkinManifest {
  name: string;
  author?: string;
  image?: string;
  frameWidth: number;
  frameHeight: number;
  scale?: number;
  animations: Record<string, { row: number; frames: number; fps: number }>;
  /** 各語言的名字 */
  names?: Record<string, string>;
  /** 各語言的角色介紹（顯示在設定視窗的「關於」） */
  bio?: Record<string, string>;
}

export interface ChatReply {
  reply: string;
  /** 對話中有沒有透過工具完成待辦 */
  todoDone: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const api = {
  // 本機資料（storage.rs）
  loadData: <T>(name: DataName) => invoke<T | null>("load_data", { name }),
  saveData: (name: DataName, value: unknown) => invoke<void>("save_data", { name, value }),
  openDataDir: (sub: "" | "skins" = "") => invoke<void>("open_data_dir", { sub }),

  // 閒置秒數（idle.rs）：只有秒數，沒有任何按鍵內容
  getIdleSeconds: () => invoke<number>("get_idle_seconds"),

  // 台詞（lines.rs）
  getLines: (lang: string, skin: string) => invoke<Record<string, unknown>>("get_lines", { lang, skin }),
  resetLines: (lang: string) => invoke<void>("reset_lines", { lang }),

  // 造型（skins.rs）
  listSkins: () => invoke<SkinInfo[]>("list_skins"),
  loadSkin: (id: string) => invoke<{ manifest: SkinManifest; image: string }>("load_skin", { id }),
  selectSkin: (id: string) => invoke<void>("select_skin", { id }),

  // Claude（claude.rs）：前端永遠拿不到金鑰本身
  hasApiKey: () => invoke<boolean>("has_api_key"),
  setApiKey: (key: string) => invoke<void>("set_api_key", { key }),
  clearApiKey: () => invoke<void>("clear_api_key"),
  claudeChat: (messages: ChatMessage[], context: string, now: string) =>
    invoke<ChatReply>("claude_chat", { messages, context, now }),
  /** 在 Claude（claude.ai）開新對話並填好問題 */
  openInClaude: (prompt: string) => invoke<void>("open_in_claude", { prompt }),

  // 視窗與托盤（tray.rs）
  openSettings: () => invoke<void>("open_settings_window"),
  refreshTray: () => invoke<void>("refresh_tray"),
};
