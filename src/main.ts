// =============================================================
// 桌寵主視窗：把各個模組接起來
//
//   animator     畫圖
//   stateMachine 決定現在要做什麼（閒置／走路／睡覺／拖曳／反應）
//   movement     移動視窗
//   activity     判斷使用者在忙還是離開
//   lines        台詞
//   pomodoro     番茄鐘
//   reminders    提醒
//   chat         Claude 對話（沒金鑰時隱藏）
// =============================================================
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { api } from "./common/api";
import { EV } from "./common/events";
import { Lines } from "./common/lines";
import { loadSettings, type Settings } from "./common/settings";
import { Animator } from "./pet/animator";
import { PetStateMachine, type PetState } from "./pet/stateMachine";
import { Mover } from "./pet/movement";
import { startClickThrough } from "./pet/clickthrough";
import { ActivityMonitor } from "./pet/activity";
import { Pomodoro, formatTime, type PomoStatus } from "./pet/pomodoro";
import { startReminderCheck } from "./pet/reminders";
import { SpeechBubble } from "./bubble/speech";
import { ChatPanel } from "./bubble/chat";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------- 模組 ----------
let settings: Settings;
const lines = new Lines();
const animator = new Animator($("pet"));
const mover = new Mover();
const speech = new SpeechBubble($("bubble"));
const pomoBadge = $("pomo");

const sm = new PetStateMachine((state: PetState) => {
  animator.play(state);
  if (state === "walk") mover.randomizeDirection();
});

const activity = new ActivityMonitor((next, prev) => {
  if (next === "away") {
    sm.set("sleep");
  } else if (prev === "away") {
    // 使用者回來了
    sm.wake();
    say("away_return");
  }
});

let chatAllowed = false;
const chat = new ChatPanel($("chat"), {
  onThinking: () => sm.set("idle"),
  onReply: () => sm.react(),
});

const pomodoro = new Pomodoro(
  (s) => showPomodoro(s),
  (finished) => {
    if (finished === "work") {
      say("pomodoro_break");
      notify("番茄鐘", "專注時間結束，休息一下吧喵～");
      sm.react();
      if (settings.pomodoro.autoBreak) pomodoro.start("break", settings.pomodoro.breakMin);
    } else {
      say("pomodoro_break_end");
      notify("番茄鐘", "休息結束囉喵！");
    }
  },
);

// ---------- 說話 ----------
let lastTalk = Date.now();

/** 說一句某分類的台詞；聊天視窗開著時不插嘴 */
function say(category: string, suffix = ""): void {
  if (chat.isOpen) return;
  const line = category === "greeting" ? lines.greeting() : lines.pick(category);
  if (!line) return;
  speech.show(line + suffix);
  lastTalk = Date.now();
}

/** 定期自言自語 */
function autoTalk(): void {
  if (settings.talkIntervalMin <= 0) return;
  if (sm.state === "sleep" || sm.state === "drag" || speech.visible || chat.isOpen) return;
  if (Date.now() - lastTalk < settings.talkIntervalMin * 60_000) return;
  if (Lines.isLateNight() && Math.random() < 0.6) say("late_night");
  else say(activity.level === "busy" ? "busy" : "idle");
}

// ---------- 系統通知 ----------
async function notify(title: string, body: string): Promise<void> {
  try {
    let ok = await isPermissionGranted();
    if (!ok) ok = (await requestPermission()) === "granted";
    if (ok) sendNotification({ title, body });
  } catch (e) {
    console.warn("無法送出通知", e);
  }
}

// ---------- 番茄鐘小標籤 ----------
function showPomodoro(s: PomoStatus): void {
  if (s.phase === "off") {
    pomoBadge.classList.add("hidden");
  } else {
    pomoBadge.classList.remove("hidden");
    pomoBadge.textContent = `${s.phase === "work" ? "🍊" : "☕"} ${formatTime(s.remainingSec)}`;
    pomoBadge.classList.toggle("break", s.phase === "break");
  }
  void emit(EV.pomodoroStatus, s);
}

function pomodoroCommand(cmd: string): void {
  if (cmd === "work") {
    pomodoro.start("work", settings.pomodoro.workMin);
    sm.react();
    say("pomodoro_start");
  } else if (cmd === "break") {
    pomodoro.start("break", settings.pomodoro.breakMin);
    say("pomodoro_break");
  } else if (cmd === "stop") {
    pomodoro.stop();
  } else if (cmd === "status") {
    showPomodoro(pomodoro.status());
  }
}

// ---------- 點擊與拖曳 ----------
function setupPointer(canvas: HTMLElement): void {
  let down: { sx: number; sy: number; wx: number; wy: number } | null = null;
  let dragging = false;

  canvas.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    canvas.setPointerCapture(e.pointerId);
    down = { sx: e.screenX, sy: e.screenY, wx: mover.x, wy: mover.y };
    dragging = false;
  });

  canvas.addEventListener("pointermove", (e) => {
    if (!down) return;
    // screenX 是 CSS 像素，要乘上縮放比例換成實體像素
    const dpr = window.devicePixelRatio || 1;
    const dx = (e.screenX - down.sx) * dpr;
    const dy = (e.screenY - down.sy) * dpr;
    if (!dragging && Math.hypot(dx, dy) > 5 * dpr) {
      dragging = true;
      sm.startDrag();
      say("drag");
    }
    if (dragging) mover.moveTo(down.wx + dx, down.wy + dy);
  });

  canvas.addEventListener("pointerup", async () => {
    if (!down) return;
    down = null;
    if (dragging) {
      dragging = false;
      sm.endDrag();
      say("drop");
      await mover.settle();
    } else {
      onClick();
    }
  });

  // 右鍵：打開設定
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    void api.openSettings();
  });

  isDragging = () => down !== null;
}
let isDragging = () => false;

function onClick(): void {
  if (sm.state === "sleep") {
    sm.wake();
    say("away_return");
    return;
  }
  sm.react();
  if (chatAllowed) {
    chat.toggle();
    if (chat.isOpen) {
      speech.hide();
      void getCurrentWindow().setFocus();
    }
  } else {
    say("click");
  }
}

// ---------- 讀取設定、造型、金鑰 ----------
async function applySkin(id: string): Promise<void> {
  try {
    const skin = await api.loadSkin(id);
    await animator.setSkin(skin.manifest, skin.image, settings.petScale);
  } catch (e) {
    speech.show(`造型載入失敗喵：${e}`);
  }
}

async function reloadSettings(): Promise<void> {
  const prevSkin = settings?.skin;
  const prevScale = settings?.petScale;
  settings = await loadSettings();
  activity.thresholds = { ...settings.activity };
  if (settings.skin !== prevSkin) await applySkin(settings.skin);
  else if (settings.petScale !== prevScale) animator.setScale(settings.petScale);
  await refreshChatAvailability();
}

/** 沒有金鑰（或關掉功能）→ 對話泡泡完全隱藏 */
async function refreshChatAvailability(): Promise<void> {
  const hasKey = await api.hasApiKey().catch(() => false);
  chatAllowed = hasKey && settings.claude.enabled;
  if (!chatAllowed) chat.reset();
}

// ---------- 主迴圈 ----------
function loop(): void {
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    sm.update(dt, { activity: activity.level, walkEnabled: settings.walkEnabled && !chat.isOpen });
    if (sm.state === "walk") mover.step(dt);
    animator.flipped = sm.state === "walk" ? mover.dir > 0 : animator.flipped;
    animator.tick(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------- 啟動 ----------
async function main(): Promise<void> {
  settings = await loadSettings();
  activity.thresholds = { ...settings.activity };
  await Promise.all([lines.load(), applySkin(settings.skin), mover.init(), refreshChatAvailability()]);

  setupPointer($("pet"));
  startClickThrough(() => ({ x: mover.x, y: mover.y }), () => isDragging() || chat.isOpen);
  activity.start();
  startReminderCheck((r) => {
    const prefix = lines.pick("reminder") ?? "提醒：";
    sm.wake();
    sm.react();
    speech.show(`${prefix}${r.text}`, 15000);
    lastTalk = Date.now();
    void notify("柑柑提醒你", r.text);
  });
  setInterval(autoTalk, 20_000);
  loop();

  // 打招呼
  setTimeout(() => (Lines.isLateNight() ? say("late_night") : say("greeting")), 800);

  // ---------- 其他視窗／托盤送來的事件 ----------
  await listen(EV.settingsChanged, () => void reloadSettings());
  await listen<string>(EV.skinChanged, async (e) => {
    settings.skin = e.payload;
    await applySkin(e.payload);
    sm.react();
  });
  await listen<string>(EV.petSay, (e) => {
    sm.wake();
    sm.react();
    say(e.payload);
  });
  await listen<{ allDone: boolean }>(EV.todoDone, (e) => {
    sm.wake();
    sm.react();
    say(e.payload.allDone ? "todo_all_done" : "todo_done");
  });
  await listen<string>(EV.pomodoroCommand, (e) => pomodoroCommand(e.payload));
  await listen(EV.apiKeyChanged, () => void refreshChatAvailability());
  await listen(EV.linesChanged, () => void lines.load());
}

main().catch((e) => {
  console.error(e);
  speech.show(`啟動失敗喵：${e}`, 60000);
});
