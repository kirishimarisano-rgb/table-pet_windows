// =============================================================
// 台詞系統：從 lines.json 依「情境分類」隨機挑一句
// =============================================================
import { api } from "./api";

export class Lines {
  private data: Record<string, string[]> = {};
  /** 最後一次讀取失敗的原因（沒有錯誤是 null） */
  error: string | null = null;
  /** 記住每個分類上一次說的話，避免連續講同一句 */
  private last: Record<string, string> = {};

  /** 讀取某個語言、某個角色的台詞（角色專屬台詞會蓋掉共用台詞） */
  async load(lang: string, skin: string): Promise<void> {
    try {
      const raw = await api.getLines(lang, skin);
      this.data = {};
      for (const [key, value] of Object.entries(raw)) {
        // 底線開頭的是說明欄位；只收字串陣列
        if (key.startsWith("_") || !Array.isArray(value)) continue;
        this.data[key] = value.filter((v): v is string => typeof v === "string");
      }
    } catch (e) {
      console.error("讀取台詞失敗", e);
      this.error = String(e);
      this.data = { idle: ["……？"] };
      return;
    }
    this.error = null;
  }

  /** 從某個分類隨機挑一句；分類不存在就回傳 null */
  pick(category: string): string | null {
    const list = this.data[category];
    if (!list || list.length === 0) return null;
    let line = list[Math.floor(Math.random() * list.length)];
    if (list.length > 1 && line === this.last[category]) {
      line = list[(list.indexOf(line) + 1) % list.length];
    }
    this.last[category] = line;
    return line;
  }

  /** 依時間挑招呼語（早上／下午／晚上），沒有就用一般 greeting */
  greeting(now = new Date()): string | null {
    const h = now.getHours();
    const special =
      h >= 5 && h < 11 ? "greeting_morning" : h >= 11 && h < 17 ? "greeting_afternoon" : "greeting_evening";
    return (Math.random() < 0.6 ? this.pick(special) : null) ?? this.pick("greeting");
  }

  /** 深夜（23:00～05:00） */
  static isLateNight(now = new Date()): boolean {
    const h = now.getHours();
    return h >= 23 || h < 5;
  }
}
