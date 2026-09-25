//! 系統托盤（右下角的小圖示）與選單
//!
//! 選單點下去後，大多是「送一個事件給桌寵視窗」，實際動作由前端處理。

use crate::skins;
use crate::storage::{read_json, write_json};
use serde_json::json;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, Wry};

const TRAY_ID: &str = "main-tray";

/// 托盤選單的文字（三種語言）
fn t(lang: &str, key: &str) -> &'static str {
    let (zh, ja, en) = match key {
        "toggle" => ("顯示／隱藏", "表示／非表示", "Show / Hide"),
        "say" => ("打招呼", "あいさつ", "Say hello"),
        "feed" => ("餵點心", "おやつをあげる", "Give a snack"),
        "skins" => ("造型", "キャラクター", "Characters"),
        "reload" => ("重新掃描造型", "再読み込み", "Rescan"),
        "pomo" => ("番茄鐘", "ポモドーロ", "Pomodoro"),
        "work" => ("開始專注", "集中を開始", "Start focus"),
        "break" => ("開始休息", "休憩を開始", "Start break"),
        "stop" => ("停止", "停止", "Stop"),
        "claude" => ("在 Claude 開新對話", "Claude で新しいチャット", "New chat in Claude"),
        "settings" => ("待辦與設定…", "ToDo と設定…", "To-dos & Settings…"),
        "quit" => ("結束", "終了", "Quit"),
        _ => ("?", "?", "?"),
    };
    match lang {
        "ja" => ja,
        "en" => en,
        _ => zh,
    }
}

/// 建立選單（造型清單會變，所以每次需要時重建）
fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let settings = read_json(app, "settings");
    let current_skin = settings["skin"].as_str().unwrap_or("default").to_string();
    let lang = settings["language"].as_str().unwrap_or("zh-TW").to_string();
    let l = |k| t(&lang, k);

    // 造型子選單
    let skin_menu = Submenu::with_id(app, "skins", l("skins"), true)?;
    for s in skins::list(app) {
        let item = CheckMenuItem::with_id(
            app,
            format!("skin:{}", s.id),
            s.display_name(&lang),
            true,
            s.id == current_skin,
            None::<&str>,
        )?;
        skin_menu.append(&item)?;
    }
    skin_menu.append(&PredefinedMenuItem::separator(app)?)?;
    skin_menu.append(&MenuItem::with_id(app, "skins-reload", l("reload"), true, None::<&str>)?)?;

    // 番茄鐘子選單
    let pomo_menu = Submenu::with_id(app, "pomo", l("pomo"), true)?;
    pomo_menu.append(&MenuItem::with_id(app, "pomo:work", l("work"), true, None::<&str>)?)?;
    pomo_menu.append(&MenuItem::with_id(app, "pomo:break", l("break"), true, None::<&str>)?)?;
    pomo_menu.append(&MenuItem::with_id(app, "pomo:stop", l("stop"), true, None::<&str>)?)?;

    Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "toggle", l("toggle"), true, None::<&str>)?,
            &MenuItem::with_id(app, "say", l("say"), true, None::<&str>)?,
            &MenuItem::with_id(app, "feed", l("feed"), true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &skin_menu,
            &pomo_menu,
            &MenuItem::with_id(app, "claude", l("claude"), true, None::<&str>)?,
            &MenuItem::with_id(app, "settings", l("settings"), true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "quit", l("quit"), true, None::<&str>)?,
        ],
    )
}

/// 重新整理托盤選單（例如切換造型後，更新打勾位置）
pub fn refresh_menu(app: &AppHandle) {
    if let (Some(tray), Ok(menu)) = (app.tray_by_id(TRAY_ID), build_menu(app)) {
        let _ = tray.set_menu(Some(menu));
    }
}

/// 打開設定視窗；已經開著就拉到最前面
pub fn open_settings(app: &AppHandle) {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.show();
        let _ = w.set_focus();
        return;
    }
    let _ = WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("settings.html".into()))
        .title("desk-pet")
        .inner_size(560.0, 640.0)
        .min_inner_size(460.0, 480.0)
        .build();
}

/// 切換造型：寫進設定檔，並通知所有視窗
pub fn set_skin(app: &AppHandle, id: &str) {
    let mut settings = read_json(app, "settings");
    if !settings.is_object() {
        settings = json!({});
    }
    settings["skin"] = json!(id);
    let _ = write_json(app, "settings", &settings);
    let _ = app.emit("skin-changed", id);
    refresh_menu(app);
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let menu = build_menu(app)?;
    let mut builder = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("desk-pet")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            match id {
                "toggle" => {
                    if let Some(w) = app.get_webview_window("main") {
                        if w.is_visible().unwrap_or(true) {
                            let _ = w.hide();
                        } else {
                            let _ = w.show();
                        }
                    }
                }
                "say" => {
                    let _ = app.emit("pet-say", "greeting");
                }
                "feed" => {
                    let _ = app.emit("pet-feed", ());
                }
                "claude" => {
                    let _ = crate::claude::open_in_claude(app.clone(), String::new());
                }
                "settings" => open_settings(app),
                "skins-reload" => refresh_menu(app),
                "quit" => app.exit(0),
                _ if id.starts_with("skin:") => set_skin(app, &id[5..]),
                _ if id.starts_with("pomo:") => {
                    let _ = app.emit("pomodoro-command", &id[5..]);
                }
                _ => {}
            }
        })
        // 左鍵點托盤圖示：顯示桌寵
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                if let Some(w) = tray.app_handle().get_webview_window("main") {
                    let _ = w.show();
                }
            }
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    builder.build(app)?;
    Ok(())
}

// ---- 給前端呼叫的指令 ----

/// 注意：一定要是 async。Windows 上在同步指令裡開新視窗會卡住，畫面變成一片空白。
#[tauri::command]
pub async fn open_settings_window(app: AppHandle) {
    open_settings(&app);
}

#[tauri::command]
pub fn select_skin(app: AppHandle, id: String) {
    set_skin(&app, &id);
}

#[tauri::command]
pub fn refresh_tray(app: AppHandle) {
    refresh_menu(&app);
}
