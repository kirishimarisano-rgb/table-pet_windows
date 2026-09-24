// =============================================================
// 番茄鐘：專注 N 分鐘 → 休息 M 分鐘
// 計時放在桌寵視窗裡，因為它一直開著；設定視窗只負責顯示和下指令。
// =============================================================

export type PomoPhase = "off" | "work" | "break";

export interface PomoStatus {
  phase: PomoPhase;
  remainingSec: number;
}

export class Pomodoro {
  phase: PomoPhase = "off";
  private endsAt = 0;

  constructor(
    /** 每秒回報一次狀態 */
    private onTick: (s: PomoStatus) => void,
    /** 某個階段結束 */
    private onFinish: (finished: "work" | "break") => void,
  ) {
    setInterval(() => this.tick(), 1000);
  }

  start(phase: "work" | "break", minutes: number): void {
    this.phase = phase;
    this.endsAt = Date.now() + minutes * 60_000;
    this.tick();
  }

  stop(): void {
    this.phase = "off";
    this.tick();
  }

  status(): PomoStatus {
    const remainingSec = this.phase === "off" ? 0 : Math.max(0, Math.ceil((this.endsAt - Date.now()) / 1000));
    return { phase: this.phase, remainingSec };
  }

  private tick(): void {
    const s = this.status();
    if (s.phase !== "off" && s.remainingSec <= 0) {
      const finished = s.phase;
      this.phase = "off";
      this.onTick(this.status());
      this.onFinish(finished);
      return;
    }
    this.onTick(s);
  }
}

/** 秒數 → "mm:ss" */
export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
