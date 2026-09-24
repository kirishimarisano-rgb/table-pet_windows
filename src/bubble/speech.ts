// =============================================================
// 台詞泡泡：在角色頭上顯示一句話，幾秒後自動消失
// =============================================================

export class SpeechBubble {
  private timer: number | undefined;

  constructor(private el: HTMLElement) {
    // 點泡泡可以提早關掉
    el.addEventListener("click", () => this.hide());
  }

  /** 顯示文字；ms 不填的話依字數決定停留時間 */
  show(text: string, ms?: number): void {
    this.el.textContent = text;
    this.el.classList.remove("hidden");
    clearTimeout(this.timer);
    const duration = ms ?? Math.min(9000, 2500 + text.length * 150);
    this.timer = window.setTimeout(() => this.hide(), duration);
  }

  hide(): void {
    this.el.classList.add("hidden");
  }

  get visible(): boolean {
    return !this.el.classList.contains("hidden");
  }
}
