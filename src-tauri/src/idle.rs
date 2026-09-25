//! 使用者閒置偵測
//!
//! 只呼叫 Windows 的 GetLastInputInfo，取得「距離最後一次鍵盤／滑鼠輸入過了幾秒」。
//! 這個 API 只給一個時間點，拿不到你按了哪個鍵，本程式也不會記錄任何按鍵內容。

/// 回傳閒置秒數
#[tauri::command]
pub fn get_idle_seconds() -> u64 {
    idle_seconds()
}

#[cfg(windows)]
fn idle_seconds() -> u64 {
    use windows_sys::Win32::System::SystemInformation::GetTickCount;
    use windows_sys::Win32::UI::Input::KeyboardAndMouse::{GetLastInputInfo, LASTINPUTINFO};

    let mut info = LASTINPUTINFO {
        cbSize: std::mem::size_of::<LASTINPUTINFO>() as u32,
        dwTime: 0,
    };
    // SAFETY：只傳入自己的結構體指標，Windows 會把最後輸入時間填進去
    unsafe {
        if GetLastInputInfo(&mut info) == 0 {
            return 0;
        }
        // GetTickCount 約 49 天會繞回 0，用 wrapping_sub 就不會出錯
        (GetTickCount().wrapping_sub(info.dwTime) / 1000) as u64
    }
}

/// 非 Windows（例如在 Linux 開發時）一律當作使用者正在忙
#[cfg(not(windows))]
fn idle_seconds() -> u64 {
    0
}
