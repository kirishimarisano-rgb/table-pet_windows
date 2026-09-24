// =============================================================
// 電腦使用狀態偵測
// 每 3 秒向 Rust 問一次「使用者閒置了幾秒」，換算成三種狀態：
//   busy：剛剛還在打字／動滑鼠
//   idle：一陣子沒動
//   away：很久沒動，大概離開座位了
// 只有閒置秒數這一個數字，不會知道使用者按了什麼鍵。
// =============================================================
import { api } from "../common/api";
import type { Activity } from "./stateMachine";

export class ActivityMonitor {
  level: Activity = "busy";
  idleSeconds = 0;
  thresholds = { busySec: 30, awaySec: 300 };

  constructor(private onChange: (next: Activity, prev: Activity) => void) {}

  start(): void {
    const poll = async () => {
      try {
        this.idleSeconds = await api.getIdleSeconds();
      } catch {
        return;
      }
      const s = this.idleSeconds;
      const next: Activity = s < this.thresholds.busySec ? "busy" : s < this.thresholds.awaySec ? "idle" : "away";
      if (next !== this.level) {
        const prev = this.level;
        this.level = next;
        this.onChange(next, prev);
      }
    };
    void poll();
    setInterval(poll, 3000);
  }
}
