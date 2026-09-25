// =============================================================
// 設定的型別與預設值
// 存在使用者資料夾的 settings.json；缺少的欄位會自動補上預設值。
// =============================================================
import { api } from "./api";
import { detectLang, type Lang } from "./i18n";

export interface Settings {
  /** 介面、台詞、聊天使用的語言 */
  language: Lang;
  skin: string;
  /** 大小倍率（1 = 原始大小） */
  petScale: number;
  /** 會不會自己走來走去 */
  walkEnabled: boolean;
  /** 會不會跳到其他視窗上面坐著 */
  perchEnabled: boolean;
  /** 幾分鐘自言自語一次（0 = 不說話） */
  talkIntervalMin: number;
  activity: {
    /** 閒置少於幾秒算「正在忙」 */
    busySec: number;
    /** 閒置超過幾秒算「離開」→ 柑柑去睡覺 */
    awaySec: number;
  };
  pomodoro: {
    workMin: number;
    breakMin: number;
    /** 專注結束後自動開始休息 */
    autoBreak: boolean;
  };
  claude: {
    /** 有金鑰時，點柑柑是否打開對話泡泡 */
    enabled: boolean;
    model: string;
    effort: "low" | "medium" | "high";
    /** 沒有 API 金鑰時，點角色改為「在 Claude 開新對話」 */
    handoff: boolean;
  };
}

export const DEFAULT_SETTINGS: Settings = {
  language: detectLang(),
  skin: "default",
  petScale: 1,
  walkEnabled: true,
  perchEnabled: true,
  talkIntervalMin: 5,
  activity: { busySec: 30, awaySec: 300 },
  pomodoro: { workMin: 25, breakMin: 5, autoBreak: true },
  claude: { enabled: true, model: "claude-sonnet-5", effort: "medium", handoff: false },
};

/** 把讀到的設定和預設值合併（只合併一層巢狀，夠用了） */
function merge(saved: any): Settings {
  const s: any = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  for (const key of ["activity", "pomodoro", "claude"] as const) {
    s[key] = { ...DEFAULT_SETTINGS[key], ...(saved?.[key] ?? {}) };
  }
  return s as Settings;
}

export async function loadSettings(): Promise<Settings> {
  return merge(await api.loadData("settings"));
}

export async function saveSettings(s: Settings): Promise<void> {
  await api.saveData("settings", s);
}
