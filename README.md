# PicklePoints — 匹克球聯賽管理平台

> 多屆賽事管理 · 即時計分 · 積分排行榜 · 多裝置同步

## 功能

- **多屆賽事管理**：建立並切換不同屆次的聯賽
- **隊伍與隊員管理**：支援男雙 / 女雙 / 混雙三個組別
- **賽程建立**：自由配對對陣組合，依組別與輪次分類
- **即時計分**：符合標準匹克球雙打計分規則，含語音播報（繁體中文）、Undo 復原、螢幕常亮
- **積分排行榜**：勝 +2 分、負 +1 分，即時更新
- **後台管理**：密碼保護的管理介面（SHA-256 雜湊）
- **多裝置同步**：資料儲存於 Firebase Firestore，即時同步所有裝置
- **PWA**：可安裝至手機主畫面，支援離線殼層

## 技術棧

| 層次 | 技術 |
|------|------|
| 前端 | HTML5 / CSS3 / Vanilla JS (ES Modules) |
| 資料庫 | Firebase Firestore (Web v10 modular SDK) |
| 即時同步 | Firestore `onSnapshot` |
| 語音 | Web Speech API (zh-TW) |
| 安全 | `crypto.subtle` SHA-256 密碼雜湊 |
| PWA | Web App Manifest + Service Worker |

## 專案結構

```
PicklePoints/
├── index.html          # 首頁：賽事列表
├── tournament.html     # 賽事詳情：賽程表 + 排行榜
├── scoreboard.html     # 即時計分盤
├── admin.html          # 管理後台
├── css/style.css       # 共用樣式
├── js/
│   ├── firebase-config.js
│   ├── db.js           # Firestore CRUD
│   ├── scoring.js      # 計分純函式
│   ├── speech.js       # 語音播報
│   └── auth.js         # 密碼驗證
├── manifest.json
└── service-worker.js
```

## 本地啟動

需要透過 HTTP server 執行（ES Modules 與 Firebase 不支援 `file://`）。

```bash
npx http-server . -p 3000 --cors
```

瀏覽器開啟：`http://127.0.0.1:3000/index.html`

> Windows 請使用 `127.0.0.1` 而非 `localhost`，避免 IPv6 解析問題。

## Firebase 設定

1. 前往 [Firebase Console](https://console.firebase.google.com) 建立專案
2. 啟用 Firestore Database（正式版模式）
3. 將 Web App config 填入 `js/firebase-config.js`
4. Firestore 規則（開發期間）：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## 使用流程

1. 開啟 `admin.html` → 首次登入時設定管理員密碼
2. 新增賽事 → 點「隊伍」新增各組隊伍
3. 點「查看」進入賽事 → 點「+」新增比賽對陣
4. 點比賽卡片進入計分盤 → 開始計分
5. 比賽結束後積分自動更新至排行榜

## 計分規則

標準匹克球雙打：

- 顯示格式：`發球方 - 接球方 - 發球號碼`
- 開局：`0-0-2`
- 發球方得分 → 繼續發球
- 發球方失分 → 第 1 發球換第 2 發球；第 2 發球換邊（Side-out）
- 勝利：率先 11 分且領先 ≥ 2 分
