// =============================================================
// 待辦清單（存在 todos.json）
// 勾選完成時會通知柑柑，讓它說「完成待辦」的台詞。
// =============================================================
import { emit } from "@tauri-apps/api/event";
import { api } from "../common/api";
import { EV } from "../common/events";
import { newId, type Todo } from "../common/types";

let todos: Todo[] = [];
const listEl = () => document.getElementById("todo-list")!;

async function save(): Promise<void> {
  await api.saveData("todos", todos);
  render();
}

function render(): void {
  const ul = listEl();
  ul.innerHTML = "";
  // 未完成的排前面
  const sorted = [...todos].sort((a, b) => Number(a.done) - Number(b.done));
  for (const t of sorted) {
    const li = document.createElement("li");
    li.className = t.done ? "done" : "";

    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = t.done;
    box.addEventListener("change", () => toggle(t, box.checked));

    const span = document.createElement("span");
    span.textContent = t.text;

    const del = document.createElement("button");
    del.textContent = "刪除";
    del.className = "link";
    del.addEventListener("click", async () => {
      todos = todos.filter((x) => x.id !== t.id);
      await save();
    });

    li.append(box, span, del);
    ul.appendChild(li);
  }
  const left = todos.filter((t) => !t.done).length;
  document.getElementById("todo-count")!.textContent =
    todos.length === 0 ? "還沒有待辦，新增一件吧喵～" : `還剩 ${left} 件，已完成 ${todos.length - left} 件`;
}

async function toggle(t: Todo, done: boolean): Promise<void> {
  t.done = done;
  t.doneAt = done ? new Date().toISOString() : undefined;
  await save();
  if (done) {
    const allDone = todos.every((x) => x.done);
    await emit(EV.todoDone, { allDone });
  }
}

export async function setupTodos(): Promise<void> {
  todos = (await api.loadData<Todo[]>("todos")) ?? [];
  render();

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
    todos = todos.filter((t) => !t.done);
    await save();
  });
}
