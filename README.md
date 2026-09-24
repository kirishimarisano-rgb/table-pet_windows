# desk-pet：Windows 桌面寵物

![柑柑](app-icon.png) ![小奏](skins/kanade/preview.png) ![栞](skins/shiori/preview.png)

住在 Windows 桌面上的小夥伴。會走來走去、打瞌睡、陪你專心工作，
也能幫你記待辦、跑番茄鐘、提醒事情。如果填了 Anthropic API 金鑰，還可以跟牠聊天，
請牠幫你新增待辦、設提醒。

內建三個角色：橘色小貓「**柑柑**」、夜空小精靈「**小奏**」、書籤女孩「**栞**」，也可以加入你自己的角色。
介面、台詞、聊天都支援**繁體中文、日本語、English**。

使用 [Tauri 2](https://tauri.app/) 製作，後端是 Rust，前端是 TypeScript，沒有用前端框架。

---

## 角色

### 柑柑（預設）

柑柑是一隻橘色小貓，圓滾滾的，看起來就像一顆剛摘下來的蜜柑，頭上還長著一片小葉子。
傳說牠是從冬天暖桌上那籃橘子裡滾出來的，因為太喜歡暖呼呼的地方，就住進了你的螢幕角落。

- **個性**：溫暖、黏人、有一點小迷糊
- **你在忙**：安靜陪著你，偶爾小聲加油
- **你離開太久**：縮成一團睡著，頭上冒出小 z
- **太晚還不睡**：擔心地碎碎念
- **你完成待辦**：開心得跳起來，身邊冒出星星
- **口頭禪**：「……喵～」
- **喜歡**：暖桌、陽光、被摸頭　**討厭**：熬夜、被拎太久

### 小奏

小奏是一部還沒寫完的偉大作品（opus）的最後一頁化成的小精靈。
身體是圓圓的一團夜空靛藍，頭上插著一支羽毛筆，脖子圍著羊皮紙圍巾，
身邊總漂浮著一盞小小的星燈。那是牠的靈感，想事情的時候就會變亮。

- **個性**：沉穩、細心、溫柔、誠實，喜歡把複雜的事拆成一小步一小步，不知道的事會老實說不知道
- **會漂浮**：沒有腳，走路時是在空中飄
- **聊天時**：等待回覆的時候會進入「思考中」動畫，星燈一閃一閃
- **口頭禪**：「讓我想一想。」
- **喜歡**：安靜的深夜、整理好的待辦、好問題　**討厭**：被催促、沒存檔

### 栞（しおり）

栞原本是夾在一本讀到一半的書裡的書籤，某天醒來變成了女孩。
淺米色的長捲髮、一根壓不下去的呆毛，頭上別著橘色的星芒花髮夾，穿著白襯衫和滾金邊的咖啡色短斗篷。
她是 64×64 的高清像素角色。

- **個性**：好奇、體貼、誠實、思考周到。喜歡想法、文字和好問題，不確定的事會直說
- **想事情時**：會歪著頭，頭上冒出小小的思考泡泡
- **書籤的工作是記住你讀到哪裡**，所以她也會幫你記住工作做到哪裡
- **口頭禪**：「嗯……我想想。」

每個角色都有自己的台詞和聊天個性，換角色就換說話方式。

柑柑、小奏、栞都不是模仿既有品牌的吉祥物或角色。

---

## 功能

| 功能 | 說明 |
|---|---|
| 基本行為 | 狀態機：閒置、走路、睡覺、被拖曳、點擊反應、思考中、被摸頭、吃點心、坐在視窗上 |
| 互動 | 摸頭、餵點心（每天 3 次）、好感度（越常互動越親密） |
| 坐在視窗上 | 會跳到你正在用的視窗上緣坐著，視窗移動會跟著走，關掉就掉下來；拖曳放開時有重力 |
| 電腦互動 | 用 Windows 閒置時間 API 判斷你在忙還是離開了。**只讀閒置秒數，不記錄任何按鍵內容** |
| 台詞 | 依情境分類（打招呼、閒置、深夜、完成待辦…），每個語言一個檔案，角色可以有專屬台詞 |
| 多語系 | 繁體中文、日本語、English，在設定的「一般」切換 |
| 待辦／番茄鐘／提醒 | 資料都存在本機的 JSON 檔 |
| Claude 對話 | 點角色打開對話泡泡。角色知道你的待辦和番茄鐘狀態，可以幫你新增／完成待辦、設提醒、開番茄鐘。沒有填金鑰時，這個功能會自動隱藏 |
| Claude app 聯動 | 對話可以「在 Claude 繼續」；沒有 API 金鑰也能開啟「在 Claude 開新對話」模式 |
| 開機自動啟動 | 在設定的「一般」打開 |
| 角色 | 內建柑柑、小奏、栞，可以從托盤切換；「角色工作室」可以用一張圖做出自己的角色 |
| 托盤與設定 | 右下角托盤選單，加上一個設定視窗，管理以上所有功能 |

### 操作方式

- **左鍵點角色**：互動。有金鑰的話會打開聊天泡泡
- **滑鼠在頭上左右來回滑**（不按鍵）：摸摸頭
- **按住拖曳**：把角色搬到別的地方
- **右鍵點角色**：小選單（聊天、餵點心、番茄鐘、開啟 Claude、設定）
- **托盤圖示右鍵**：顯示或隱藏、打招呼、餵點心、切換角色、番茄鐘、設定、結束

角色周圍透明的地方可以直接點到後面的視窗，不會擋住你操作。

---

## 在 Windows 上建置

### 1. 安裝需要的工具（只要裝一次）

1. **Node.js 20 以上**：到 <https://nodejs.org/> 下載 LTS 版本
2. **Rust**：到 <https://rustup.rs/> 下載 `rustup-init.exe`，執行後一路按 Enter
3. **Microsoft C++ Build Tools**：到 <https://visualstudio.microsoft.com/visual-cpp-build-tools/> 下載，
   安裝時勾選「**使用 C++ 的桌面開發**」
4. **WebView2**：Windows 10、11 通常已經內建，不用另外裝

### 2. 下載專案並安裝套件

```powershell
git clone https://github.com/kirishimarisano-rgb/table-pet_windows.git
cd table-pet_windows
npm install
```

### 3. 開發模式（改程式馬上看結果）

```powershell
npm run tauri dev
```

第一次會編譯比較久，大約 3～10 分鐘。之後就快很多。

### 4. 打包成安裝檔

```powershell
npm run tauri build
```

完成後，安裝檔在：

- `src-tauri\target\release\bundle\nsis\desk-pet_0.1.0_x64-setup.exe`：一般安裝程式，**推薦用這個**
- `src-tauri\target\release\bundle\msi\desk-pet_0.1.0_x64_zh-TW.msi`：MSI 安裝檔（實際檔名可能略有不同）

### 用 GitHub Actions 自動打包

每次 push 到 GitHub，`.github/workflows/build.yml` 都會在 Windows 環境自動打包：

- 到 repo 的 **Actions** 分頁，點最新一次執行，在最下面的 **Artifacts** 下載 `desk-pet-windows`
- 推送 `v` 開頭的 tag（例如 `git tag v0.1.0 && git push --tags`），會自動建立 Release 並附上安裝檔

---

## 資料存在哪裡？

所有資料都在這台電腦上：

```
%APPDATA%\tw.deskpet.kankan\
├─ settings.json    設定
├─ todos.json       待辦
├─ reminders.json   提醒
├─ stats.json       好感度、餵食紀錄
├─ lines\           共用台詞（zh-TW.json / ja.json / en.json，第一次使用時從內建版本複製過來）
├─ secrets.json     API 金鑰（只有你的電腦上有）
└─ skins\           自訂角色
```

在設定視窗的「一般」分頁按「**開啟資料夾**」就能直接打開這個資料夾。
想找這個路徑，也可以在檔案總管的網址列貼上 `%APPDATA%\tw.deskpet.kankan`。

---

## 如何新增台詞

台詞分成兩層：

- **共用台詞**：資料夾裡的 `lines\zh-TW.json`、`lines\ja.json`、`lines\en.json`，所有角色共用
- **角色專屬台詞**：角色資料夾裡的 `lines\<語言>.json`。這裡有的分類會取代共用的，沒有的就沿用共用台詞
  （例如小奏的 `skins/kanade/lines/`）

新增共用台詞的步驟：

1. 打開設定視窗，切到「**台詞**」分頁，按「**開啟資料夾**」
2. 用記事本（或 VS Code）打開 `lines` 資料夾裡你使用的語言檔，例如 `zh-TW.json`
3. 在想要的分類裡加一句。**句子之間要用逗號隔開，最後一句後面不能有逗號**：

```json
"idle": [
  "喵～（伸懶腰）",
  "記得喝水喵！",
  "這是我新加的台詞喵！"
]
```

4. 存檔，回到設定視窗按「**重新載入**」

### 內建的分類

| 分類 | 什麼時候說 |
|---|---|
| `greeting`、`greeting_morning`、`greeting_afternoon`、`greeting_evening` | 啟動時打招呼 |
| `idle` | 定期自言自語 |
| `busy` | 你正在打字或操作時 |
| `away_return` | 你離開後回來 |
| `late_night` | 深夜 23:00～05:00 |
| `todo_done`、`todo_all_done` | 完成待辦、完成全部待辦 |
| `click`、`drag`、`drop` | 被點、被拎起來、被放下 |
| `pomodoro_start`、`pomodoro_break`、`pomodoro_break_end` | 番茄鐘 |
| `reminder` | 提醒的開頭，後面會接上提醒內容 |
| `pet`、`feed`、`feed_full`、`love_up` | 被摸頭、吃點心、吃太飽、好感度升級 |

- 想恢復原本的台詞，按「**還原預設台詞**」
- 想改「內建」的台詞，也就是給其他人的預設值，可以編輯 repo 的 `lines/` 資料夾，然後重新建置

新增一個自己的分類很容易，在 JSON 裡加一個新的 key 就行。
不過要讓柑柑在特定時機說出這個分類，需要改程式：在 `src/main.ts` 呼叫 `say("你的分類")`。

---

## 如何做自己的角色

📘 **完整教學請看 [角色設計手冊](docs/CHARACTER_GUIDE.md)**（[日本語](docs/CHARACTER_GUIDE.ja.md)｜[English](docs/CHARACTER_GUIDE.en.md)）

打開設定 →「角色」→「**角色工作室**」，三種方法任選：

1. **用圖片做**：最簡單。只要一張去背的 PNG，程式會自動加上彈跳、搖晃、小表情讓它動起來
2. **畫像素精靈圖**：按一下就會建立範本，裡面有透明畫布、參考格線和設定檔。用 Aseprite、Piskel 等軟體畫好就能用
3. **匯入別人分享的角色**：選擇對方的角色資料夾

角色會用到的動作有九種：

- 閒置、走路、睡覺
- 被拎起來、開心、思考中
- 被摸頭、吃點心、坐在視窗上

最少只要「閒置」一種，其他沒畫的會自動用相近的動作代替。

做好的角色都存在 `%APPDATA%\tw.deskpet.kankan\skins\`，只有你的電腦上有。
想分享給別人，就把角色資料夾壓成 zip 傳出去。

### 修改內建角色

柑柑、小奏、栞的像素圖都是用程式畫的：

- 柑柑：`scripts/gen-default-skin.mjs`，執行 `npm run gen:skin`
- 小奏：`scripts/gen-kanade-skin.mjs`，執行 `node scripts/gen-kanade-skin.mjs`
- 栞：`scripts/gen-shiori-skin.mjs`，執行 `node scripts/gen-shiori-skin.mjs`
- 共用的繪圖工具：`scripts/pixel.mjs`
- 像素範本：`scripts/gen-template.mjs` 會產生 `templates/skin-template/`

想更新程式圖示，再執行 `npx tauri icon app-icon.png -o src-tauri/icons`。

## 如何填 Anthropic API 金鑰（Claude 對話）

1. 到 <https://console.anthropic.com/> 註冊並建立 API 金鑰。金鑰以 `sk-ant-` 開頭。
   使用 API 會依用量付費。
2. 右鍵點柑柑，打開設定，切到「**Claude**」分頁
3. 把金鑰貼進輸入框，按「**儲存金鑰**」
4. 左鍵點柑柑，就會出現對話泡泡

### 關於安全

- 金鑰只存在你電腦上的 `%APPDATA%\tw.deskpet.kankan\secrets.json`，**不會寫進這個 repo**
- 金鑰只有 Rust 後端會讀取，網頁介面拿不到金鑰本身，只知道「有沒有設定」
- `.gitignore` 已經排除 `secrets.json`、`.env`，避免不小心 commit
- 不想用了就按「**刪除金鑰**」。聊天功能會自動隱藏
- 對話紀錄只存在記憶體裡，關掉程式就消失

### 可以請角色幫忙做事

聊天時，角色會知道現在的時間、你的待辦清單、番茄鐘狀態，所以可以直接說：

- 「幫我新增待辦：寫報告」
- 「寫報告那件做完了」
- 「明天早上 9 點提醒我開會」／「每天下午 3 點提醒我喝水」
- 「開始番茄鐘」／「停止番茄鐘」

角色會修改本機的 JSON，設定視窗也會馬上更新。

### 和 Claude app 搭配

API 金鑰（按用量付費）和 Claude 的訂閱方案是**分開的**。

- **有金鑰時**：聊過天之後，對話泡泡下方會出現「↗ 在 Claude 繼續」，會把最近的對話帶到 claude.ai 開新對話
- **沒有金鑰時**：到設定的「Claude」分頁打開「沒有金鑰時，改成『在 Claude 開新對話』」。
  之後點角色輸入問題，就會在 claude.ai 開新對話，問題已經幫你填好
- 右鍵小選單和托盤選單都有「開啟 Claude」

目前是用瀏覽器打開 claude.ai。

### 對話設定

- **模型**：預設是 `claude-sonnet-5`，也可以改成 `claude-opus-5`（比較聰明、比較貴）
  或 `claude-haiku-4-5`（最快、最便宜）
- **思考程度（effort）**：預設 `medium`。`low` 比較快、比較省，`high` 會想得比較多

---

## 專案結構

```
├─ index.html              桌寵主視窗
├─ settings.html           設定視窗
├─ lines/                  內建共用台詞（三種語言）
├─ skins/default/          內建角色：柑柑
├─ skins/kanade/           內建角色：小奏（含專屬台詞）
├─ skins/shiori/           內建角色：栞（64×64 高清像素）
├─ scripts/                用程式畫角色像素圖（pixel.mjs 是共用工具）、隱私檢查
├─ templates/skin-template/ 像素角色範本（角色工作室「方法 2」會複製這份）
├─ docs/                   角色設計手冊（三種語言）
├─ src/                    前端（TypeScript）
│  ├─ main.ts              桌寵主程式：把下面各模組接起來
│  ├─ pet/
│  │  ├─ stateMachine.ts   狀態機：什麼時候閒置、走路、睡覺…
│  │  ├─ animator.ts       播放精靈圖動畫
│  │  ├─ movement.ts       移動視窗、走路、拖曳
│  │  ├─ clickthrough.ts   透明處讓滑鼠穿透
│  │  ├─ activity.ts       判斷使用者在忙或離開
│  │  ├─ pomodoro.ts       番茄鐘計時
│  │  ├─ reminders.ts      檢查提醒時間
│  │  ├─ stats.ts          好感度、餵食
│  │  └─ petting.ts        摸頭偵測
│  ├─ bubble/
│  │  ├─ speech.ts         台詞泡泡
│  │  └─ chat.ts           Claude 對話泡泡
│  ├─ settings/            設定視窗各分頁
│  └─ common/              共用：API 呼叫、設定、台詞、事件名稱、多語系（i18n.ts）
└─ src-tauri/              後端（Rust）
   ├─ tauri.conf.json      視窗設定（透明、無邊框、置頂）
   └─ src/
      ├─ main.rs           進入點
      ├─ storage.rs        本機 JSON 讀寫
      ├─ idle.rs           Windows 閒置秒數
      ├─ perch.rs          讀取前景視窗位置（坐在視窗上用）
      ├─ lines.rs          台詞檔
      ├─ skins.rs          造型
      ├─ claude.rs         Claude API 與金鑰
      └─ tray.rs           托盤選單、開啟設定視窗
```

### 想改行為的話，從這裡開始看

- **多久會開始走路、走多久**：`src/pet/stateMachine.ts` 的 `set()` 和 `update()`
- **走路速度**：`src/pet/movement.ts` 的 `step()`
- **角色聊天時的個性**：角色資料夾 `manifest.json` 的 `persona`
- **Claude 可以用的工具**：`src-tauri/src/claude.rs` 的 `tool_definitions()` 和 `run_tool()`
- **介面文字、翻譯**：`src/common/i18n.ts`
- **托盤選單內容**：`src-tauri/src/tray.rs` 的 `build_menu()`

---

## 隱私說明

- 閒置偵測只呼叫 Windows 的 `GetLastInputInfo`，拿到的只有「最後一次操作是什麼時候」，
  **不會、也無法知道你按了哪些鍵**
- 「坐在視窗上」只讀取目前使用中視窗的**位置和大小**，不會讀取視窗標題或內容
- 所有資料都存在本機。唯一的網路連線是你主動使用 Claude 對話時，呼叫 `api.anthropic.com`

---

## 公開給別人用，同時保留自己的版本

大家安裝的是同一個程式。你私人的東西都在自己電腦上，不會進 repo：

| 公開（在 repo 裡） | 只在你電腦上（`%APPDATA%\tw.deskpet.kankan\`） |
|---|---|
| 程式、柑柑、小奏、栞、預設台詞 | 你自己加的角色、你改過的台詞、設定、待辦、好感度、API 金鑰 |

所以只要把自己的角色和台詞放在右邊那個資料夾，就是「你的版本」，不用維護兩份程式碼。

### 公開與私人怎麼分開（安全機制）

一共有五層保護，任何一層擋下來就不會外流：

1. **放的位置**：私人資料都在 `%APPDATA%`，根本不在 repo 資料夾裡
2. **`.gitignore`**：`skins/` 裡只有 `default`、`kanade`、`shiori` 會被 git 追蹤；`secrets.json`、`.env` 一律忽略
3. **commit 前自動檢查**：在自己電腦上執行一次 `npm run setup-hooks`，之後每次 commit 都會跑
   `scripts/check-privacy.mjs`。它會擋下三種東西：私人角色、金鑰檔，以及內容裡有 `sk-ant-` 金鑰的檔案
4. **GitHub Actions 檢查**：每次 push 都會先跑同一個隱私檢查，沒通過就不打包
5. **安裝檔只包公開角色**：`tauri.conf.json` 只列出 `skins/default`、`skins/kanade`、`skins/shiori`，
   所以就算你在自己電腦上建置，再把安裝檔分享出去，私人角色也不會被包進去

想把某個角色改成公開，要改三個地方：

- `scripts/check-privacy.mjs` 的 `PUBLIC_SKINS`
- `.gitignore`
- `src-tauri/tauri.conf.json` 的 `resources`

另外建議在 GitHub repo 的 **Settings → Code security** 打開 **Secret scanning** 和 **Push protection**。
這樣萬一金鑰被 push，GitHub 也會擋下來。

### 公開發佈的步驟

1. 在 GitHub 的 repo 設定把 repo 改成 **Public**
2. 推送版本 tag，GitHub Actions 會自動建立 Release 並附上安裝檔：
   ```powershell
   git tag v0.2.0
   git push origin v0.2.0
   ```
3. 把 Release 頁面的網址分享給別人

安裝檔沒有數位簽章，所以瀏覽器和 Windows 會跳警告。處理方式如下：

- **Chrome**：在下載清單裡按「保留」
- **Windows SmartScreen**：按「其他資訊」，再按「仍要執行」

---

## 授權

程式碼以 [MIT License](LICENSE) 授權。柑柑、小奏、栞的角色設計也一併以 MIT 提供。
