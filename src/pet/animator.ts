// =============================================================
// 精靈圖動畫播放器
// 精靈圖 = 一張大圖切成很多格；manifest.json 說明每個動畫在第幾列、有幾格、每秒幾格。
// =============================================================
import type { SkinManifest } from "../common/api";

export class Animator {
  private ctx: CanvasRenderingContext2D;
  private img = new Image();
  private manifest: SkinManifest | null = null;
  private current = "idle";
  private frame = 0;
  private elapsed = 0;
  /** true = 面向左邊（把圖左右翻轉） */
  flipped = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  /** 換造型；petScale 是使用者設定的大小倍率 */
  async setSkin(manifest: SkinManifest, imageUrl: string, petScale: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      this.img.onload = () => resolve();
      this.img.onerror = () => reject(new Error("精靈圖載入失敗"));
      this.img.src = imageUrl;
    });
    this.manifest = manifest;
    this.canvas.width = manifest.frameWidth;
    this.canvas.height = manifest.frameHeight;
    this.setScale(petScale);
    this.frame = 0;
    this.draw();
  }

  setScale(petScale: number): void {
    if (!this.manifest) return;
    const s = (this.manifest.scale ?? 4) * petScale;
    this.canvas.style.width = `${this.manifest.frameWidth * s}px`;
    this.canvas.style.height = `${this.manifest.frameHeight * s}px`;
  }

  /** 切換動畫；造型沒有這個動畫就退回 idle */
  play(name: string): void {
    const target = this.manifest?.animations[name] ? name : "idle";
    if (target === this.current) return;
    this.current = target;
    this.frame = 0;
    this.elapsed = 0;
    this.draw();
  }

  /** 每一幀呼叫，dt 單位是秒 */
  tick(dt: number): void {
    const anim = this.manifest?.animations[this.current];
    if (!anim) return;
    this.elapsed += dt;
    const perFrame = 1 / anim.fps;
    if (this.elapsed >= perFrame) {
      this.elapsed %= perFrame;
      this.frame = (this.frame + 1) % anim.frames;
    }
    this.draw();
  }

  private draw(): void {
    const m = this.manifest;
    const anim = m?.animations[this.current];
    if (!m || !anim) return;
    const { frameWidth: w, frameHeight: h } = m;
    this.ctx.save();
    this.ctx.clearRect(0, 0, w, h);
    if (this.flipped) {
      this.ctx.translate(w, 0);
      this.ctx.scale(-1, 1);
    }
    this.ctx.drawImage(this.img, this.frame * w, anim.row * h, w, h, 0, 0, w, h);
    this.ctx.restore();
  }
}
