// =============================================================
// 桌寵主視窗：把各個模組接起來
//
//   animator     畫圖
//   stateMachine 決定現在要做什麼（閒置／走路／睡覺／拖曳／反應／思考）
//   movement     移動視窗
//   activity     判斷使用者在忙還是離開
//   lines        台詞（依語言＋角色）
//   pomodoro     番茄鐘
//   reminders    提醒
//   stats        好感度、餵食
//   petting      摸頭偵測
//   chat         Claude 對話（沒金鑰時隱藏，或改用 Claude app）
// =============================================================
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { api, type ChatReply } from "./common/api";
import { EV } from "./common/events";
import { applyI18n, setLang, t } from "./common/i18n";
import { Lines } from "./common/lines";
import { loadSettings, type Settings } from "./common/settings";
import { todayStr, type Todo } from "./common/types";
import { Animator } from "./pet/animator";
import { PetStateMachine, type PetState } from "./pet/stateMachine";
import { Mover } from "./pet/movement";
import { startClickThrough } from "./pet/clickthrough";
import { ActivityMonitor } from "./pet/activity";
import { Pomodoro, formatTime, type PomoStatus } from "./pet/pomodoro";
import { startReminderCheck } from "./pet/reminders";
import { StatsStore } from "./pet/stats";
import { setupPetting } from "./pet/petting";
import { SpeechBubble } from "./bubble/speech";
import { ChatPanel } from "./bubble/chat";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// ---------- 模組 ----------
let settings: Settings;
let todos: Todo[] = [];
const lines = new Lines();
const stats = new StatsStore();
const animator = new Animator($("pet"));
const mover = new Mover();
const speech = new SpeechBubble($("bubble"));
const pomoBadge = $("pomo");
const menu = $("menu");

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

/** 聊天泡泡能不能用：有金鑰 → api；沒金鑰但開了聯動 → handoff；都沒有 → null（隱藏） */
let chatMode: "api" | "handoff" | null = null;
const chat = new ChatPanel($("chat"), {
  getContext: buildContext,
  onThinking: () => sm.set("think"),
  onReply: (r: ChatReply) => {
    sm.react();
    if (r.todoDone) void onTodoDone();
  },
  onError: () => sm.set("idle"),
});

const pomodoro = new Pomodoro(
  (s) => showPomodoro(s),
  (finished) => {
    if (finished === "work") {
      say("pomodoro_break");
      notify(t("notify.pomoTitle"), t("notify.workDone"));
      sm.react();
      if (settings.pomodoro.autoBreak) pomodoro.start("break", settings.pomodoro.breakMin);
    } else {
      say("pomodoro_break_end");
      notify(t("notify.pomoTitle"), t("notify.breakDone"));
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

// ---------- 給 Claude 的即時資訊 ----------
function buildContext(): string {
  const now = new Date();
  const time = `${todayStr(now)} ${now.toTimeString().slice(0, 5)} (${now.toLocaleDateString("en", { weekday: "short" })})`;
  const p = pomodoro.status();
  const open = todos.filter((x) => !x.done);
  const doneToday = todos.filter((x) => x.done && x.doneAt?.startsWith(todayStr(now))).length;
  return [
    `Local time: ${time}`,
    `User activity: ${activity.level}`,
    `Pomodoro: ${p.phase === "off" ? "off" : `${p.phase}, ${formatTime(p.remainingSec)} left`}`,
    `Friendship level: ${stats.level}/4`,
    `Open to-dos (${open.length}):`,
    ...open.slice(0, 30).map((x) => `- [id=${x.id}] ${x.text}`),
    `Completed today: ${doneToday}`,
  ].join("\n");
}

async function reloadTodos(): Promise<void> {
  todos = (await api.loadData<Todo[]>("todos")) ?? [];
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

// ---------- 互動：好感度 ----------
async function onTodoDone(allDone = false): Promise<void> {
  sm.wake();
  sm.react();
  say(allDone ? "todo_all_done" : "todo_done");
  if (await stats.addAffection(1)) setTimeout(() => say("love_up"), 3000);
  await reloadTodos();
}

async function feed(): Promise<void> {
  sm.wake();
  const r = await stats.feed();
  if (r === "full") {
    say("feed_full");
    return;
  }
  sm.react();
  say(r === "levelUp" ? "love_up" : "feed");
  showSnack();
}

/** 點心掉下來的小動畫 */
function showSnack(): void {
  const el = document.createElement("div");
  el.className = "snack";
  el.textContent = ["🍪", "🍡", "🍮", "🍓"][Math.floor(Math.random() * 4)];
  $("pet-wrap").appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

async function onPetted(): Promise<void> {
  if (sm.state === "drag") return;
  sm.wake();
  sm.react();
  say("pet");
  if (await stats.addAffection(1)) setTimeout(() => say("love_up"), 2500);
}

// ---------- 右鍵小選單 ----------
function showMenu(): void {
  menu.querySelector<HTMLElement>("[data-action=chat]")!.classList.toggle("hidden", chatMode === null);
  menu.querySelector<HTMLElement>("[data-action=pomodoro]")!.textContent =
    "🍅 " + t(pomodoro.phase === "off" ? "menu.pomodoro" : "menu.pomodoroStop");
  menu.classList.remove("hidden");
  speech.hide();
}

function setupMenu(): void {
  menu.addEventListener("click", (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>("[data-action]")?.dataset.action;
    menu.classList.add("hidden");
    switch (action) {
      case "chat": openChat(); break;
      case "feed": void feed(); break;
      case "pomodoro": pomodoroCommand(pomodoro.phase === "off" ? "work" : "stop"); break;
      case "claude": void api.openInClaude(""); break;
      case "settings": void api.openSettings(); break;
    }
  });
  // 點其他地方就關掉選單
  document.addEventListener("pointerdown", (e) => {
    if (!menu.contains(e.target as Node)) menu.classList.add("hidden");
  });
}

function relabelMenu(): void {
  const labels: Record<string, string> = {
    chat: "💬 " + t("menu.chat"),
    feed: "🍪 " + t("menu.feed"),
    pomodoro: "🍅 " + t("menu.pomodoro"),
    claude: "✳ " + t("menu.claude"),
    settings: "⚙ " + t("menu.settings"),
  };
  menu.querySelectorAll<HTMLElement>("[data-action]").forEach((b) => (b.textContent = labels[b.dataset.action!]));
}

// ---------- 點擊與拖曳 ----------
function openChat(): void {
  if (!chatMode) return;
  chat.open();
  speech.hide();
  void getCurrentWindow().setFocus();
}

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
      menu.classList.add("hidden");
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
      // 放開後有重力：落在底下的視窗上，或掉回地面
      await mover.land();
      sm.endDrag();
      say("drop");
    } else {
      onClick();
    }
  });

  // 右鍵：小選單
  canvas.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    showMenu();
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
  if (sm.state !== "think") sm.react();
  if (chatMode) {
    chat.isOpen ? chat.close() : openChat();
  } else {
    say("click");
  }
}

// ---------- 坐在其他視窗上 ----------
function setupPerching(): void {
  // 每秒：坐著的視窗移動就跟著走；視窗不見了就掉下來
  setInterval(async () => {
    if (!mover.perch || mover.airborne || isDragging()) return;
    if (!(await mover.followPerch())) {
      sm.startDrag();
      say("drag");
      await mover.fall();
      sm.endDrag();
      say("drop");
    }
  }, 1000);

  // 每 15 秒：有機會跳上目前的視窗，或從視窗跳下來
  setInterval(async () => {
    if (!settings.perchEnabled || !settings.walkEnabled) return;
    if (mover.airborne || isDragging() || chat.isOpen || activity.level === "away") return;
    if (sm.state !== "idle" && sm.state !== "walk") return;
    if (mover.perch) {
      if (Math.random() < 0.15) {
        sm.set("idle");
        await mover.fall();
        sm.react();
      }
      return;
    }
    if (Math.random() > 0.35) return;
    const r = await mover.findPerch();
    if (!r) return;
    sm.set("react", 1.5);
    await mover.jumpOnto(r);
  }, 15_000);
}

// ---------- 讀取設定、造型、台詞、金鑰 ----------
async function applySkin(id: string): Promise<void> {
  try {
    const skin = await api.loadSkin(id);
    await animator.setSkin(skin.manifest, skin.image, settings.petScale);
  } catch (e) {
    speech.show(t("err.skin") + e, 15000);
    // 自訂造型壞掉的話，退回預設造型
    if (id !== "default") await applySkin("default");
  }
}

async function reloadLines(): Promise<void> {
  await lines.load(settings.language, settings.skin);
  if (lines.error) speech.show(t("err.lines") + lines.error, 20000);
}

function applyLanguage(): void {
  setLang(settings.language);
  applyI18n();
  chat.relabel();
  relabelMenu();
}

async function reloadSettings(): Promise<void> {
  const prev = settings;
  settings = await loadSettings();
  activity.thresholds = { ...settings.activity };
  if (settings.language !== prev?.language) applyLanguage();
  if (settings.skin !== prev?.skin) await applySkin(settings.skin);
  else if (settings.petScale !== prev?.petScale) animator.setScale(settings.petScale);
  if (settings.language !== prev?.language || settings.skin !== prev?.skin) {
    await reloadLines();
    chat.reset(); // 換角色或語言，就開新的對話
    await api.refreshTray();
  }
  await refreshChatAvailability();
}

async function refreshChatAvailability(): Promise<void> {
  const hasKey = await api.hasApiKey().catch(() => false);
  const next = hasKey && settings.claude.enabled ? "api" : !hasKey && settings.claude.handoff ? "handoff" : null;
  if (next !== chatMode) {
    chatMode = next;
    chat.mode = next ?? "api";
    chat.reset();
  }
}

// ---------- 主迴圈 ----------
function loop(): void {
  let last = performance.now();
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    sm.update(dt, { activity: activity.level, walkEnabled: settings.walkEnabled && !chat.isOpen && menu.classList.contains("hidden") });
    if (sm.state === "walk") mover.step(dt);
    if (sm.state === "walk") animator.flipped = mover.dir > 0;
    animator.tick(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------- 啟動 ----------
async function main(): Promise<void> {
  settings = await loadSettings();
  activity.thresholds = { ...settings.activity };
  applyLanguage();
  await Promise.all([reloadLines(), applySkin(settings.skin), mover.init(), refreshChatAvailability(), stats.load(), reloadTodos()]);

  setupPointer($("pet"));
  setupPetting($("pet"), () => void onPetted());
  setupMenu();
  setupPerching();
  startClickThrough(
    () => ({ x: mover.x, y: mover.y }),
    () => isDragging() || chat.isOpen || !menu.classList.contains("hidden"),
  );
  activity.start();
  startReminderCheck((r) => {
    const prefix = lines.pick("reminder") ?? "";
    sm.wake();
    sm.react();
    speech.show(`${prefix}${r.text}`, 15000);
    lastTalk = Date.now();
    void notify(t("notify.reminderTitle"), r.text);
  });
  setInterval(autoTalk, 20_000);
  loop();

  // 打招呼
  setTimeout(() => (Lines.isLateNight() ? say("late_night") : say("greeting")), 800);

  // ---------- 其他視窗／托盤送來的事件 ----------
  await listen(EV.settingsChanged, () => void reloadSettings());
  await listen<string>(EV.skinChanged, async () => {
    await reloadSettings();
    sm.react();
    say("greeting");
  });
  await listen<string>(EV.petSay, (e) => {
    sm.wake();
    sm.react();
    say(e.payload);
  });
  await listen<{ allDone: boolean }>(EV.todoDone, (e) => void onTodoDone(e.payload.allDone));
  await listen(EV.todosChanged, () => void reloadTodos());
  await listen(EV.petFeed, () => void feed());
  await listen<string>(EV.pomodoroCommand, (e) => pomodoroCommand(e.payload));
  await listen(EV.apiKeyChanged, () => void refreshChatAvailability());
  await listen(EV.linesChanged, () => void reloadLines());
}

main().catch((e) => {
  console.error(e);
  speech.show(t("err.start") + e, 60000);
});
