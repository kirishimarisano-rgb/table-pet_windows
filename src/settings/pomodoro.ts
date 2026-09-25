// =============================================================
// 番茄鐘面板：顯示桌寵視窗回報的時間，按鈕送指令過去
// =============================================================
import { emit, listen } from "@tauri-apps/api/event";
import { EV } from "../common/events";
import { t } from "../common/i18n";
import { formatTime, type PomoStatus } from "../pet/pomodoro";

const PHASE_TEXT = { off: "pomo.off", work: "pomo.work", break: "pomo.break" };

export async function setupPomodoro(): Promise<void> {
  const display = document.getElementById("pomo-display")!;
  const phase = document.getElementById("pomo-phase")!;
  phase.textContent = t("pomo.off");

  await listen<PomoStatus>(EV.pomodoroStatus, (e) => {
    const s = e.payload;
    display.textContent = s.phase === "off" ? "--:--" : formatTime(s.remainingSec);
    phase.textContent = t(PHASE_TEXT[s.phase]);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-pomo]").forEach((btn) =>
    btn.addEventListener("click", () => emit(EV.pomodoroCommand, btn.dataset.pomo)),
  );

  // 一打開就問目前狀態
  await emit(EV.pomodoroCommand, "status");
}
