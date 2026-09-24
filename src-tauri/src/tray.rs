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

/// 建立選單（造型清單會變，所以每次需要時重建）
fn build_menu(app: &AppHandle) -> tauri::Result<Menu<Wry>> {
    let current_skin = read_json(app, "settings")["skin"]
        .as_str()
        .unwrap_or("default")
        .to_string();

    // 造型子選單
    let skin_menu = Submenu::with_id(app, "skins", "造型", true)?;
    for s in skins::list(app) {
        let item = CheckMenuItem::with_id(
            app,
            format!("skin:{}", s.id),
            &s.name,
            true,
            s.id == current_skin,
            None::<&str>,
        )?;
        skin_menu.append(&item)?;
    }
    skin_menu.append(&PredefinedMenuItem::separator(app)?)?;
    skin_menu.append(&MenuItem::with_id(app, "skins-reload", "重新掃描造型", true, None::<&str>)?)?;

    // 番茄鐘子選單
    let pomo_menu = Submenu::with_id(app, "pomo", "番茄鐘", true)?;
    pomo_menu.append(&MenuItem::with_id(app, "pomo:work", "開始專注", true, None::<&str>)?)?;
    pomo_menu.append(&MenuItem::with_id(app, "pomo:break", "開始休息", true, None::<&str>)?)?;
    pomo_menu.append(&MenuItem::with_id(app, "pomo:stop", "停止", true, None::<&str>)?)?;

    Menu::with_items(
        app,
        &[
            &MenuItem::with_id(app, "toggle", "顯示／隱藏柑柑", true, None::<&str>)?,
            &MenuItem::with_id(app, "say", "跟柑柑打招呼", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &skin_menu,
            &pomo_menu,
            &MenuItem::with_id(app, "settings", "待辦與設定…", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "quit", "結束", true, None::<&str>)?,
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
        .title("柑柑的設定")
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
        .tooltip("柑柑")
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

#[tauri::command]
pub fn open_settings_window(app: AppHandle) {
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
