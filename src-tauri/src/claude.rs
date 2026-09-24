//! Claude 對話
//!
//! - API 金鑰存在使用者資料夾的 secrets.json，只有這支 Rust 程式會讀它。
//!   前端永遠拿不到金鑰本身，只能問「有沒有設定金鑰」。
//! - 呼叫 Anthropic Messages API（POST https://api.anthropic.com/v1/messages）。
//! - 角色個性來自目前造型的 manifest.json（persona），所以換造型就換個性。
//! - 提供「工具」給 Claude：新增／完成待辦、新增提醒、控制番茄鐘。
//!   Claude 決定要用工具時，由這裡實際修改本機 JSON，再把結果回報給 Claude。

use crate::lines::normalize_lang;
use crate::skins;
use crate::storage::{read_json, write_json};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter};

const API_URL: &str = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL: &str = "claude-sonnet-5";
const DEFAULT_EFFORT: &str = "medium";
/// 一次對話最多來回幾輪工具呼叫，避免無限循環
const MAX_TOOL_ROUNDS: usize = 5;

/// 給 Claude 的額外說明（工具怎麼用）；回答語言由角色個性決定
const TOOL_GUIDE: &str = "\
You can manage the user's local to-do list, reminders and pomodoro timer with the provided tools.
Only use a tool when the user clearly asks for it (for example \"add a to-do\", \"remind me at 3pm\", \"start a pomodoro\").
After using a tool, briefly confirm what you did, in character.
The [Current context] section below is live data from the app; use it to answer questions about the user's tasks and time.";

#[derive(Deserialize)]
pub struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Serialize)]
pub struct ChatReply {
    reply: String,
    /// 這次對話中有沒有完成待辦（讓桌寵開心一下）
    #[serde(rename = "todoDone")]
    todo_done: bool,
}

fn get_key(app: &AppHandle) -> Option<String> {
    read_json(app, "secrets")["anthropic_api_key"]
        .as_str()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

#[tauri::command]
pub fn has_api_key(app: AppHandle) -> bool {
    get_key(&app).is_some()
}

#[tauri::command]
pub fn set_api_key(app: AppHandle, key: String) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("金鑰是空的".into());
    }
    write_json(&app, "secrets", &json!({ "anthropic_api_key": key }))
}

#[tauri::command]
pub fn clear_api_key(app: AppHandle) -> Result<(), String> {
    write_json(&app, "secrets", &json!({}))
}

// ---------------------------------------------------------------
// 工具定義
// ---------------------------------------------------------------

fn tool_definitions() -> Value {
    json!([
        {
            "name": "add_todo",
            "description": "Add an item to the user's to-do list.",
            "input_schema": {
                "type": "object",
                "properties": { "text": { "type": "string", "description": "The to-do text, in the user's language." } },
                "required": ["text"],
                "additionalProperties": false
            },
            "strict": true
        },
        {
            "name": "complete_todo",
            "description": "Mark a to-do item as done. Use the id shown in the [Current context] to-do list.",
            "input_schema": {
                "type": "object",
                "properties": { "id": { "type": "string" } },
                "required": ["id"],
                "additionalProperties": false
            },
            "strict": true
        },
        {
            "name": "add_reminder",
            "description": "Create a reminder. kind \"once\" needs at = \"YYYY-MM-DDTHH:MM\" (local time); kind \"daily\" needs at = \"HH:MM\".",
            "input_schema": {
                "type": "object",
                "properties": {
                    "text": { "type": "string" },
                    "kind": { "type": "string", "enum": ["once", "daily"] },
                    "at": { "type": "string" }
                },
                "required": ["text", "kind", "at"],
                "additionalProperties": false
            },
            "strict": true
        },
        {
            "name": "pomodoro",
            "description": "Control the pomodoro timer: start a focus session, start a break, or stop.",
            "input_schema": {
                "type": "object",
                "properties": { "action": { "type": "string", "enum": ["work", "break", "stop"] } },
                "required": ["action"],
                "additionalProperties": false
            },
            "strict": true
        }
    ])
}

/// 簡單檢查時間格式：只允許數字和 - : T
fn valid_time(s: &str, len: usize) -> bool {
    s.len() == len && s.chars().all(|c| c.is_ascii_digit() || c == '-' || c == ':' || c == 'T')
}

fn new_id(now_ms: u128) -> String {
    format!("c{now_ms:x}")
}

/// 執行一個工具，回傳給 Claude 看的結果文字
fn run_tool(app: &AppHandle, name: &str, input: &Value, now_iso: &str, todo_done: &mut bool) -> Result<String, String> {
    let now_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);

    match name {
        "add_todo" => {
            let text = input["text"].as_str().unwrap_or("").trim();
            if text.is_empty() {
                return Err("text is empty".into());
            }
            let mut todos = read_json(app, "todos").as_array().cloned().unwrap_or_default();
            let id = new_id(now_ms);
            todos.push(json!({ "id": id, "text": text, "done": false, "createdAt": now_iso }));
            write_json(app, "todos", &Value::Array(todos))?;
            let _ = app.emit("todos-changed", ());
            Ok(format!("added to-do id={id}"))
        }
        "complete_todo" => {
            let id = input["id"].as_str().unwrap_or("");
            let mut todos = read_json(app, "todos").as_array().cloned().unwrap_or_default();
            let Some(t) = todos.iter_mut().find(|t| t["id"] == id) else {
                return Err(format!("no to-do with id {id}"));
            };
            t["done"] = json!(true);
            t["doneAt"] = json!(now_iso);
            write_json(app, "todos", &Value::Array(todos))?;
            let _ = app.emit("todos-changed", ());
            *todo_done = true;
            Ok("marked as done".into())
        }
        "add_reminder" => {
            let text = input["text"].as_str().unwrap_or("").trim();
            let kind = input["kind"].as_str().unwrap_or("");
            let at = input["at"].as_str().unwrap_or("");
            let ok = match kind {
                "once" => valid_time(at, 16),
                "daily" => valid_time(at, 5),
                _ => false,
            };
            if text.is_empty() || !ok {
                return Err("invalid reminder: check kind and the format of at".into());
            }
            let mut list = read_json(app, "reminders").as_array().cloned().unwrap_or_default();
            let mut r = json!({ "id": new_id(now_ms), "text": text, "kind": kind, "at": at });
            // 每天的提醒：如果今天的時間已經過了，從明天開始
            if kind == "daily" && now_iso.len() >= 16 && at <= &now_iso[11..16] {
                r["lastFiredDate"] = json!(&now_iso[..10]);
            }
            list.push(r);
            write_json(app, "reminders", &Value::Array(list))?;
            let _ = app.emit("reminders-changed", ());
            Ok(format!("reminder set ({kind} {at})"))
        }
        "pomodoro" => {
            let action = input["action"].as_str().unwrap_or("");
            if !["work", "break", "stop"].contains(&action) {
                return Err("unknown action".into());
            }
            let _ = app.emit("pomodoro-command", action);
            Ok(format!("pomodoro: {action}"))
        }
        _ => Err(format!("unknown tool {name}")),
    }
}

// ---------------------------------------------------------------
// 對話
// ---------------------------------------------------------------

/** 錯誤訊息（三種語言） */
fn msg(lang: &str, key: &str) -> String {
    let (zh, ja, en) = match key {
        "no_key" => ("還沒有設定 API 金鑰", "API キーが設定されていません", "No API key set"),
        "no_msg" => ("沒有訊息", "メッセージがありません", "No message"),
        "net" => ("連線失敗：", "接続に失敗しました：", "Connection failed: "),
        "bad_resp" => ("回應格式錯誤：", "応答の形式が正しくありません：", "Unexpected response: "),
        "401" => ("API 金鑰無效，請到設定重新輸入", "API キーが無効です。設定で入れ直してください", "Invalid API key. Please re-enter it in Settings"),
        "429" => ("請求太多了，等一下再聊", "リクエストが多すぎます。少し待ってね", "Too many requests. Try again in a moment"),
        "api" => ("API 錯誤", "API エラー", "API error"),
        "refusal" => ("……（這個話題沒辦法回答，換個話題好嗎？）", "……（この話題には答えられないの。別の話にしよう？）", "...(I can't help with that one. Another topic?)"),
        "too_long" => ("……（想太久了，請再問一次）", "……（考えすぎちゃった。もう一度聞いてね）", "...(I thought too long. Please ask again)"),
        _ => ("?", "?", "?"),
    };
    match lang {
        "ja" => ja,
        "en" => en,
        _ => zh,
    }
    .to_string()
}

/// 送出對話，回傳角色的回覆
/// context：前端整理好的即時資訊（時間、待辦、番茄鐘狀態…）
/// now：前端的本地時間 "YYYY-MM-DDTHH:MM:SS"，用來記錄待辦建立時間
#[tauri::command]
pub async fn claude_chat(app: AppHandle, messages: Vec<ChatMessage>, context: String, now: String) -> Result<ChatReply, String> {
    let settings = read_json(&app, "settings");
    let lang = normalize_lang(settings["language"].as_str().unwrap_or("zh-TW"));
    let key = get_key(&app).ok_or_else(|| msg(lang, "no_key"))?;

    let model = settings["claude"]["model"].as_str().unwrap_or(DEFAULT_MODEL).to_string();
    let effort = settings["claude"]["effort"].as_str().unwrap_or(DEFAULT_EFFORT).to_string();
    let skin = settings["skin"].as_str().unwrap_or("default");

    let persona = skins::persona(&app, skin, lang).unwrap_or_else(|| {
        format!("You are a friendly desktop pet. Keep replies short. Reply in the language with code \"{lang}\". No Markdown.")
    });
    let system = format!("{persona}\n\n{TOOL_GUIDE}\n\n[Current context]\n{context}");

    // 只接受 user / assistant 兩種角色
    let mut msgs: Vec<Value> = messages
        .iter()
        .filter(|m| m.role == "user" || m.role == "assistant")
        .map(|m| json!({ "role": m.role, "content": m.content }))
        .collect();
    if msgs.is_empty() {
        return Err(msg(lang, "no_msg"));
    }

    let client = reqwest::Client::new();
    let mut todo_done = false;

    for _ in 0..MAX_TOOL_ROUNDS {
        let mut body = json!({
            "model": model,
            "max_tokens": 16000,
            "system": system,
            "messages": msgs,
            "tools": tool_definitions(),
        });
        // Haiku 4.5 不支援 effort 和 adaptive thinking
        if !model.contains("haiku") {
            body["thinking"] = json!({ "type": "adaptive" });
            body["output_config"] = json!({ "effort": effort });
        }

        let resp = client
            .post(API_URL)
            .header("x-api-key", &key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("{}{e}", msg(lang, "net")))?;

        let status = resp.status();
        let data: Value = resp.json().await.map_err(|e| format!("{}{e}", msg(lang, "bad_resp")))?;

        if !status.is_success() {
            let detail = data["error"]["message"].as_str().unwrap_or("");
            return Err(match status.as_u16() {
                401 => msg(lang, "401"),
                429 => msg(lang, "429"),
                _ => format!("{} ({status}): {detail}", msg(lang, "api")),
            });
        }

        if data["stop_reason"] == "refusal" {
            return Ok(ChatReply { reply: msg(lang, "refusal"), todo_done });
        }

        let content = data["content"].as_array().cloned().unwrap_or_default();

        // Claude 想用工具 → 執行後把結果送回去，再問一次
        if data["stop_reason"] == "tool_use" {
            let mut results = Vec::new();
            for block in content.iter().filter(|b| b["type"] == "tool_use") {
                let name = block["name"].as_str().unwrap_or("");
                let (text, is_error) = match run_tool(&app, name, &block["input"], &now, &mut todo_done) {
                    Ok(t) => (t, false),
                    Err(e) => (e, true),
                };
                results.push(json!({
                    "type": "tool_result",
                    "tool_use_id": block["id"],
                    "content": text,
                    "is_error": is_error,
                }));
            }
            // 助手的回覆要原封不動放回去（包含 thinking 區塊）
            msgs.push(json!({ "role": "assistant", "content": content }));
            msgs.push(json!({ "role": "user", "content": results }));
            continue;
        }

        // 一般回覆：只取出文字區塊
        let text: String = content
            .iter()
            .filter(|b| b["type"] == "text")
            .filter_map(|b| b["text"].as_str())
            .collect::<Vec<_>>()
            .join("");
        let reply = if text.trim().is_empty() { "……".to_string() } else { text.trim().to_string() };
        return Ok(ChatReply { reply, todo_done });
    }

    Ok(ChatReply { reply: msg(lang, "too_long"), todo_done })
}

// ---------------------------------------------------------------
// Claude app 聯動
// ---------------------------------------------------------------

/// 把文字轉成網址參數（UTF-8 百分比編碼）
fn url_encode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => (b as char).to_string(),
            _ => format!("%{b:02X}"),
        })
        .collect()
}

/// 在 Claude（claude.ai）開新對話，並預先填好問題
#[tauri::command]
pub fn open_in_claude(app: AppHandle, prompt: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    let url = if prompt.trim().is_empty() {
        "https://claude.ai/new".to_string()
    } else {
        format!("https://claude.ai/new?q={}", url_encode(prompt.trim()))
    };
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

/// 開啟網址（只允許本專案的 GitHub 頁面和 claude.ai，避免被拿來亂開網址）
#[tauri::command]
pub fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_opener::OpenerExt;
    const ALLOWED: &[&str] = &["https://github.com/kirishimarisano-rgb/table-pet_windows", "https://claude.ai/"];
    if !ALLOWED.iter().any(|p| url.starts_with(p)) {
        return Err("不允許開啟這個網址".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}
