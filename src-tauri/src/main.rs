// 發行版不要跳出黑色主控台視窗
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! desk-pet 程式進入點
//!
//! 模組分工：
//!   storage  本機 JSON 讀寫
//!   idle     Windows 閒置秒數
//!   lines    台詞檔
//!   skins    造型
//!   claude   Claude 對話與 API 金鑰
//!   perch    坐在其他視窗上（讀取視窗位置）
//!   tray     托盤選單、設定視窗

mod claude;
mod idle;
mod lines;
mod perch;
mod skins;
mod storage;
mod tray;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // 開機自動啟動（在設定裡開關）
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            tray::setup(app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            storage::load_data,
            storage::save_data,
            storage::open_data_dir,
            idle::get_idle_seconds,
            perch::perch_target,
            perch::perch_window,
            lines::get_lines,
            lines::reset_lines,
            skins::list_skins,
            skins::load_skin,
            skins::create_skin,
            skins::import_skin_folder,
            skins::create_skin_template,
            skins::delete_skin,
            claude::has_api_key,
            claude::set_api_key,
            claude::clear_api_key,
            claude::claude_chat,
            claude::open_in_claude,
            claude::open_url,
            tray::open_settings_window,
            tray::select_skin,
            tray::refresh_tray,
        ])
        .run(tauri::generate_context!())
        .expect("啟動 desk-pet 時發生錯誤");
}
