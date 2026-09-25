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
  /** 使用者自己加的角色（可以刪除） */
  user: boolean;
}

export interface SkinManifest {
  name: string;
  /** "image" = 圖片模式（每個動作一張圖）；不填 = 精靈圖模式 */
  mode?: "image";
  /** 圖片模式：角色在畫面上的高度（CSS 像素，預設 128） */
  height?: number;
  /** 放大時要不要保持像素顆粒感（精靈圖預設 true，圖片模式預設 false） */
  pixelated?: boolean;
  /** 圖片模式：各動作的圖片檔名 */
  images?: Record<string, string>;
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
  /** images：精靈圖模式是 { sheet }，圖片模式是 { idle, walk, … } */
  loadSkin: (id: string) => invoke<{ manifest: SkinManifest; images: Record<string, string> }>("load_skin", { id }),
  /** 角色工作室 */
  createSkin: (name: string, images: Record<string, string>, persona: string, bio: string) =>
    invoke<string>("create_skin", { name, images, persona, bio }),
  importSkinFolder: (path: string) => invoke<string>("import_skin_folder", { path }),
  createSkinTemplate: () => invoke<string>("create_skin_template"),
  deleteSkin: (id: string) => invoke<void>("delete_skin", { id }),
  selectSkin: (id: string) => invoke<void>("select_skin", { id }),

  // Claude（claude.rs）：前端永遠拿不到金鑰本身
  hasApiKey: () => invoke<boolean>("has_api_key"),
  setApiKey: (key: string) => invoke<void>("set_api_key", { key }),
  clearApiKey: () => invoke<void>("clear_api_key"),
  claudeChat: (messages: ChatMessage[], context: string, now: string) =>
    invoke<ChatReply>("claude_chat", { messages, context, now }),
  /** 在 Claude（claude.ai）開新對話並填好問題 */
  openInClaude: (prompt: string) => invoke<void>("open_in_claude", { prompt }),
  /** 開啟網址（只允許本專案 GitHub 和 claude.ai） */
  openUrl: (url: string) => invoke<void>("open_url", { url }),

  // 視窗與托盤（tray.rs）
  openSettings: () => invoke<void>("open_settings_window"),
  refreshTray: () => invoke<void>("refresh_tray"),
};
