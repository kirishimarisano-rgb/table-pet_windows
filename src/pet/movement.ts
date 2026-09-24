// =============================================================
// 移動：讓整個透明視窗在螢幕上走動、被拖曳
// 這裡的座標全部是「實體像素」（physical pixel），和 Windows 螢幕縮放無關。
// =============================================================
import { currentMonitor, getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";

const win = getCurrentWindow();

export class Mover {
  x = 0;
  y = 0;
  /** 1 = 往右走，-1 = 往左走 */
  dir: 1 | -1 = -1;
  private width = 0;
  private height = 0;
  private bounds = { left: 0, top: 0, right: 1920, bottom: 1080 };
  private scale = 1;

  /** 啟動時：把柑柑放在螢幕右下角（工作列上面） */
  async init(): Promise<void> {
    const size = await win.outerSize();
    this.width = size.width;
    this.height = size.height;
    await this.refreshBounds();
    this.x = this.bounds.right - this.width - 40 * this.scale;
    this.y = this.bounds.bottom - this.height;
    await this.apply();
  }

  /** 重新讀取目前螢幕的可用範圍（扣掉工作列） */
  async refreshBounds(): Promise<void> {
    const m = await currentMonitor();
    if (!m) return;
    const { position: p, size: s } = m.workArea;
    this.bounds = { left: p.x, top: p.y, right: p.x + s.width, bottom: p.y + s.height };
    this.scale = m.scaleFactor;
  }

  /** 走一步，dt 單位是秒；碰到螢幕邊緣就轉身 */
  step(dt: number): void {
    const speed = 40 * this.scale; // 每秒 40 個邏輯像素
    this.x += this.dir * speed * dt;
    const minX = this.bounds.left;
    const maxX = this.bounds.right - this.width;
    if (this.x <= minX) { this.x = minX; this.dir = 1; }
    if (this.x >= maxX) { this.x = maxX; this.dir = -1; }
    void this.apply();
  }

  /** 走路前隨機決定方向 */
  randomizeDirection(): void {
    this.dir = Math.random() < 0.5 ? -1 : 1;
  }

  /** 拖曳時直接移到指定位置 */
  moveTo(x: number, y: number): void {
    this.x = x;
    this.y = y;
    void this.apply();
  }

  /** 放開後：確保柑柑沒有掉到螢幕外面 */
  async settle(): Promise<void> {
    await this.refreshBounds();
    this.x = Math.min(Math.max(this.x, this.bounds.left), this.bounds.right - this.width);
    this.y = Math.min(Math.max(this.y, this.bounds.top), this.bounds.bottom - this.height);
    await this.apply();
  }

  private lastApplied = { x: NaN, y: NaN };
  private async apply(): Promise<void> {
    const x = Math.round(this.x), y = Math.round(this.y);
    if (x === this.lastApplied.x && y === this.lastApplied.y) return;
    this.lastApplied = { x, y };
    await win.setPosition(new PhysicalPosition(x, y));
  }
}
