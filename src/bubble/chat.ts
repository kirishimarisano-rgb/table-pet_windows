// =============================================================
// 對話泡泡，有兩種模式：
//   api     ：有 API 金鑰 → 直接跟角色聊天（角色也能幫你新增待辦、設提醒、開番茄鐘）
//   handoff ：沒有金鑰但開啟了「Claude app 聯動」→ 輸入問題後在 Claude 開新對話
// 對話紀錄只放在記憶體裡，關掉程式就消失，不會存檔。
// =============================================================
import { api, type ChatMessage, type ChatReply } from "../common/api";
import { t } from "../common/i18n";

/** 最多帶幾則歷史訊息給 Claude（太多會變慢、變貴） */
const MAX_HISTORY = 12;

export type ChatMode = "api" | "handoff";

export interface ChatHooks {
  /** 送出前呼叫，回傳給 Claude 的即時資訊（時間、待辦…） */
  getContext: () => string;
  onThinking: () => void;
  onReply: (r: ChatReply) => void;
  onError: () => void;
}

export class ChatPanel {
  mode: ChatMode = "api";
  private history: ChatMessage[] = [];
  private log: HTMLElement;
  private input: HTMLInputElement;
  private claudeBtn: HTMLButtonElement;
  private sending = false;

  constructor(private el: HTMLElement, private hooks: ChatHooks) {
    this.log = el.querySelector(".chat-log")!;
    this.input = el.querySelector("input")!;
    this.claudeBtn = el.querySelector(".chat-claude")!;
    el.querySelector("form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.send();
    });
    el.querySelector(".chat-close")!.addEventListener("click", () => this.close());
    this.claudeBtn.addEventListener("click", () => this.continueInClaude());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }

  get isOpen(): boolean {
    return !this.el.classList.contains("hidden");
  }

  open(): void {
    this.el.classList.remove("hidden");
    // 「在 Claude 繼續」只在 API 模式、而且已經聊過天時顯示
    this.claudeBtn.classList.toggle("hidden", this.mode !== "api" || this.history.length === 0);
    if (this.log.childElementCount === 0) {
      this.addLine("assistant", t(this.mode === "api" ? "chat.hello" : "handoff.hello"));
    }
    this.input.focus();
  }

  close(): void {
    this.el.classList.add("hidden");
  }

  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  /** 清空對話（換模式、換角色、刪金鑰時） */
  reset(): void {
    this.history = [];
    this.log.innerHTML = "";
    this.close();
  }

  /** 換語言時更新按鈕文字 */
  relabel(): void {
    this.input.placeholder = t("chat.placeholder");
    this.el.querySelector<HTMLButtonElement>("button[type=submit]")!.textContent = t("chat.send");
    this.claudeBtn.textContent = "↗ " + t("chat.openInClaude");
  }

  private addLine(role: "user" | "assistant" | "error", text: string): HTMLElement {
    const div = document.createElement("div");
    div.className = `chat-line ${role}`;
    div.textContent = text;
    this.log.appendChild(div);
    this.log.scrollTop = this.log.scrollHeight;
    return div;
  }

  /** 把目前的對話帶到 Claude 繼續聊（網址長度有限，只帶最近的內容） */
  private continueInClaude(): void {
    const transcript = this.history
      .map((m) => `${m.role === "user" ? "Me" : "Pet"}: ${m.content}`)
      .join("\n")
      .slice(-1500);
    void api.openInClaude(transcript);
  }

  private async send(): Promise<void> {
    const text = this.input.value.trim();
    if (!text || this.sending) return;
    this.input.value = "";

    if (this.mode === "handoff") {
      this.addLine("user", text);
      await api.openInClaude(text).catch((e) => this.addLine("error", String(e)));
      return;
    }

    this.sending = true;
    this.addLine("user", text);
    this.history.push({ role: "user", content: text });
    const waiting = this.addLine("assistant", t("chat.thinking"));
    this.hooks.onThinking();

    try {
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
      const r = await api.claudeChat(this.history.slice(-MAX_HISTORY), this.hooks.getContext(), localIso);
      this.history.push({ role: "assistant", content: r.reply });
      waiting.textContent = r.reply;
      this.claudeBtn.classList.remove("hidden");
      this.hooks.onReply(r);
    } catch (e) {
      // 失敗的話，把剛剛那句從歷史拿掉，下次可以重送
      this.history.pop();
      waiting.className = "chat-line error";
      waiting.textContent = String(e);
      this.hooks.onError();
    } finally {
      this.sending = false;
      this.log.scrollTop = this.log.scrollHeight;
      this.input.focus();
    }
  }
}
