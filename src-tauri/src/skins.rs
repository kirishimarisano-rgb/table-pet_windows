//! 造型系統
//!
//! 會去兩個地方找造型資料夾（每個資料夾裡要有 manifest.json + 精靈圖）：
//!   1. 程式內建：安裝目錄下的 skins/（建置時從 repo 的 skins/ 複製過去）
//!   2. 使用者自訂：%APPDATA%\tw.deskpet.kankan\skins\（不用重新建置就能加）
//! 同名時以使用者自訂的為準。

use crate::storage::data_dir;
use base64::Engine;
use serde::Serialize;
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

/// 內建角色直接編進程式裡：就算安裝目錄找不到 skins/ 資料夾，內建角色也一定能出現
pub struct Builtin {
    pub id: &'static str,
    pub manifest: &'static str,
    pub sprite: &'static [u8],
    /// 角色專屬台詞：(語言, 內容)
    pub lines: &'static [(&'static str, &'static str)],
}

pub const BUILTINS: &[Builtin] = &[
    Builtin {
        id: "default",
        manifest: include_str!("../../skins/default/manifest.json"),
        sprite: include_bytes!("../../skins/default/sprite.png"),
        lines: &[],
    },
    Builtin {
        id: "kanade",
        manifest: include_str!("../../skins/kanade/manifest.json"),
        sprite: include_bytes!("../../skins/kanade/sprite.png"),
        lines: &[
            ("zh-TW", include_str!("../../skins/kanade/lines/zh-TW.json")),
            ("ja", include_str!("../../skins/kanade/lines/ja.json")),
            ("en", include_str!("../../skins/kanade/lines/en.json")),
        ],
    },
    Builtin {
        id: "shiori",
        manifest: include_str!("../../skins/shiori/manifest.json"),
        sprite: include_bytes!("../../skins/shiori/sprite.png"),
        lines: &[
            ("zh-TW", include_str!("../../skins/shiori/lines/zh-TW.json")),
            ("ja", include_str!("../../skins/shiori/lines/ja.json")),
            ("en", include_str!("../../skins/shiori/lines/en.json")),
        ],
    },
];

pub fn builtin(id: &str) -> Option<&'static Builtin> {
    BUILTINS.iter().find(|b| b.id == id)
}

/// 編進程式裡的角色專屬台詞
pub fn builtin_lines(id: &str, lang: &str) -> Option<&'static str> {
    builtin(id)?.lines.iter().find(|(l, _)| *l == lang).map(|(_, text)| *text)
}

fn builtin_manifest(b: &Builtin) -> Value {
    serde_json::from_str(b.manifest).unwrap_or_default()
}

/// 支援的圖片格式
const IMAGE_EXTS: &[&str] = &["png", "jpg", "jpeg", "webp", "gif"];
/// 單張圖片大小上限（避免不小心選到超大檔案）
const MAX_IMAGE_BYTES: u64 = 10 * 1024 * 1024;

fn mime_of(name: &str) -> &'static str {
    match name.rsplit('.').next().unwrap_or("").to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/png",
    }
}

fn to_data_url_typed(bytes: &[u8], mime: &str) -> String {
    format!("data:{mime};base64,{}", base64::engine::general_purpose::STANDARD.encode(bytes))
}

fn to_data_url(bytes: &[u8]) -> String {
    to_data_url_typed(bytes, "image/png")
}

/// manifest 裡的圖片檔名只能是同資料夾內的檔案
fn safe_file_name(name: &str) -> bool {
    !name.is_empty() && !name.contains("..") && !name.contains('/') && !name.contains('\\')
}

#[derive(Serialize, Clone)]
pub struct SkinInfo {
    pub id: String,
    pub name: String,
    pub author: String,
    /// 各語言的名字（manifest.json 的 names），沒有就用 name
    pub names: Value,
    /// 是否是使用者自己加的角色（可以刪除）
    pub user: bool,
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
    let user_root = data_dir(app).ok().map(|d| d.join("skins"));
    for root in skin_roots(app) {
        let is_user = Some(&root) == user_root.as_ref();
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
                user: is_user,
            };
            // 同 id 後面的（使用者資料夾）覆蓋前面的
            skins.retain(|s| s.id != id);
            skins.push(info);
        }
    }
    // 資料夾裡找不到的內建角色，用編進程式裡的那一份補上
    for b in BUILTINS {
        if !skins.iter().any(|s| s.id == b.id) {
            let m = builtin_manifest(b);
            skins.push(SkinInfo {
                id: b.id.into(),
                name: m["name"].as_str().unwrap_or(b.id).to_string(),
                author: m["author"].as_str().unwrap_or("").to_string(),
                names: m["names"].clone(),
                user: false,
            });
        }
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
///   精靈圖模式：images = { "sheet": 整張精靈圖 }
///   圖片模式：  images = { "idle": …, "walk": …, … }（manifest 的 images 欄位列出各動作的檔名）
#[tauri::command]
pub fn load_skin(app: AppHandle, id: String) -> Result<Value, String> {
    // 硬碟上找不到 → 如果是內建角色，用編進程式裡的那一份；都不是就用柑柑
    let Some(dir) = find_skin_dir(&app, &id) else {
        let b = builtin(&id).unwrap_or(&BUILTINS[0]);
        return Ok(json!({ "manifest": builtin_manifest(b), "images": { "sheet": to_data_url(b.sprite) } }));
    };
    let manifest = read_manifest(&dir).ok_or("manifest.json 格式錯誤")?;
    let read = |name: &str| -> Result<String, String> {
        if !safe_file_name(name) {
            return Err(format!("圖片檔名只能是同資料夾內的檔案：{name}"));
        }
        let bytes = fs::read(dir.join(name)).map_err(|e| format!("讀不到圖片 {name}：{e}"))?;
        Ok(to_data_url_typed(&bytes, mime_of(name)))
    };

    let mut images = serde_json::Map::new();
    if manifest["mode"] == "image" {
        let list = manifest["images"].as_object().ok_or("圖片模式需要 images 欄位")?;
        for (anim, file) in list {
            if let Some(file) = file.as_str() {
                images.insert(anim.clone(), json!(read(file)?));
            }
        }
    } else {
        images.insert("sheet".into(), json!(read(manifest["image"].as_str().unwrap_or("sprite.png"))?));
    }
    Ok(json!({ "manifest": manifest, "images": images }))
}

// ---------------------------------------------------------------
// 角色工作室：建立、匯入、刪除自訂角色（都放在使用者資料夾的 skins/）
// ---------------------------------------------------------------

/// 從名字產生資料夾名稱（英數字保留，其他換成 -），重複的話加上數字
fn new_skin_id(app: &AppHandle, name: &str) -> Result<(String, PathBuf), String> {
    let root = data_dir(app)?.join("skins");
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let mut base: String = name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() { c.to_ascii_lowercase() } else { '-' })
        .collect::<String>()
        .trim_matches('-')
        .to_string();
    if base.is_empty() || base.chars().all(|c| c == '-') {
        base = "my-pet".into();
    }
    base.truncate(32);
    for n in 0..1000 {
        let id = if n == 0 { base.clone() } else { format!("{base}-{n}") };
        let dir = root.join(&id);
        if !dir.exists() && find_skin_dir(app, &id).is_none() && builtin(&id).is_none() {
            return Ok((id, dir));
        }
    }
    Err("找不到可用的資料夾名稱".into())
}

/// 用圖片建立角色（圖片模式）
/// images：{ 動作名稱: 圖片檔案路徑 }，至少要有 idle
#[tauri::command]
pub fn create_skin(
    app: AppHandle,
    name: String,
    images: std::collections::HashMap<String, String>,
    persona: String,
    bio: String,
) -> Result<String, String> {
    const ANIMS: &[&str] = &["idle", "walk", "sleep", "drag", "react", "think", "pet", "eat", "sit"];
    let name = name.trim();
    if name.is_empty() {
        return Err("請輸入名字".into());
    }
    if !images.contains_key("idle") {
        return Err("至少需要一張「閒置（idle）」的圖".into());
    }
    let (id, dir) = new_skin_id(&app, name)?;

    let mut files = serde_json::Map::new();
    let result = (|| -> Result<(), String> {
        fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        for (anim, src) in &images {
            if !ANIMS.contains(&anim.as_str()) {
                continue;
            }
            let src = PathBuf::from(src);
            let ext = src.extension().and_then(|e| e.to_str()).unwrap_or("").to_ascii_lowercase();
            if !IMAGE_EXTS.contains(&ext.as_str()) {
                return Err(format!("不支援的圖片格式：{}", src.display()));
            }
            let size = fs::metadata(&src).map_err(|e| e.to_string())?.len();
            if size > MAX_IMAGE_BYTES {
                return Err(format!("圖片太大（上限 10MB）：{}", src.display()));
            }
            let file = format!("{anim}.{ext}");
            fs::copy(&src, dir.join(&file)).map_err(|e| e.to_string())?;
            files.insert(anim.clone(), json!(file));
        }
        let per_lang = |text: &str| json!({ "zh-TW": text, "ja": text, "en": text });
        let mut manifest = json!({
            "name": name,
            "author": "",
            "mode": "image",
            "height": 128,
            "pixelated": false,
            "names": per_lang(name),
            "images": files,
        });
        if !persona.trim().is_empty() {
            manifest["persona"] = per_lang(persona.trim());
        }
        if !bio.trim().is_empty() {
            manifest["bio"] = per_lang(bio.trim());
        }
        let text = serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?;
        fs::write(dir.join("manifest.json"), text).map_err(|e| e.to_string())
    })();

    if let Err(e) = result {
        let _ = fs::remove_dir_all(&dir); // 失敗就清掉做到一半的資料夾
        return Err(e);
    }
    Ok(id)
}

/// 遞迴複製資料夾（最多兩層，只複製一般檔案）
fn copy_dir(from: &PathBuf, to: &PathBuf, depth: u32) -> Result<(), String> {
    fs::create_dir_all(to).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(from).map_err(|e| e.to_string())?.flatten() {
        let path = entry.path();
        let target = to.join(entry.file_name());
        let ft = entry.file_type().map_err(|e| e.to_string())?;
        if ft.is_dir() && depth < 2 {
            copy_dir(&path, &target, depth + 1)?;
        } else if ft.is_file() {
            fs::copy(&path, &target).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

/// 匯入別人分享的角色資料夾（裡面要有 manifest.json）
#[tauri::command]
pub fn import_skin_folder(app: AppHandle, path: String) -> Result<String, String> {
    let src = PathBuf::from(&path);
    let manifest = read_manifest(&src).ok_or("這個資料夾裡沒有正確的 manifest.json")?;
    let folder = src.file_name().and_then(|n| n.to_str()).unwrap_or("imported");
    let name = manifest["name"].as_str().unwrap_or(folder);
    let (id, dir) = new_skin_id(&app, if valid_id(folder) { folder } else { name })?;
    if let Err(e) = copy_dir(&src, &dir, 0) {
        let _ = fs::remove_dir_all(&dir);
        return Err(e);
    }
    Ok(id)
}

/// 建立一個像素精靈圖範本（空白格線 + manifest），給想自己畫精靈圖的人
#[tauri::command]
pub fn create_skin_template(app: AppHandle) -> Result<String, String> {
    let (id, dir) = new_skin_id(&app, "my-pixel-pet")?;
    fs::create_dir_all(dir.join("lines")).map_err(|e| e.to_string())?;
    fs::write(dir.join("sprite.png"), include_bytes!("../../templates/skin-template/sprite.png")).map_err(|e| e.to_string())?;
    fs::write(dir.join("guide.png"), include_bytes!("../../templates/skin-template/guide.png")).map_err(|e| e.to_string())?;
    fs::write(dir.join("manifest.json"), include_str!("../../templates/skin-template/manifest.json")).map_err(|e| e.to_string())?;
    fs::write(dir.join("README.txt"), include_str!("../../templates/skin-template/README.txt")).map_err(|e| e.to_string())?;
    fs::write(dir.join("lines").join("zh-TW.json"), include_str!("../../templates/skin-template/lines/zh-TW.json")).map_err(|e| e.to_string())?;
    // 直接打開資料夾讓使用者開始畫
    #[cfg(windows)]
    let _ = std::process::Command::new("explorer").arg(&dir).spawn();
    Ok(id)
}

/// 刪除使用者自己加的角色（內建角色不能刪）
#[tauri::command]
pub fn delete_skin(app: AppHandle, id: String) -> Result<(), String> {
    if !valid_id(&id) {
        return Err("不正確的角色 id".into());
    }
    let dir = data_dir(&app)?.join("skins").join(&id);
    if !dir.join("manifest.json").exists() {
        return Err("只能刪除自己加入的角色".into());
    }
    fs::remove_dir_all(&dir).map_err(|e| e.to_string())
}

/// 目前造型的角色個性（manifest.json 的 persona.<語言>），沒有就回傳 None
pub fn persona(app: &AppHandle, id: &str, lang: &str) -> Option<String> {
    let manifest = match find_skin_dir(app, id) {
        Some(dir) => read_manifest(&dir)?,
        None => builtin_manifest(builtin(id).unwrap_or(&BUILTINS[0])),
    };
    manifest["persona"][lang].as_str().map(str::to_string)
}
