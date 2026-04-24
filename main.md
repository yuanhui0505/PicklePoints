# PicklePoints — 匹克球聯賽管理平台

## 使用技術

### 前端
| 技術 | 用途 |
|------|------|
| HTML5 / CSS3 / Vanilla JS (ES Modules) | 頁面結構、樣式、互動邏輯 |
| Web Speech API (`SpeechSynthesisUtterance`) | 比分語音播報（zh-TW） |
| Screen Wake Lock API | 計分時防止螢幕熄滅 |
| PWA (Web App Manifest + Service Worker) | 可安裝為手機 App、離線殼層支援 |
| `crypto.subtle.digest` (SHA-256) | 管理員密碼雜湊驗證 |
| `sessionStorage` | 管理員登入狀態（頁籤層級） |

### 後端 / 資料庫
| 技術 | 用途 |
|------|------|
| Firebase Firestore (Web v10 modular SDK) | 即時資料同步、多裝置共享 |
| Firestore `onSnapshot` | 即時監聽賽事/比賽/隊伍變動 |
| Firestore `increment()` | 原子性更新隊伍積分 |
| IndexedDB Persistence | Firestore 離線快取 |

### 開發工具
| 工具 | 用途 |
|------|------|
| `npx http-server` | 本地靜態檔案伺服器 |
| Firebase Console | 專案設定、Firestore 規則管理 |

---

## 專案結構

```
PicklePoints/
├── index.html          # 首頁：賽事列表
├── tournament.html     # 賽事詳情：賽程表 + 排行榜
├── scoreboard.html     # 即時計分盤
├── admin.html          # 管理後台（密碼保護）
├── css/
│   └── style.css       # 共用樣式（黑底綠主題）
├── js/
│   ├── firebase-config.js  # Firebase 初始化
│   ├── db.js               # Firestore CRUD 封裝
│   ├── scoring.js          # 匹克球計分邏輯（純函式）
│   ├── speech.js           # 語音播報封裝
│   └── auth.js             # 密碼雜湊 / 登入狀態
├── manifest.json       # PWA 設定
├── service-worker.js   # 快取策略
├── icon-192.png
└── icon-512.png
```

---

## 啟動方式

### 本地開發
```bash
cd PicklePoints
npx http-server . -p 3000 --cors
```
瀏覽器開啟：`http://127.0.0.1:3000/index.html`

> **注意**：請使用 `127.0.0.1` 而非 `localhost`，Windows 的 `localhost` 可能解析到 IPv6 導致無法連線。

### Firestore 規則（開發期間）
Firebase Console → Firestore Database → 規則：
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

---

## 使用說明

### 一、首次設定（管理員）

1. 開啟 `http://127.0.0.1:3000/admin.html`
2. 看到「設定管理員密碼（首次使用）」提示
3. 輸入密碼（至少 4 字元）→ 登入
4. 密碼以 SHA-256 雜湊儲存至 Firestore `settings/admin`

### 二、建立賽事

1. 後台 → **新增賽事**
2. 填入名稱、年份、說明 → 建立
3. 賽事會出現在首頁列表，狀態顯示「進行中」

### 三、管理隊伍

1. 後台 → 點賽事旁的「隊伍」按鈕
2. **新增隊伍**：填入隊名、成員（逗號分隔）、選擇組別
   - 組別：男雙 / 女雙 / 混雙
3. 每支隊伍初始積分為 0

### 四、建立賽程

方式 A（從後台）：後台 → 點賽事旁的「查看」按鈕 → 進入賽事頁 → 點右下角「+」

方式 B（從首頁）：首頁點賽事 → 賽程表頁面 → 點「+」（需管理員登入狀態）

新增比賽時選擇：組別、隊伍 A、隊伍 B、輪次。

### 五、即時計分

1. 賽程表點任一比賽卡片 → 進入計分盤
2. **計分規則**（標準匹克球雙打）：
   - 顯示格式：`發球方分數 - 接球方分數 - 發球號碼`
   - 發球方得分：直接得 1 分，繼續發球
   - 發球方失分（Fault）：
     - 第 1 發球 → 換第 2 發球（同隊）
     - 第 2 發球 → 換邊（Side-out），對方從第 1 發球開始
   - 開局：0-0-2（直接第 2 發球）
   - 勝利條件：率先達 11 分且領先 ≥ 2 分
3. **語音播報**：每次得失分後自動念出比分（zh-TW）
4. **復原（Undo）**：回復上一步，最多 50 步
5. **重置**：將比賽歸零重新開始
6. 比賽結束後自動更新積分：勝隊 +2 分，敗隊 +1 分

### 六、排行榜

賽事頁 → 點「排行榜」頁籤

- 依積分降序排列
- 可按組別篩選（全部 / 男雙 / 女雙 / 混雙）
- 顯示：名次、隊名、成員、勝負場次、總積分

---

## 積分制度

| 結果 | 積分 |
|------|------|
| 勝 | +2 |
| 負 | +1 |
| 未打 | 0 |

---

## Firestore 資料結構

```
tournaments/{id}
  name, year, description, isActive, createdAt

tournaments/{id}/teams/{id}
  name, players[], category, points, wins, losses

tournaments/{id}/matches/{id}
  teamAId, teamAName, teamBId, teamBName
  category, round
  scoreA, scoreB, serverNum, servingTeam
  isFinished, winnerId, resultRecorded
  history[]   ← Undo 快照，最多 50 筆
  createdAt

settings/admin
  passwordHash   ← SHA-256 雜湊
```

---

## 注意事項

- **多裝置同步**：同一場比賽可在多個裝置同時觀看，計分即時同步；建議同時只有一人操作計分，避免衝突
- **密碼安全性**：目前為前端 SHA-256 驗證，適合防止誤操作；如需更強安全性可改用 Firebase Authentication
- **上線前**：記得收緊 Firestore Security Rules，避免任意寫入
