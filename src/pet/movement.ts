// =============================================================
// 移動：讓整個透明視窗在螢幕上走動、被拖曳、跳上其他視窗、掉下來
// 這裡的座標全部是「實體像素」（physical pixel），和 Windows 螢幕縮放無關。
//
// 角色站的地方有兩種：
//   地面：螢幕最下面（工作列上方）
//   視窗：坐在某個視窗的上緣（perch），視窗移動會跟著走，關掉／最小化就掉下來
// =============================================================
import { invoke } from "@tauri-apps/api/core";
import { currentMonitor, getCurrentWindow, PhysicalPosition } from "@tauri-apps/api/window";

const win = getCurrentWindow();

export interface WinRect {
  id: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** 精靈圖底部通常有幾格透明，往下補一點讓腳剛好踩在邊上（CSS 像素） */
const FOOT_PAD = 6;

export class Mover {
  x = 0;
  y = 0;
  /** 1 = 往右走，-1 = 往左走 */
  dir: 1 | -1 = -1;
  /** 正在坐的視窗；null = 在地面 */
  perch: WinRect | null = null;
  /** 正在跳躍或掉落（這時不要走路） */
  airborne = false;
  private width = 0;
  private height = 0;
  private bounds = { left: 0, top: 0, right: 1920, bottom: 1080 };
  private scale = 1;

  /** 啟動時：把角色放在螢幕右下角（工作列上面） */
  async init(): Promise<void> {
    const size = await win.outerSize();
    this.width = size.width;
    this.height = size.height;
    await this.refreshBounds();
    this.x = this.bounds.right - this.width - 40 * this.scale;
    this.y = this.groundY();
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

  /** 站在地面時的 y */
  groundY(): number {
    return this.bounds.bottom - this.height;
  }

  /** 坐在某個視窗上時的 y */
  private perchY(r: WinRect): number {
    return r.top - this.height + FOOT_PAD * this.scale;
  }

  /** 目前可以走動的左右範圍（角色本體比視窗窄，所以兩側可以超出一點） */
  private walkRange(): [number, number] {
    const slack = this.width * 0.3;
    if (this.perch) return [this.perch.left - slack, this.perch.right - this.width + slack];
    return [this.bounds.left, this.bounds.right - this.width];
  }

  /** 走一步，dt 單位是秒；碰到邊緣就轉身 */
  step(dt: number): void {
    if (this.airborne) return;
    const speed = 40 * this.scale; // 每秒 40 個邏輯像素
    this.x += this.dir * speed * dt;
    const [minX, maxX] = this.walkRange();
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
    this.perch = null;
    this.x = x;
    this.y = y;
    void this.apply();
  }

  // ---------- 坐在視窗上 ----------

  /** 看看前景視窗能不能坐（上方要有空間） */
  async findPerch(): Promise<WinRect | null> {
    const r = await invoke<WinRect | null>("perch_target").catch(() => null);
    if (!r) return null;
    if (r.top - this.height < this.bounds.top) return null; // 視窗太高，上面沒位置
    if (r.top > this.groundY() - 40 * this.scale) return null; // 視窗太低，跟地面差不多
    return r;
  }

  /** 跳到視窗上緣（拋物線） */
  async jumpOnto(r: WinRect): Promise<void> {
    const [minX, maxX] = [r.left, r.right - this.width];
    const tx = Math.min(Math.max(this.x, minX), maxX);
    this.perch = r;
    await this.animateTo(tx, this.perchY(r), 0.7, 80 * this.scale);
  }

  /**
   * 坐在視窗上時定期呼叫：視窗移動就跟著移動；
   * 視窗不見了（關掉、最小化、最大化）就回傳 false，由外面決定要掉下來
   */
  async followPerch(): Promise<boolean> {
    if (!this.perch || this.airborne) return true;
    const r = await invoke<WinRect | null>("perch_window", { id: this.perch.id }).catch(() => null);
    if (!r) return false;
    const dx = r.left - this.perch.left;
    this.perch = r;
    this.x += dx;
    this.y = this.perchY(r);
    await this.apply();
    return true;
  }

  /**
   * 掉下來：有重力的落下動畫。
   * landOn 有給的話（例如放開時剛好在某個視窗上方），就落在那個視窗上。
   */
  async fall(landOn: WinRect | null = null): Promise<void> {
    await this.refreshBounds();
    this.perch = landOn;
    const targetY = landOn ? this.perchY(landOn) : this.groundY();
    this.airborne = true;
    let vy = 0;
    const g = 2400 * this.scale; // 重力加速度（像素／秒²）
    let last = performance.now();
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        vy += g * dt;
        this.y += vy * dt;
        if (this.y >= targetY) {
          this.y = targetY;
          void this.apply();
          return resolve();
        }
        void this.apply();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    this.x = Math.min(Math.max(this.x, this.walkRange()[0]), this.walkRange()[1]);
    await this.apply();
    this.airborne = false;
  }

  /** 放開後：底下有視窗就落在視窗上，否則掉到地面 */
  async land(): Promise<void> {
    await this.refreshBounds();
    this.x = Math.min(Math.max(this.x, this.bounds.left), this.bounds.right - this.width);
    this.y = Math.max(this.y, this.bounds.top);
    const r = await invoke<WinRect | null>("perch_target").catch(() => null);
    const feetY = this.y + this.height;
    const centerX = this.x + this.width / 2;
    const above = r && centerX > r.left && centerX < r.right && feetY <= r.top + 20 * this.scale;
    await this.fall(above ? r : null);
  }

  /** 拋物線移動到 (tx, ty)，arc 是往上拱的高度 */
  private async animateTo(tx: number, ty: number, seconds: number, arc: number): Promise<void> {
    const sx = this.x, sy = this.y;
    const start = performance.now();
    this.airborne = true;
    await new Promise<void>((resolve) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / (seconds * 1000));
        this.x = sx + (tx - sx) * t;
        this.y = sy + (ty - sy) * t - Math.sin(Math.PI * t) * arc;
        void this.apply();
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    this.airborne = false;
  }

  private lastApplied = { x: NaN, y: NaN };
  private async apply(): Promise<void> {
    const x = Math.round(this.x), y = Math.round(this.y);
    if (x === this.lastApplied.x && y === this.lastApplied.y) return;
    this.lastApplied = { x, y };
    await win.setPosition(new PhysicalPosition(x, y));
  }
}
