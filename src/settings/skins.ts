// =============================================================
// 角色分頁：列出角色、切換、刪除，以及「角色工作室」
//   方法 1：用圖片做角色（圖片模式）
//   方法 2：建立像素精靈圖範本
//   方法 3：匯入別人分享的角色資料夾
// =============================================================
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { api } from "../common/api";
import { EV } from "../common/events";
import { t } from "../common/i18n";
import type { Settings } from "../common/settings";

/** 可以放圖的動作（idle 必填） */
const SLOTS = ["idle", "walk", "sleep", "drag", "react", "think", "pet", "eat", "sit"];

/** 角色設計手冊的網址（依語言） */
const GUIDE_URL = "https://github.com/kirishimarisano-rgb/table-pet_windows/blob/main/docs/";
const GUIDE_FILE: Record<string, string> = { "zh-TW": "CHARACTER_GUIDE.md", ja: "CHARACTER_GUIDE.ja.md", en: "CHARACTER_GUIDE.en.md" };

export async function setupSkins(settings: Settings, onChanged: () => void): Promise<void> {
  const box = document.getElementById("skin-list")!;

  async function render(): Promise<void> {
    box.innerHTML = "";
    for (const s of await api.listSkins()) {
      const card = document.createElement("div");
      card.className = "card" + (s.id === settings.skin ? " selected" : "");
      card.setAttribute("role", "button");
      const title = document.createElement("strong");
      title.textContent = s.names?.[settings.language] ?? s.name;
      const sub = document.createElement("small");
      sub.textContent = `${s.id}${s.author ? "・" + s.author : ""}`;
      card.append(title, sub);
      card.addEventListener("click", () => api.selectSkin(s.id));

      // 自己加的角色可以刪除
      if (s.user) {
        const del = document.createElement("button");
        del.className = "link card-del";
        del.textContent = t("studio.delete");
        del.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (!confirm(t("studio.deleteConfirm"))) return;
          try {
            await api.deleteSkin(s.id);
            if (settings.skin === s.id) await api.selectSkin("default");
            await api.refreshTray();
            await render();
          } catch (err) {
            alert(String(err));
          }
        });
        card.appendChild(del);
      }
      box.appendChild(card);
    }
  }

  /** 新增或匯入角色之後：重新掃描、切換過去 */
  async function afterAdd(id: string): Promise<void> {
    await api.refreshTray();
    await api.selectSkin(id);
    await render();
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
  document.getElementById("skins-guide")!.addEventListener("click", () =>
    api.openUrl(GUIDE_URL + (GUIDE_FILE[settings.language] ?? GUIDE_FILE["zh-TW"])),
  );

  // ---------- 方法 1：用圖片做角色 ----------
  const chosen: Record<string, string> = {};
  const slotsBox = document.getElementById("studio-images")!;
  for (const anim of SLOTS) {
    const slot = document.createElement("button");
    slot.type = "button";
    slot.className = "slot" + (anim === "idle" ? " required" : "");
    const label = document.createElement("strong");
    label.textContent = t(`anim.${anim}`) + (anim === "idle" ? " *" : "");
    const file = document.createElement("span");
    file.textContent = t("studio.pick");
    slot.append(label, file);
    slot.addEventListener("click", async () => {
      const path = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Image", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
      });
      if (typeof path !== "string") return;
      chosen[anim] = path;
      file.textContent = "✅ " + path.split(/[\\/]/).pop();
    });
    slotsBox.appendChild(slot);
  }

  document.getElementById("studio-create")!.addEventListener("click", async () => {
    const name = (document.getElementById("studio-name") as HTMLInputElement).value.trim();
    const persona = (document.getElementById("studio-persona") as HTMLTextAreaElement).value;
    const bio = (document.getElementById("studio-bio") as HTMLTextAreaElement).value;
    if (!name) return alert(t("studio.needName"));
    if (!chosen.idle) return alert(t("studio.needIdle"));
    try {
      const id = await api.createSkin(name, chosen, persona, bio);
      await afterAdd(id);
      alert(t("studio.created"));
    } catch (e) {
      alert(String(e));
    }
  });

  // ---------- 方法 2：像素範本 ----------
  document.getElementById("studio-template")!.addEventListener("click", async () => {
    try {
      const id = await api.createSkinTemplate();
      await api.refreshTray();
      await render();
      alert(t("studio.templateDone") + id);
    } catch (e) {
      alert(String(e));
    }
  });

  // ---------- 方法 3：匯入資料夾 ----------
  document.getElementById("studio-import")!.addEventListener("click", async () => {
    const path = await open({ directory: true, multiple: false });
    if (typeof path !== "string") return;
    try {
      const id = await api.importSkinFolder(path);
      await afterAdd(id);
      alert(t("studio.imported"));
    } catch (e) {
      alert(String(e));
    }
  });
}
