// =============================================================
// 點擊穿透
// 桌寵視窗是一個透明的方形，如果不處理，透明的地方也會擋住後面的視窗。
// 做法：每 80 毫秒看一次滑鼠位置，只有滑鼠在「.hit」元素（角色、泡泡）上面時才接收點擊，
// 其他時候讓滑鼠穿透到後面的視窗。
// =============================================================
import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";

const win = getCurrentWindow();

export function startClickThrough(getWindowPos: () => { x: number; y: number }, isLocked: () => boolean): void {
  let ignoring: boolean | null = null;

  setInterval(async () => {
    let inside = true;
    if (!isLocked()) {
      try {
        const cursor = await cursorPosition();
        const pos = getWindowPos();
        const dpr = window.devicePixelRatio || 1;
        const cx = (cursor.x - pos.x) / dpr;
        const cy = (cursor.y - pos.y) / dpr;
        inside = [...document.querySelectorAll<HTMLElement>(".hit")].some((el) => {
          if (el.classList.contains("hidden")) return false;
          const r = el.getBoundingClientRect();
          return cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
        });
      } catch {
        inside = true;
      }
    }
    const shouldIgnore = !inside;
    if (shouldIgnore !== ignoring) {
      ignoring = shouldIgnore;
      await win.setIgnoreCursorEvents(shouldIgnore);
    }
  }, 80);
}
