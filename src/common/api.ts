// =============================================================
// 所有「呼叫 Rust」的地方都集中在這裡，方便查找。
// 對應的 Rust 程式在 src-tauri/src/ 底下。
// =============================================================
import { invoke } from "@tauri-apps/api/core";

export type DataName = "settings" | "todos" | "reminders";

export interface SkinInfo {
  id: string;
  name: string;
  author: string;
}

export interface SkinManifest {
  name: string;
  author?: string;
  image?: string;
  frameWidth: number;
  frameHeight: number;
  scale?: number;
  animations: Record<string, { row: number; frames: number; fps: number }>;
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
  getLines: () => invoke<Record<string, unknown>>("get_lines"),
  resetLines: () => invoke<void>("reset_lines"),

  // 造型（skins.rs）
  listSkins: () => invoke<SkinInfo[]>("list_skins"),
  loadSkin: (id: string) => invoke<{ manifest: SkinManifest; image: string }>("load_skin", { id }),
  selectSkin: (id: string) => invoke<void>("select_skin", { id }),

  // Claude（claude.rs）：前端永遠拿不到金鑰本身
  hasApiKey: () => invoke<boolean>("has_api_key"),
  setApiKey: (key: string) => invoke<void>("set_api_key", { key }),
  clearApiKey: () => invoke<void>("clear_api_key"),
  claudeChat: (messages: ChatMessage[]) => invoke<string>("claude_chat", { messages }),

  // 視窗與托盤（tray.rs）
  openSettings: () => invoke<void>("open_settings_window"),
  refreshTray: () => invoke<void>("refresh_tray"),
};
