// =============================================================
// Claude 分頁：輸入／刪除 API 金鑰
// 金鑰送到 Rust 後就存在本機 secrets.json，這個視窗之後也讀不回來。
// =============================================================
import { emit } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { EV } from "../common/events";

export async function setupClaude(): Promise<void> {
  const status = document.getElementById("key-status")!;
  const input = document.getElementById("key-input") as HTMLInputElement;

  async function refresh(): Promise<void> {
    const has = await api.hasApiKey();
    status.textContent = has ? "已設定金鑰 ✅（點柑柑就能聊天）" : "尚未設定（聊天功能已隱藏）";
  }

  document.getElementById("key-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const key = input.value.trim();
    if (!key) return;
    if (!key.startsWith("sk-ant-") && !confirm("這看起來不像 Anthropic 的金鑰（通常以 sk-ant- 開頭），仍要儲存嗎？")) return;
    try {
      await api.setApiKey(key);
      input.value = "";
      await refresh();
      await emit(EV.apiKeyChanged);
    } catch (err) {
      alert(`儲存失敗：${err}`);
    }
  });

  document.getElementById("key-clear")!.addEventListener("click", async () => {
    if (!confirm("確定要刪除金鑰嗎？")) return;
    await api.clearApiKey();
    await refresh();
    await emit(EV.apiKeyChanged);
  });

  await refresh();
}
