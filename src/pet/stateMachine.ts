// =============================================================
// 柑柑的狀態機
//
//   idle（閒置）──時間到──▶ walk（走路）──時間到──▶ idle
//     │                                            
//     ├─使用者離開──▶ sleep（睡覺）──使用者回來──▶ react ─▶ idle
//     ├─被點擊────▶ react（開心反應）──時間到──▶ idle
//     └─被拖曳────▶ drag（被拎著）──放開──▶ react ─▶ idle
//
// 所有「什麼時候換狀態」的規則都寫在 update() 裡。
// =============================================================

export type PetState = "idle" | "walk" | "sleep" | "drag" | "react";

/** 使用者的電腦使用狀態（由 activity.ts 判斷） */
export type Activity = "busy" | "idle" | "away";

export interface StateContext {
  activity: Activity;
  walkEnabled: boolean;
}

/** 產生 min～max 之間的亂數（秒） */
const rand = (min: number, max: number) => min + Math.random() * (max - min);

export class PetStateMachine {
  state: PetState = "idle";
  /** 已經在目前狀態待了幾秒 */
  private time = 0;
  /** 目前狀態預計持續幾秒（idle / walk / react 用） */
  private duration = rand(3, 6);

  /** onEnter：進入新狀態時通知外面（例如換動畫） */
  constructor(private onEnter: (state: PetState, prev: PetState) => void) {}

  set(state: PetState, duration?: number): void {
    const prev = this.state;
    this.state = state;
    this.time = 0;
    this.duration =
      duration ??
      { idle: rand(4, 10), walk: rand(2, 5), react: 1.2, sleep: Infinity, drag: Infinity }[state];
    this.onEnter(state, prev);
  }

  update(dt: number, ctx: StateContext): void {
    this.time += dt;

    switch (this.state) {
      case "idle":
      case "walk":
        // 使用者離開電腦 → 去睡覺
        if (ctx.activity === "away") return this.set("sleep");
        if (this.time < this.duration) return;
        if (this.state === "walk") return this.set("idle");
        // 閒置時間到：決定要不要走一走。使用者在忙的時候比較安靜。
        const walkChance = ctx.activity === "busy" ? 0.25 : 0.6;
        if (ctx.walkEnabled && Math.random() < walkChance) this.set("walk");
        else this.set("idle");
        return;

      case "react":
        if (this.time >= this.duration) this.set("idle");
        return;

      case "sleep":
      case "drag":
        // 這兩個狀態由外部結束（wake() / endDrag()）
        return;
    }
  }

  /** 被點擊 */
  react(): void {
    this.set("react");
  }

  /** 叫醒（使用者回來、或被點醒） */
  wake(): void {
    if (this.state === "sleep") this.set("react", 1.5);
  }

  startDrag(): void {
    this.set("drag");
  }

  endDrag(): void {
    if (this.state === "drag") this.set("react", 0.8);
  }
}
