//! 台詞：優先讀使用者資料夾裡的 lines.json，沒有的話就把內建的複製一份過去。
//! 這樣使用者不用重新建置，直接編輯資料夾裡的 lines.json 就能加台詞。

use crate::storage::data_dir;
use serde_json::Value;
use std::fs;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn get_lines(app: AppHandle) -> Result<Value, String> {
    let user_file = data_dir(&app)?.join("lines.json");

    if !user_file.exists() {
        let bundled = app
            .path()
            .resolve("lines.json", BaseDirectory::Resource)
            .map_err(|e| e.to_string())?;
        fs::copy(&bundled, &user_file).map_err(|e| format!("找不到內建台詞：{e}"))?;
    }

    let text = fs::read_to_string(&user_file).map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| format!("lines.json 格式錯誤：{e}"))
}

/// 把使用者的 lines.json 還原成內建版本
#[tauri::command]
pub fn reset_lines(app: AppHandle) -> Result<(), String> {
    let user_file = data_dir(&app)?.join("lines.json");
    if user_file.exists() {
        fs::remove_file(&user_file).map_err(|e| e.to_string())?;
    }
    Ok(())
}
