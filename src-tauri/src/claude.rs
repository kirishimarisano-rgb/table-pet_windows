//! Claude 對話
//!
//! - API 金鑰存在使用者資料夾的 secrets.json，只有這支 Rust 程式會讀它。
//! - 前端永遠拿不到金鑰本身，只能問「有沒有設定金鑰」。
//! - 呼叫 Anthropic Messages API（POST https://api.anthropic.com/v1/messages）。

use crate::storage::{read_json, write_json};
use serde::Deserialize;
use serde_json::{json, Value};
use tauri::AppHandle;

const API_URL: &str = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL: &str = "claude-sonnet-5";
const DEFAULT_EFFORT: &str = "medium";

/// 角色設定：讓 Claude 用柑柑的口吻說話
const SYSTEM_PROMPT: &str = "\
你是「柑柑」，一隻住在使用者電腦桌面上的橘色小貓桌寵，外表像一顆圓滾滾的蜜柑，頭上長著一片小葉子。
個性：溫暖、黏人、有點小迷糊，喜歡陪主人工作，看到主人完成事情會超開心。
說話規則：
- 一律使用繁體中文。
- 回答要短，通常 1～3 句，因為會顯示在小小的對話泡泡裡。
- 句尾常常加上「喵」或「喵～」，但不要每句都加到很刻意。
- 不使用 Markdown 格式（不要標題、清單符號、粗體）。
- 如果主人問了需要長篇說明的問題，先給重點，再問要不要多講一點。";

#[derive(Deserialize)]
pub struct ChatMessage {
    role: String,
    content: String,
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

/// 送出對話，回傳柑柑的回覆文字
#[tauri::command]
pub async fn claude_chat(app: AppHandle, messages: Vec<ChatMessage>) -> Result<String, String> {
    let key = get_key(&app).ok_or("還沒有設定 API 金鑰")?;

    // 從設定檔讀模型與 effort，沒設定就用預設值
    let settings = read_json(&app, "settings");
    let model = settings["claude"]["model"].as_str().unwrap_or(DEFAULT_MODEL).to_string();
    let effort = settings["claude"]["effort"].as_str().unwrap_or(DEFAULT_EFFORT).to_string();

    // 只接受 user / assistant 兩種角色
    let msgs: Vec<Value> = messages
        .iter()
        .filter(|m| m.role == "user" || m.role == "assistant")
        .map(|m| json!({ "role": m.role, "content": m.content }))
        .collect();
    if msgs.is_empty() {
        return Err("沒有訊息".into());
    }

    let mut body = json!({
        "model": model,
        "max_tokens": 16000,
        "system": SYSTEM_PROMPT,
        "messages": msgs,
    });
    // Haiku 4.5 不支援 effort 和 adaptive thinking，其他目前的模型都支援
    if !model.contains("haiku") {
        body["thinking"] = json!({ "type": "adaptive" });
        body["output_config"] = json!({ "effort": effort });
    }

    let resp = reqwest::Client::new()
        .post(API_URL)
        .header("x-api-key", key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("連線失敗：{e}"))?;

    let status = resp.status();
    let data: Value = resp.json().await.map_err(|e| format!("回應格式錯誤：{e}"))?;

    if !status.is_success() {
        let msg = data["error"]["message"].as_str().unwrap_or("未知錯誤");
        return Err(match status.as_u16() {
            401 => "API 金鑰無效，請到設定重新輸入喵".into(),
            429 => "太多請求了，等一下再聊喵".into(),
            _ => format!("API 錯誤（{status}）：{msg}"),
        });
    }

    if data["stop_reason"] == "refusal" {
        return Ok("這個話題柑柑不能回答喵……換個話題好嗎？".into());
    }

    // 只取出文字區塊（thinking 區塊不顯示）
    let text: String = data["content"]
        .as_array()
        .map(|blocks| {
            blocks
                .iter()
                .filter(|b| b["type"] == "text")
                .filter_map(|b| b["text"].as_str())
                .collect::<Vec<_>>()
                .join("")
        })
        .unwrap_or_default();

    if text.trim().is_empty() {
        Ok("……（柑柑想了很久，沒想出來喵）".into())
    } else {
        Ok(text.trim().to_string())
    }
}
