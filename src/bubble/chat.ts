// =============================================================
// Claude 對話泡泡
// 只有在「已設定 API 金鑰」而且「設定裡有開啟」時才會出現。
// 對話紀錄只放在記憶體裡，關掉程式就消失，不會存檔。
// =============================================================
import { api, type ChatMessage } from "../common/api";

/** 最多帶幾則歷史訊息給 Claude（太多會變慢、變貴） */
const MAX_HISTORY = 12;

export class ChatPanel {
  private history: ChatMessage[] = [];
  private log: HTMLElement;
  private input: HTMLInputElement;
  private sending = false;

  constructor(
    private el: HTMLElement,
    private hooks: { onThinking: () => void; onReply: () => void },
  ) {
    this.log = el.querySelector(".chat-log")!;
    this.input = el.querySelector("input")!;
    el.querySelector("form")!.addEventListener("submit", (e) => {
      e.preventDefault();
      void this.send();
    });
    el.querySelector(".chat-close")!.addEventListener("click", () => this.close());
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  }

  get isOpen(): boolean {
    return !this.el.classList.contains("hidden");
  }

  open(): void {
    this.el.classList.remove("hidden");
    if (this.history.length === 0) this.addLine("assistant", "想跟柑柑聊什麼喵？");
    this.input.focus();
  }

  close(): void {
    this.el.classList.add("hidden");
  }

  toggle(): void {
    this.isOpen ? this.close() : this.open();
  }

  /** 清空對話（例如金鑰被刪掉時） */
  reset(): void {
    this.history = [];
    this.log.innerHTML = "";
    this.close();
  }

  private addLine(role: "user" | "assistant" | "error", text: string): HTMLElement {
    const div = document.createElement("div");
    div.className = `chat-line ${role}`;
    div.textContent = text;
    this.log.appendChild(div);
    this.log.scrollTop = this.log.scrollHeight;
    return div;
  }

  private async send(): Promise<void> {
    const text = this.input.value.trim();
    if (!text || this.sending) return;
    this.input.value = "";
    this.sending = true;

    this.addLine("user", text);
    this.history.push({ role: "user", content: text });
    const waiting = this.addLine("assistant", "（柑柑思考中⋯）");
    this.hooks.onThinking();

    try {
      const reply = await api.claudeChat(this.history.slice(-MAX_HISTORY));
      this.history.push({ role: "assistant", content: reply });
      waiting.textContent = reply;
      this.hooks.onReply();
    } catch (e) {
      // 失敗的話，把剛剛那句從歷史拿掉，下次可以重送
      this.history.pop();
      waiting.className = "chat-line error";
      waiting.textContent = String(e);
    } finally {
      this.sending = false;
      this.log.scrollTop = this.log.scrollHeight;
      this.input.focus();
    }
  }
}
