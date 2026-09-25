//! 台詞：依「語言」和「角色」組合出最後使用的台詞
//!
//! 讀取順序（後面的會蓋掉前面同名的分類）：
//!   1. 共用台詞：使用者資料夾的 lines/<語言>.json
//!      （第一次使用時從內建版本複製過去，之後使用者可以直接編輯）
//!   2. 角色專屬台詞：造型資料夾裡的 lines/<語言>.json（沒有就跳過）

use crate::skins::{builtin_lines, find_skin_dir};
use crate::storage::data_dir;
use serde_json::{Map, Value};
use std::fs;
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

/// 支援的語言
pub const LANGS: &[&str] = &["zh-TW", "ja", "en"];

/// 內建台詞編進程式裡，安裝目錄找不到檔案時也能用
fn embedded(lang: &str) -> &'static str {
    match lang {
        "ja" => include_str!("../../lines/ja.json"),
        "en" => include_str!("../../lines/en.json"),
        _ => include_str!("../../lines/zh-TW.json"),
    }
}

pub fn normalize_lang(lang: &str) -> &'static str {
    LANGS.iter().find(|l| **l == lang).copied().unwrap_or("zh-TW")
}

/// 使用者可編輯的台詞檔路徑；不存在就建立
fn user_lines_file(app: &AppHandle, lang: &str) -> Result<PathBuf, String> {
    let dir = data_dir(app)?.join("lines");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file = dir.join(format!("{lang}.json"));
    if file.exists() {
        return Ok(file);
    }
    // 舊版只有一個 lines.json（繁中），搬過來沿用
    let legacy = data_dir(app)?.join("lines.json");
    if lang == "zh-TW" && legacy.exists() && fs::rename(&legacy, &file).is_ok() {
        return Ok(file);
    }
    let copied = app
        .path()
        .resolve(format!("lines/{lang}.json"), BaseDirectory::Resource)
        .ok()
        .and_then(|bundled| fs::copy(bundled, &file).ok());
    if copied.is_none() {
        fs::write(&file, embedded(lang)).map_err(|e| e.to_string())?;
    }
    Ok(file)
}

fn read_obj(path: &PathBuf) -> Result<Map<String, Value>, String> {
    let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
    // 記事本存檔可能會在開頭加 BOM，先去掉
    let text = text.trim_start_matches('\u{feff}');
    match serde_json::from_str(text) {
        Ok(Value::Object(m)) => Ok(m),
        Ok(_) => Err(format!("{} 最外層要是 {{ }}", path.display())),
        Err(e) => Err(format!("{} 格式錯誤：{e}", path.display())),
    }
}

#[tauri::command]
pub fn get_lines(app: AppHandle, lang: String, skin: String) -> Result<Value, String> {
    let lang = normalize_lang(&lang);
    let mut lines = read_obj(&user_lines_file(&app, lang)?)?;

    // 角色專屬台詞：先找角色資料夾，找不到再用編進程式裡的內建角色台詞
    let skin_lines = match find_skin_dir(&app, &skin) {
        Some(dir) => {
            let skin_file = dir.join("lines").join(format!("{lang}.json"));
            if skin_file.exists() { Some(read_obj(&skin_file)?) } else { None }
        }
        None => builtin_lines(&skin, lang).and_then(|text| serde_json::from_str::<Map<String, Value>>(text).ok()),
    };
    for (k, v) in skin_lines.unwrap_or_default() {
        lines.insert(k, v);
    }
    Ok(Value::Object(lines))
}

/// 把某個語言的共用台詞還原成內建版本
#[tauri::command]
pub fn reset_lines(app: AppHandle, lang: String) -> Result<(), String> {
    let lang = normalize_lang(&lang);
    let file = data_dir(&app)?.join("lines").join(format!("{lang}.json"));
    if file.exists() {
        fs::remove_file(&file).map_err(|e| e.to_string())?;
    }
    Ok(())
}
