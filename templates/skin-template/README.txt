像素角色範本 / ドット絵キャラのテンプレート / Pixel pet template
====================================================================

[繁體中文]
1. 用任何繪圖軟體（Aseprite、Piskel、LibreSprite、小畫家 3D…）打開 sprite.png。
   guide.png 是參考格線，可以放在下層當底圖，但最後存檔時 sprite.png 要是透明背景。
2. 每一格 32×32 像素，每一列是一個動作（由上到下）：
     0 idle 閒置 / 1 walk 走路 / 2 sleep 睡覺 / 3 drag 被拎起來
     4 react 開心 / 5 think 思考中 / 6 pet 被摸頭 / 7 eat 吃點心 / 8 sit 坐在視窗邊
   畫幾格就把 manifest.json 裡的 "frames" 改成幾格；不想畫的動作可以整列刪掉，會自動用相近的動作代替。
3. 角色面向「左邊」，腳踩在 guide.png 的深色地面線上。
4. 修改 manifest.json 的 names（名字）、bio（介紹）、persona（聊天個性）。
5. 回到 desk-pet 設定 →「角色」→「重新掃描」，就能選到這個角色。
完整說明：docs/CHARACTER_GUIDE.md

[日本語]
sprite.png に描いてください（背景は透明のまま）。guide.png は下書き用のガイドです。
1マス 32×32、上から idle / walk / sleep / drag / react / think / pet / eat / sit。
キャラクターは「左向き」。描き終わったら設定 →「キャラクター」→「再スキャン」。
詳しくは docs/CHARACTER_GUIDE.ja.md

[English]
Draw on sprite.png (keep the background transparent). guide.png is a reference grid.
Cells are 32x32; rows from top: idle / walk / sleep / drag / react / think / pet / eat / sit.
Face LEFT. When done: Settings → Characters → Rescan.
Full guide: docs/CHARACTER_GUIDE.en.md
