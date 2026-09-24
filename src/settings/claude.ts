// =============================================================
// Claude 分頁：輸入／刪除 API 金鑰
// 金鑰送到 Rust 後就存在本機 secrets.json，這個視窗之後也讀不回來。
// =============================================================
import { emit } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { t } from "../common/i18n";
import { EV } from "../common/events";

export async function setupClaude(): Promise<void> {
  const status = document.getElementById("key-status")!;
  const input = document.getElementById("key-input") as HTMLInputElement;

  async function refresh(): Promise<void> {
    const has = await api.hasApiKey();
    status.textContent = has ? "✅ " + t("claude.hasKey") : t("claude.noKey");
  }

  document.getElementById("key-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = input.value.trim();
    if (!key) return;
    if (!key.startsWith("sk-ant-") && !confirm(t("claude.notAntKey"))) return;
    try {
      await api.setApiKey(key);
      input.value = "";
      await refresh();
      await emit(EV.apiKeyChanged);
    } catch (err) {
      alert(t("claude.saveFailed") + err);
    }
  });

  document.getElementById("key-clear")!.addEventListener("click", async () => {
    if (!confirm(t("claude.clearConfirm"))) return;
    await api.clearApiKey();
    await refresh();
    await emit(EV.apiKeyChanged);
  });

  document.getElementById("open-claude")!.addEventListener("click", () => api.openInClaude(""));
  await refresh();
}
