// =============================================================
// 好感度與餵食紀錄（存在 stats.json）
// 摸頭 +1、餵點心 +2、完成待辦 +1；每天最多餵 3 次
// =============================================================
import { api } from "../common/api";
import { affectionLevel, todayStr, type Stats } from "../common/types";

const MAX_FEEDS_PER_DAY = 3;

export class StatsStore {
  data: Stats = { affection: 0 };

  async load(): Promise<void> {
    this.data = { affection: 0, ...((await api.loadData<Stats>("stats")) ?? {}) };
  }

  get level(): number {
    return affectionLevel(this.data.affection);
  }

  /** 增加好感度；升級時回傳 true */
  async addAffection(points: number): Promise<boolean> {
    const before = this.level;
    this.data.affection += points;
    await api.saveData("stats", this.data);
    return this.level > before;
  }

  /** 餵點心；今天吃太多會回傳 "full" */
  async feed(): Promise<"ok" | "full" | "levelUp"> {
    const today = todayStr();
    if (this.data.fedDate !== today) {
      this.data.fedDate = today;
      this.data.fedCount = 0;
    }
    if ((this.data.fedCount ?? 0) >= MAX_FEEDS_PER_DAY) return "full";
    this.data.fedCount = (this.data.fedCount ?? 0) + 1;
    return (await this.addAffection(2)) ? "levelUp" : "ok";
  }
}
