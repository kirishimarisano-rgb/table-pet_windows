//! 坐在視窗上：取得「目前使用中的視窗」的位置，讓角色可以跳到它的上緣
//!
//! 只讀取視窗的「位置和大小」，不會讀取視窗裡的內容或標題。

use serde::Serialize;

#[derive(Serialize, Clone, Copy)]
pub struct WinRect {
    /// 視窗代號（用來之後追蹤同一個視窗）
    pub id: isize,
    pub left: i32,
    pub top: i32,
    pub right: i32,
    pub bottom: i32,
}

/// 目前前景視窗（最小化、全螢幕、桌面、工作列、自己的視窗都不算）
#[tauri::command]
pub fn perch_target() -> Option<WinRect> {
    imp::foreground()
}

/// 追蹤某個視窗的最新位置；視窗關掉、最小化或最大化時回傳 None
#[tauri::command]
pub fn perch_window(id: isize) -> Option<WinRect> {
    imp::window(id)
}

#[cfg(windows)]
mod imp {
    use super::WinRect;
    use std::ffi::c_void;
    use windows_sys::Win32::Foundation::{HWND, RECT};
    use windows_sys::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_EXTENDED_FRAME_BOUNDS};
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        GetClassNameW, GetForegroundWindow, GetWindowThreadProcessId, IsIconic, IsWindow, IsWindowVisible,
        IsZoomed,
    };

    /// 這些是桌面、工作列之類的系統視窗，不能坐
    const SKIP_CLASSES: &[&str] = &["Progman", "WorkerW", "Shell_TrayWnd", "Shell_SecondaryTrayWnd"];

    fn class_name(hwnd: HWND) -> String {
        let mut buf = [0u16; 128];
        // SAFETY：傳入自己的緩衝區和長度
        let len = unsafe { GetClassNameW(hwnd, buf.as_mut_ptr(), buf.len() as i32) };
        String::from_utf16_lossy(&buf[..len.max(0) as usize])
    }

    fn rect_of(hwnd: HWND) -> Option<WinRect> {
        // SAFETY：只讀取視窗狀態與位置
        unsafe {
            if hwnd.is_null() || IsWindow(hwnd) == 0 || IsWindowVisible(hwnd) == 0 || IsIconic(hwnd) != 0 || IsZoomed(hwnd) != 0 {
                return None;
            }
            // 用 DWM 取得「看得到的外框」，不含陰影，位置比較準
            let mut r = RECT { left: 0, top: 0, right: 0, bottom: 0 };
            let ok = DwmGetWindowAttribute(
                hwnd,
                DWMWA_EXTENDED_FRAME_BOUNDS as u32,
                &mut r as *mut RECT as *mut c_void,
                std::mem::size_of::<RECT>() as u32,
            );
            if ok != 0 || r.right - r.left < 200 || r.bottom - r.top < 100 {
                return None;
            }
            Some(WinRect { id: hwnd as isize, left: r.left, top: r.top, right: r.right, bottom: r.bottom })
        }
    }

    pub fn foreground() -> Option<WinRect> {
        // SAFETY：只讀取前景視窗代號與所屬程式
        unsafe {
            let hwnd = GetForegroundWindow();
            if hwnd.is_null() {
                return None;
            }
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid == std::process::id() || SKIP_CLASSES.contains(&class_name(hwnd).as_str()) {
                return None;
            }
            rect_of(hwnd)
        }
    }

    pub fn window(id: isize) -> Option<WinRect> {
        rect_of(id as HWND)
    }
}

/// 非 Windows：沒有這個功能
#[cfg(not(windows))]
mod imp {
    use super::WinRect;
    pub fn foreground() -> Option<WinRect> {
        None
    }
    pub fn window(_id: isize) -> Option<WinRect> {
        None
    }
}
