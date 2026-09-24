// =============================================================
// 關於分頁：顯示目前角色的圖、名字、介紹和好感度
// =============================================================
import { api } from "../common/api";
import { AFFECTION_LEVELS, affectionLevel, type Stats } from "../common/types";
import type { Settings } from "../common/settings";

export async function renderAbout(settings: Settings): Promise<void> {
  const { manifest, image } = await api.loadSkin(settings.skin);
  const lang = settings.language;
  document.getElementById("about-name")!.textContent = manifest.names?.[lang] ?? manifest.name;
  document.getElementById("about-bio")!.textContent = manifest.bio?.[lang] ?? "";

  // 畫出 idle 的第一格
  const canvas = document.getElementById("about-img") as HTMLCanvasElement;
  const img = new Image();
  img.onload = () => {
    const { frameWidth: w, frameHeight: h } = manifest;
    const row = manifest.animations.idle?.row ?? 0;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w * 4}px`;
    canvas.style.height = `${h * 4}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, row * h, w, h, 0, 0, w, h);
  };
  img.src = image;

  // 好感度：用愛心顯示等級
  const stats = (await api.loadData<Stats>("stats")) ?? { affection: 0 };
  const lv = affectionLevel(stats.affection);
  document.getElementById("about-affection")!.textContent =
    "♥".repeat(lv) + "♡".repeat(AFFECTION_LEVELS.length - 1 - lv) + `（${stats.affection}）`;
}
