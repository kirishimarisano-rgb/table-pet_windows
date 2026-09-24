// =============================================================
// 待辦清單（存在 todos.json）
// 勾選完成時會通知桌寵角色，讓它說「完成待辦」的台詞。
// =============================================================
import { emit, listen } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { t } from "../common/i18n";
import { EV } from "../common/events";
import { newId, type Todo } from "../common/types";

let todos: Todo[] = [];
const listEl = () => document.getElementById("todo-list")!;

async function save(): Promise<void> {
  await api.saveData("todos", todos);
  await emit(EV.todosChanged);
  render();
}

function render(): void {
  const ul = listEl();
  ul.innerHTML = "";
  // 未完成的排前面
  const sorted = [...todos].sort((a, b) => Number(a.done) - Number(b.done));
  for (const item of sorted) {
    const li = document.createElement("li");
    li.className = item.done ? "done" : "";

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = item.done;
    box.addEventListener("change", () => toggle(item, box.checked));

    const span = document.createElement("span");
    span.textContent = item.text;

    const del = document.createElement("button");
    del.textContent = t("todo.delete");
    del.className = "link";
    del.addEventListener("click", async () => {
      todos = todos.filter((x) => x.id !== item.id);
      await save();
    });

    li.append(box, span, del);
    ul.appendChild(li);
  }
  const left = todos.filter((x) => !x.done).length;
  document.getElementById("todo-count")!.textContent =
    todos.length === 0 ? t("todo.empty") : t("todo.count", { left, done: todos.length - left });
}

async function toggle(item: Todo, done: boolean): Promise<void> {
  item.done = done;
  item.doneAt = done ? new Date().toISOString() : undefined;
  await save();
  if (done) {
    const allDone = todos.every((x) => x.done);
    await emit(EV.todoDone, { allDone });
  }
}

export async function setupTodos(): Promise<void> {
  todos = (await api.loadData<Todo[]>("todos")) ?? [];
  render();
  // 在聊天裡請角色新增／完成待辦時，這裡也要更新
  await listen(EV.todosChanged, async () => {
    todos = (await api.loadData<Todo[]>("todos")) ?? [];
    render();
  });

  const input = document.getElementById("todo-input") as HTMLInputElement;
  document.getElementById("todo-form")!.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    todos.push({ id: newId(), text, done: false, createdAt: new Date().toISOString() });
    input.value = "";
    await save();
  });

  document.getElementById("todo-clear")!.addEventListener("click", async () => {
    todos = todos.filter((x) => !x.done);
    await save();
  });
}
