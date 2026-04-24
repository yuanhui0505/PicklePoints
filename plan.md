# PicklePoints 聯賽管理平台 — 重構計畫

## 一、現有程式碼分析

### 架構
| 項目 | 現狀 |
|------|------|
| 檔案 | 單一 `pickleball.html`（HTML + CSS + JS 全混合） |
| 資料儲存 | `localStorage`（單裝置，無共享） |
| 路由 | 手動 show/hide div |
| 狀態管理 | 全域變數 `matches[]` + `currentMatchId` |
| PWA | `manifest.json` + cache-first service worker |

### 保留功能（品質良好，直接移植）
- 匹克球計分規則：發球方 / 接球方 / 號碼，Fault → Sideout / 第二發球，比分 ≥ 11 且領先 ≥ 2 獲勝
- `SpeechSynthesisUtterance` 語音播報（zh-TW）
- Undo 歷史堆疊（`history[]` deep-copy）
- Wake Lock API
- PWA 離線殼層

### 痛點 / 擴充障礙
1. `localStorage` → 無法多人共享、跨裝置同步
2. 單頁巨型 HTML → 難以維護、測試
3. 無使用者身份 → 無法區分裁判 / 觀眾 / 管理員
4. 無賽事層級 → 無法管理多屆、分組
5. 無積分系統

---

## 二、目標架構

### 技術選型
| 層次 | 選擇 | 理由 |
|------|------|------|
| 前端 | Vanilla JS（ES Modules）+ 多頁 HTML | 零建置步驟；保持 PWA 簡單部署 |
| 樣式 | 共用 `css/style.css` | 統一設計系統；繼承現有黑底綠主題 |
| 資料庫 | Firebase Firestore（Web v9 modular SDK） | 即時同步、多裝置共享、免費額度充足 |
| 認證 | Firebase Anonymous Auth + 管理員密碼雜湊（SHA-256） | 輕量；不需使用者帳號 |
| PWA | Network-first（動態資料）+ Cache-first（靜態殼層） | 確保資料即時性同時支援離線殼層 |

### 資料模型（Firestore）

```
tournaments/{tournamentId}
  ├── name: string
  ├── year: number
  ├── description: string
  ├── isActive: boolean
  └── createdAt: Timestamp

tournaments/{tournamentId}/teams/{teamId}
  ├── name: string            # 隊名（例：小王/小明）
  ├── players: string[]       # 成員姓名
  ├── category: 'mens'|'womens'|'mixed'
  └── points: number          # 累積積分（快取，由 Cloud Function 或客戶端維護）

tournaments/{tournamentId}/matches/{matchId}
  ├── teamAId: string
  ├── teamBId: string
  ├── teamAName: string       # 冗餘欄位，加速渲染
  ├── teamBName: string
  ├── category: 'mens'|'womens'|'mixed'
  ├── round: number
  ├── scoreA: number
  ├── scoreB: number
  ├── serverNum: 1|2
  ├── servingTeam: 'A'|'B'
  ├── isFinished: boolean
  ├── winnerId: string|null
  ├── history: string[]       # JSON 序列化狀態快照（Undo 用）
  └── createdAt: Timestamp

settings/admin
  └── passwordHash: string    # SHA-256(adminPassword)
```

### 積分規則
| 結果 | 積分 |
|------|------|
| 勝 | 2 分 |
| 負 | 1 分 |
| 棄賽 / 未打 | 0 分 |

---

## 三、頁面與檔案結構

```
PicklePoints/
├── index.html              # 賽事列表（首頁）
├── tournament.html         # 賽事詳情（賽程表 + 排行榜）
├── scoreboard.html         # 即時計分盤
├── admin.html              # 後台管理（密碼保護）
├── manifest.json           # 更新 start_url
├── service-worker.js       # 更新快取策略
├── css/
│   └── style.css           # 共用設計系統
├── js/
│   ├── firebase-config.js  # Firebase 初始化（填入使用者的 config）
│   ├── db.js               # Firestore CRUD 封裝
│   ├── auth.js             # 管理員認證（密碼雜湊驗證）
│   ├── scoring.js          # 計分邏輯（移植現有，純函式）
│   ├── speech.js           # 語音播報封裝
│   └── router.js           # 共用 URL 參數解析工具
├── icon-192.png
└── icon-512.png
```

---

## 四、各頁面規格

### 4-1 `index.html` — 賽事列表

**功能**
- 顯示所有賽事卡片（名稱、年份、狀態 Active/結束）
- 點擊進入 `tournament.html?id=xxx`
- 管理員入口按鈕（右上角 ⚙️，跳轉 `admin.html`）

**UI 元素**
```
[標題: PicklePoints]          [⚙️ 管理]
────────────────────────────────────
[ 2025 春季聯賽  ● 進行中 ]  →
[ 2024 秋季聯賽    已結束  ]  →
────────────────────────────────────
（空白時顯示引導提示）
```

### 4-2 `tournament.html` — 賽事詳情

**功能**
- Tab 切換：**賽程表** / **排行榜**
- 賽程表：依組別（男雙/女雙/混雙）過濾；比賽卡片顯示目前比分；點擊進入計分盤
- 排行榜：依積分排序；顯示勝/負/積分；可按組別過濾
- 管理員可見：新增比賽按鈕（FAB）

**URL 參數**：`?id=tournamentId&tab=schedule|leaderboard`

### 4-3 `scoreboard.html` — 即時計分盤

**功能（完整保留現有邏輯）**
- 語音播報（zh-TW）
- Undo 堆疊
- Wake Lock
- 即時寫入 Firestore（每次得分後 `updateDoc`）
- 使用 `onSnapshot` 監聽，支援多裝置同步顯示
- 比賽結束 → 自動更新隊伍積分

**URL 參數**：`?tournamentId=xxx&matchId=xxx`

**新增**：返回賽事按鈕（`← 返回賽事`）

### 4-4 `admin.html` — 後台管理

**進入方式**：輸入管理員密碼（與 Firestore `settings/admin.passwordHash` 比對 SHA-256）；通過後將 `sessionStorage` 標記 `adminAuthed=1`

**功能**
1. **賽事管理**：新增 / 編輯 / 刪除賽事
2. **隊伍管理**：在指定賽事內新增隊伍、填入成員、選擇組別
3. **賽程管理**：新增比賽（選隊伍 A/B、組別、輪次）；刪除比賽
4. **密碼設定**：變更管理員密碼（初次使用時設定）

**安全邊界**：純前端雜湊驗證適合「防止誤操作」情境。如需更強安全性，可後續加入 Firebase Authentication（不在本次範圍）。

---

## 五、實作分階段計畫

### Phase 1 — 基礎建設（Firebase + 共用 CSS/JS）
**目標**：建立所有共用基礎設施，無任何新功能
1. 建立 Firebase 專案，取得設定物件
2. 撰寫 `js/firebase-config.js`
3. 撰寫 `js/db.js`（CRUD 函式：`getTournaments`, `createTournament`, `getTeams`, `createTeam`, `getMatches`, `createMatch`, `updateMatch`, `deleteMatch`）
4. 建立 `css/style.css`（從現有 `<style>` 提取，加入 Tab、排行榜等新元件樣式）
5. 撰寫 `js/scoring.js`（將現有 `handleAction`, `undo`, `resetGame` 改為純函式，回傳新狀態物件）
6. 撰寫 `js/speech.js`（封裝 `speak()`）

**驗收**：`db.js` 可在瀏覽器 console 手動呼叫，資料出現在 Firestore

---

### Phase 2 — 賽事列表（`index.html`）
1. 建立頁面 HTML 結構
2. 載入時呼叫 `getTournaments()`，渲染卡片
3. 點擊卡片導航至 `tournament.html?id=xxx`
4. 管理員入口連結

**驗收**：能顯示（手動建立的）Firestore 賽事資料

---

### Phase 3 — 賽事詳情（`tournament.html`）
1. Tab UI（賽程 / 排行榜）
2. 賽程表：`getMatches(tournamentId)` + 組別篩選 + 比賽卡片
3. 排行榜：`getTeams(tournamentId)` 依 `points` 排序 + 組別篩選
4. 使用 Firestore `onSnapshot` 即時更新

**驗收**：新增 / 完成比賽後，賽程表與排行榜即時更新

---

### Phase 4 — 即時計分盤（`scoreboard.html`）
1. 移植現有計分 UI 結構
2. 引入 `scoring.js`（純函式）
3. 得分 → `updateMatch()` 寫入 Firestore
4. `onSnapshot` 監聽 → 多裝置同步
5. 比賽結束 → 呼叫 `updateTeamPoints()` 更新積分
6. 保留語音播報 + Wake Lock + Undo

**驗收**：兩個裝置同時開啟同一比賽，得分即時同步

---

### Phase 5 — 後台管理（`admin.html`）
1. 密碼驗證門檻（SHA-256 比對）
2. 初次設定密碼流程
3. 賽事 CRUD UI
4. 隊伍管理 UI（含成員姓名輸入、組別選擇）
5. 賽程管理 UI（選隊伍對陣、設定輪次）

**驗收**：管理員可完整建立一屆賽事並新增所有對陣組合

---

### Phase 6 — PWA 更新
1. 更新 `service-worker.js`：靜態殼層 cache-first；`/js/`, `/css/` cache-first；Firebase API 請求 network-first
2. 更新 `manifest.json`：`start_url` 改為 `./index.html`
3. 離線提示 banner

**驗收**：斷網後殼層可載入，重連後資料同步

---

### Phase 7 — 收尾與測試
1. 行動裝置 UI 適配檢查（iOS Safari / Android Chrome）
2. 競賽邊界測試：Undo 跨 Sideout、11分以上加賽、棄賽處理
3. Firestore Security Rules：比賽資料公開可讀；`settings/admin` 唯讀；其餘寫入需認證（或暫時開放）
4. README 更新：Firebase 設定步驟說明

---

## 六、Firestore Security Rules（建議初稿）

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 所有人可讀賽事 / 隊伍 / 比賽資料
    match /tournaments/{tId} {
      allow read: if true;
      allow write: if false; // 暫由後台管理，後續加入 Auth
    }
    match /tournaments/{tId}/teams/{teamId} {
      allow read: if true;
      allow write: if false;
    }
    match /tournaments/{tId}/matches/{matchId} {
      allow read: if true;
      allow write: if false; // Phase 5 後改為需驗證
    }

    // 管理員設定唯讀（密碼雜湊讀取用）
    match /settings/admin {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

> **注意**：初期開發可暫時設 `allow write: if true`，上線前收緊。

---

## 七、風險與取捨

| 風險 | 說明 | 緩解方式 |
|------|------|---------|
| Firebase 設定外洩 | API key 在前端可見 | Firestore Security Rules 限制寫入；Firebase API key 僅限定 domain |
| Undo 歷史佔用 Firestore | `history[]` 每球一筆快照 | 限制最多保留 50 步；或僅存差異 |
| 離線計分 | 斷網時 Firestore 寫入排隊 | Firestore SDK 內建 offline persistence；重連後自動同步 |
| 管理員密碼安全性 | 純前端 SHA-256 | 適合「防誤操作」場景；如需更嚴格，改用 Firebase Auth Email/Password |
| 多裝置同時計分衝突 | 兩人同時點得分 | `onSnapshot` 樂觀 UI + 最後寫入勝；計分盤建議同時僅一人操作 |

---

## 八、里程碑時間估算

| Phase | 工作項目 | 預估時間 |
|-------|---------|---------|
| 1 | 基礎建設 | 2–3 小時 |
| 2 | 賽事列表 | 1 小時 |
| 3 | 賽事詳情 | 2 小時 |
| 4 | 即時計分盤 | 2 小時 |
| 5 | 後台管理 | 3 小時 |
| 6 | PWA 更新 | 1 小時 |
| 7 | 收尾測試 | 1–2 小時 |
| **合計** | | **~12–14 小時** |

---

## 九、下一步行動

1. **建立 Firebase 專案**（使用者需自行操作）：
   - 前往 https://console.firebase.google.com → 新建專案
   - 啟用 Firestore Database（生產模式）
   - 在「專案設定」取得 Web App config 物件
   - 將 config 貼入 `js/firebase-config.js`

2. 確認計畫後，可從 **Phase 1** 開始實作

---

*計畫版本：1.0 | 建立日期：2026-04-24*
