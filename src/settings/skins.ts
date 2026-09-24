// =============================================================
// 角色分頁：列出角色、切換、開啟角色資料夾
// =============================================================
import { listen } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { EV } from "../common/events";
import type { Settings } from "../common/settings";

export async function setupSkins(settings: Settings, onChanged: () => void): Promise<void> {
  const box = document.getElementById("skin-list")!;

  async function render(): Promise<void> {
    box.innerHTML = "";
    for (const s of await api.listSkins()) {
      const card = document.createElement("button");
      card.className = "card" + (s.id === settings.skin ? " selected" : "");
      const title = document.createElement("strong");
      title.textContent = s.names?.[settings.language] ?? s.name;
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
    settings.skin = e.payload;
    await render();
    onChanged();
  });
  document.getElementById("skins-open")!.addEventListener("click", () => api.openDataDir("skins"));
  document.getElementById("skins-reload")!.addEventListener("click", async () => {
    await api.refreshTray();
    await render();
  });
}
