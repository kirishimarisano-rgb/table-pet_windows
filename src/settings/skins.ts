// =============================================================
// 造型分頁：列出造型、切換、開啟造型資料夾
// =============================================================
import { listen } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { EV } from "../common/events";
import type { Settings } from "../common/settings";

export async function setupSkins(settings: Settings): Promise<void> {
  const box = document.getElementById("skin-list")!;
  let current = settings.skin;

  async function render(): Promise<void> {
    box.innerHTML = "";
    for (const s of await api.listSkins()) {
      const card = document.createElement("button");
      card.className = "card" + (s.id === current ? " selected" : "");
      const title = document.createElement("strong");
      title.textContent = s.name;
      const sub = document.createElement("small");
      sub.textContent = `${s.id}${s.author ? "・" + s.author : ""}`;
      card.append(title, sub);
      card.addEventListener("click", () => api.selectSkin(s.id));
      box.appendChild(card);
    }
  }

  await render();
  // 不管是從這裡還是托盤切換，都更新選取狀態
  await listen<string>(EV.skinChanged, async (e) => {
    current = e.payload;
    settings.skin = e.payload;
    await render();
  });
  document.getElementById("skins-open")!.addEventListener("click", () => api.openDataDir("skins"));
  document.getElementById("skins-reload")!.addEventListener("click", async () => {
    await api.refreshTray();
    await render();
  });
}
