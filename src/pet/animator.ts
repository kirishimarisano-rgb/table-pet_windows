// =============================================================
// 角色動畫播放器，支援兩種角色：
//
//   精靈圖模式（預設）：一張大圖切成很多格，manifest.json 說明每個動畫在第幾列、有幾格、每秒幾格。
//   圖片模式（mode: "image"）：每個動作一張圖（最少只要 idle 一張），
//                              由程式加上上下彈跳、搖晃、壓扁、小表情符號等效果讓它動起來。
//
// 造型沒有的動作會自動用相近的動作代替（見 FALLBACK）。
// =============================================================
import type { SkinManifest } from "../common/api";

/** 動作不存在時，改用哪個動作 */
const FALLBACK: Record<string, string> = {
  pet: "react",
  eat: "react",
  wave: "react",
  sit: "idle",
  think: "idle",
};

export class Animator {
  private ctx: CanvasRenderingContext2D;
  private manifest: SkinManifest | null = null;
  /** 精靈圖模式：整張大圖；圖片模式：各動作的圖 */
  private sheet = new Image();
  private images: Record<string, HTMLImageElement> = {};
  private current = "idle";
  private frame = 0;
  private elapsed = 0;
  /** 圖片模式用：這個動作已經播了幾秒 */
  private time = 0;
  /** true = 面向左邊（把圖左右翻轉） */
  flipped = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  private get imageMode(): boolean {
    return this.manifest?.mode === "image";
  }

  /** 換造型；images 是各動作的圖片（data URL），petScale 是使用者設定的大小倍率 */
  async setSkin(manifest: SkinManifest, images: Record<string, string>, petScale: number): Promise<void> {
    const load = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("圖片載入失敗"));
        img.src = src;
      });

    this.manifest = manifest;
    this.images = {};
    if (manifest.mode === "image") {
      for (const [name, src] of Object.entries(images)) this.images[name] = await load(src);
      if (!this.images.idle) throw new Error("圖片模式至少需要 idle 圖片");
      // 畫布大小跟著 idle 圖，四周留一點空間給彈跳和小表情
      const idle = this.images.idle;
      this.canvas.width = Math.round(idle.naturalWidth * 1.4);
      this.canvas.height = Math.round(idle.naturalHeight * 1.3);
    } else {
      this.sheet = await load(images.sheet);
      this.canvas.width = manifest.frameWidth;
      this.canvas.height = manifest.frameHeight;
    }
    this.canvas.style.imageRendering = (manifest.pixelated ?? manifest.mode !== "image") ? "pixelated" : "auto";
    this.setScale(petScale);
    this.frame = 0;
    this.draw();
  }

  setScale(petScale: number): void {
    const m = this.manifest;
    if (!m) return;
    if (m.mode === "image") {
      // 圖片模式：用 height 指定角色在畫面上的高度（CSS 像素）
      const h = (m.height ?? 128) * petScale;
      const ratio = this.canvas.width / this.canvas.height;
      this.canvas.style.height = `${h * 1.3}px`;
      this.canvas.style.width = `${h * 1.3 * ratio}px`;
    } else {
      const s = (m.scale ?? 4) * petScale;
      this.canvas.style.width = `${m.frameWidth * s}px`;
      this.canvas.style.height = `${m.frameHeight * s}px`;
    }
  }

  /** 這個造型有沒有某個動作（圖片模式全部都有） */
  has(name: string): boolean {
    return this.imageMode || Boolean(this.manifest?.animations?.[name]);
  }

  /** 切換動作；沒有就依序找替代動作，最後退回 idle */
  play(name: string): void {
    let target = name;
    while (!this.has(target) && FALLBACK[target]) target = FALLBACK[target];
    if (!this.has(target)) target = "idle";
    if (target === this.current) return;
    this.current = target;
    this.frame = 0;
    this.elapsed = 0;
    this.time = 0;
    this.draw();
  }

  get animation(): string {
    return this.current;
  }

  /** 每一幀呼叫，dt 單位是秒 */
  tick(dt: number): void {
    this.time += dt;
    if (!this.imageMode) {
      const anim = this.manifest?.animations?.[this.current];
      if (!anim) return;
      this.elapsed += dt;
      const perFrame = 1 / anim.fps;
      if (this.elapsed >= perFrame) {
        this.elapsed %= perFrame;
        this.frame = (this.frame + 1) % anim.frames;
      }
    }
    this.draw();
  }

  private draw(): void {
    if (!this.manifest) return;
    if (this.imageMode) this.drawImageMode();
    else this.drawSprite();
  }

  private drawSprite(): void {
    const m = this.manifest!;
    const anim = m.animations[this.current];
    if (!anim) return;
    const { frameWidth: w, frameHeight: h } = m;
    this.ctx.save();
    this.ctx.clearRect(0, 0, w, h);
    if (this.flipped) {
      this.ctx.translate(w, 0);
      this.ctx.scale(-1, 1);
    }
    this.ctx.drawImage(this.sheet, this.frame * w, anim.row * h, w, h, 0, 0, w, h);
    this.ctx.restore();
  }

  /** 圖片模式：用程式算出彈跳、搖晃、壓扁的效果 */
  private drawImageMode(): void {
    const img = this.images[this.current] ?? this.images.idle;
    const { width: cw, height: ch } = this.canvas;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const t = this.time;
    const unit = ih / 100; // 效果的大小跟圖片高度成比例

    let dy = 0, rot = 0, sx = 1, sy = 1;
    let emoji = "";
    switch (this.current) {
      case "idle": case "sit":
        sy = 1 + Math.sin(t * 2.2) * 0.015; // 呼吸
        dy = Math.sin(t * 2.2) * unit * 0.8;
        break;
      case "walk":
        dy = -Math.abs(Math.sin(t * 8)) * unit * 5;
        rot = Math.sin(t * 8) * 0.05;
        break;
      case "sleep":
        sy = 0.96 + Math.sin(t * 1.2) * 0.015;
        emoji = "💤";
        break;
      case "drag":
        rot = Math.sin(t * 7) * 0.14;
        sy = 1.05;
        emoji = "💦";
        break;
      case "react": case "wave":
        dy = -Math.abs(Math.sin(t * 7)) * unit * 10;
        sx = sy = 1 + Math.abs(Math.sin(t * 7)) * 0.03;
        emoji = "✨";
        break;
      case "think":
        rot = -0.08;
        emoji = "💭";
        break;
      case "pet":
        sy = 0.94 + Math.abs(Math.sin(t * 6)) * 0.06;
        sx = 1.04 - Math.abs(Math.sin(t * 6)) * 0.04;
        emoji = "💕";
        break;
      case "eat":
        dy = -Math.abs(Math.sin(t * 10)) * unit * 2;
        emoji = "🍪";
        break;
    }

    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, cw, ch);
    // 以腳底中間為基準點做變形，壓扁時才會像站在地上
    ctx.translate(cw / 2, ch - (ch - ih) * 0.15 + dy);
    ctx.rotate(rot);
    ctx.scale(this.flipped ? -sx : sx, sy);
    ctx.drawImage(img, -iw / 2, -ih, iw, ih);
    ctx.restore();

    if (emoji) {
      const size = Math.round(ih * 0.2);
      ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
      ctx.globalAlpha = 0.6 + Math.sin(t * 4) * 0.4;
      ctx.fillText(emoji, cw * 0.72, size * 1.1 + Math.sin(t * 3) * unit * 2);
      ctx.globalAlpha = 1;
    }
  }
}
