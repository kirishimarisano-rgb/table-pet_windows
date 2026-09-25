//! 本機資料存取：所有資料都是 JSON 檔，放在使用者的應用程式資料夾
//! （Windows：%APPDATA%\tw.deskpet.kankan\）。
//!
//! 前端只能讀寫「白名單」裡的檔名，避免亂讀電腦上的其他檔案。

use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// 前端可以透過 load_data / save_data 存取的檔案（不含副檔名）
const ALLOWED: &[&str] = &["settings", "todos", "reminders", "stats"];

/// 取得資料夾路徑，不存在就建立
pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

/// 讀取 JSON；檔案不存在或壞掉時回傳 null
pub fn read_json(app: &AppHandle, name: &str) -> Value {
    let Ok(dir) = data_dir(app) else { return Value::Null };
    fs::read_to_string(dir.join(format!("{name}.json")))
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or(Value::Null)
}

/// 寫入 JSON（排版過，方便使用者直接用記事本打開看）
pub fn write_json(app: &AppHandle, name: &str, value: &Value) -> Result<(), String> {
    let path = data_dir(app)?.join(format!("{name}.json"));
    let text = serde_json::to_string_pretty(value).map_err(|e| e.to_string())?;
    fs::write(path, text).map_err(|e| e.to_string())
}

fn check_name(name: &str) -> Result<(), String> {
    if ALLOWED.contains(&name) {
        Ok(())
    } else {
        Err(format!("不允許存取的資料：{name}"))
    }
}

#[tauri::command]
pub fn load_data(app: AppHandle, name: String) -> Result<Value, String> {
    check_name(&name)?;
    Ok(read_json(&app, &name))
}

#[tauri::command]
pub fn save_data(app: AppHandle, name: String, value: Value) -> Result<(), String> {
    check_name(&name)?;
    write_json(&app, &name, &value)
}

/// 用檔案總管打開資料夾（sub 可以是 "" 或 "skins"）
#[tauri::command]
pub fn open_data_dir(app: AppHandle, sub: String) -> Result<(), String> {
    if !sub.is_empty() && sub != "skins" {
        return Err("不支援的資料夾".into());
    }
    let dir = data_dir(&app)?.join(&sub);
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    #[cfg(windows)]
    let program = "explorer";
    #[cfg(not(windows))]
    let program = "xdg-open";
    std::process::Command::new(program)
        .arg(&dir)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok(())
}
