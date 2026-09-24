//! 造型系統
//!
//! 會去兩個地方找造型資料夾（每個資料夾裡要有 manifest.json + 精靈圖）：
//!   1. 程式內建：安裝目錄下的 skins/（建置時從 repo 的 skins/ 複製過去）
//!   2. 使用者自訂：%APPDATA%\tw.deskpet.kankan\skins\（不用重新建置就能加）
//! 同名時以使用者自訂的為準。

use crate::storage::data_dir;
use base64::Engine;
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

/// 內建預設造型直接編進程式裡：就算安裝目錄找不到 skins/ 資料夾，柑柑也一定能出現
const EMBEDDED_MANIFEST: &str = include_str!("../../skins/default/manifest.json");
const EMBEDDED_SPRITE: &[u8] = include_bytes!("../../skins/default/sprite.png");

fn to_data_url(bytes: &[u8]) -> String {
    format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(bytes)
    )
}

#[derive(Serialize, Clone)]
pub struct SkinInfo {
    pub id: String,
    pub name: String,
    pub author: String,
    /// 各語言的名字（manifest.json 的 names），沒有就用 name
    pub names: Value,
}

impl SkinInfo {
    pub fn display_name(&self, lang: &str) -> &str {
        self.names[lang].as_str().unwrap_or(&self.name)
    }
}

/// 造型所在的根資料夾（內建在前、使用者在後）
fn skin_roots(app: &AppHandle) -> Vec<PathBuf> {
    let mut roots = Vec::new();
    if let Ok(p) = app.path().resolve("skins", BaseDirectory::Resource) {
        roots.push(p);
    }
    if let Ok(p) = data_dir(app) {
        roots.push(p.join("skins"));
    }
    roots
}

/// 造型 id 只能是英數字、- 和 _，避免 "../" 這類路徑跑出資料夾
fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

/// 找到某個造型的資料夾
pub fn find_skin_dir(app: &AppHandle, id: &str) -> Option<PathBuf> {
    if !valid_id(id) {
        return None;
    }
    skin_roots(app)
        .into_iter()
        .rev() // 使用者資料夾優先
        .map(|root| root.join(id))
        .find(|dir| dir.join("manifest.json").exists())
}

pub fn read_manifest(dir: &PathBuf) -> Option<Value> {
    let text = fs::read_to_string(dir.join("manifest.json")).ok()?;
    serde_json::from_str(&text).ok()
}

/// 列出所有造型
pub fn list(app: &AppHandle) -> Vec<SkinInfo> {
    let mut skins: Vec<SkinInfo> = Vec::new();
    for root in skin_roots(app) {
        let Ok(entries) = fs::read_dir(&root) else { continue };
        for entry in entries.flatten() {
            let id = entry.file_name().to_string_lossy().to_string();
            if !valid_id(&id) {
                continue;
            }
            let Some(m) = read_manifest(&entry.path()) else { continue };
            let info = SkinInfo {
                name: m["name"].as_str().unwrap_or(&id).to_string(),
                author: m["author"].as_str().unwrap_or("").to_string(),
                names: m["names"].clone(),
                id: id.clone(),
            };
            // 同 id 後面的（使用者資料夾）覆蓋前面的
            skins.retain(|s| s.id != id);
            skins.push(info);
        }
    }
    // 資料夾裡找不到預設造型時，補上內建的那一個
    if !skins.iter().any(|s| s.id == "default") {
        let m: Value = serde_json::from_str(EMBEDDED_MANIFEST).unwrap_or_default();
        skins.push(SkinInfo {
            id: "default".into(),
            name: "柑柑（預設）".into(),
            author: "desk-pet".into(),
            names: m["names"].clone(),
        });
    }
    // 預設造型排第一，其餘照名字排
    skins.sort_by(|a, b| (a.id != "default").cmp(&(b.id != "default")).then(a.name.cmp(&b.name)));
    skins
}

#[tauri::command]
pub fn list_skins(app: AppHandle) -> Vec<SkinInfo> {
    list(&app)
}

/// 讀取造型：回傳 manifest 和圖片（轉成 data URL，前端可以直接當 <img> 來源）
#[tauri::command]
pub fn load_skin(app: AppHandle, id: String) -> Result<Value, String> {
    let Some(dir) = find_skin_dir(&app, &id).or_else(|| find_skin_dir(&app, "default")) else {
        // 硬碟上完全找不到造型 → 使用編進程式裡的預設造型
        let manifest: Value = serde_json::from_str(EMBEDDED_MANIFEST).map_err(|e| e.to_string())?;
        return Ok(serde_json::json!({ "manifest": manifest, "image": to_data_url(EMBEDDED_SPRITE) }));
    };
    let manifest = read_manifest(&dir).ok_or("manifest.json 格式錯誤")?;

    let image_name = manifest["image"].as_str().unwrap_or("sprite.png");
    if image_name.contains("..") || image_name.contains('/') || image_name.contains('\\') {
        return Err("manifest.json 的 image 只能填同資料夾內的檔名".into());
    }
    let bytes = fs::read(dir.join(image_name)).map_err(|e| format!("讀不到精靈圖：{e}"))?;
    Ok(serde_json::json!({ "manifest": manifest, "image": to_data_url(&bytes) }))
}

/// 目前造型的角色個性（manifest.json 的 persona.<語言>），沒有就回傳 None
pub fn persona(app: &AppHandle, id: &str, lang: &str) -> Option<String> {
    let manifest = match find_skin_dir(app, id).or_else(|| find_skin_dir(app, "default")) {
        Some(dir) => read_manifest(&dir)?,
        None => serde_json::from_str(EMBEDDED_MANIFEST).ok()?,
    };
    manifest["persona"][lang].as_str().map(str::to_string)
}
