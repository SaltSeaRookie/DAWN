# 用 Supabase 架設晨曦大陸的多人連線（免費方案教學）

Supabase 是一個雲端後端服務，免費方案就足夠讓一小群朋友一起玩。
晨曦大陸會用它來做三件事：

| 功能 | 用到的 Supabase 服務 |
| --- | --- |
| 帳號註冊、登入 | Authentication |
| 角色存檔（每個帳號最多 4 個角色） | Database（Postgres 資料表） |
| 看得到彼此、聊天、交易、擺攤 | Realtime（Presence 與 Broadcast） |

怪物與戰鬥仍然在每個玩家的瀏覽器裡計算（和之前的自架伺服器版本一樣）。

> ⚠️ Supabase 的網站介面經常改版，下面的按鈕名稱可能和你看到的略有不同。找不到時，可以在設定頁面左側選單裡找名稱相近的項目。

---

## 第 0 步：準備

- 一個 Supabase 帳號：到 <https://supabase.com> 按「Start your project」，可以直接用 GitHub 帳號登入。
- 這個遊戲的檔案（就是這個 GitHub 專案）。

---

## 第 1 步：建立專案

1. 登入後按 **New project**。
2. 填寫：
   - **Name**：隨意，例如 `dawnlands`
   - **Database Password**：資料庫密碼，請記下來（遊戲用不到，但以後管理資料庫可能需要）
   - **Region**：選離玩家近的地區。台灣玩家建議選 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**
   - **Plan**：Free
3. 按 **Create new project**，等 1～2 分鐘讓專案建立完成。

---

## 第 2 步：關閉「信箱驗證」（很重要）

遊戲是用「帳號名稱」登入的，系統會把帳號轉成 `帳號@dawnlands.game` 當作登入信箱。這不是真的信箱、收不到信，所以要關閉信箱驗證，不然註冊後會無法登入。

1. 左側選單 **Authentication**（人像圖示）。
2. 找到 **Sign In / Providers**（舊版介面叫 **Providers**）。
3. 點開 **Email**。
4. 把 **Confirm email** 關掉。
5. 按 **Save**。

> 密碼最短長度預設是 6 個字元，所以遊戲在 Supabase 模式下，密碼至少要 6 個字元。

---

## 第 3 步：建立資料表

1. 左側選單 **SQL Editor**。
2. 按 **New query**（或「+」）。
3. 打開這個專案裡的 **`supabase/schema.sql`**，把全部內容複製貼上。
4. 按右下角的 **Run**，看到 `Success. No rows returned` 就完成了。
5. 想確認的話，到左側 **Table Editor**，應該會看到 `profiles` 和 `characters` 兩個資料表。

這段 SQL 會建立：

- `profiles`：帳號資料
- `characters`：角色存檔
- 安全規則（RLS）：每個人只能讀寫自己的帳號和角色
- 每個帳號最多 4 個角色的限制，以及角色名稱不能重複的檢查

可以重複執行，不會刪掉已經存在的資料。

---

## 第 4 步：取得網址與金鑰

1. 左下角的 **Project Settings**（齒輪圖示）。
2. **Project URL**：在 **Data API**（或 **API**）頁面，長得像 `https://abcdefghijklmnop.supabase.co`。
3. **金鑰**：在 **API Keys** 頁面。以下兩種都可以用：
   - **Publishable key**：以 `sb_publishable_` 開頭（新版）
   - **anon public**：以 `eyJ` 開頭的一長串（舊版，有時放在「Legacy API Keys」分頁）

> 🚫 **絕對不要**使用 `service_role` 或 `secret` 金鑰！那是管理員金鑰，放進網頁等於把資料庫的鑰匙交給所有人。
>
> ✅ Publishable／anon 金鑰本來就是給瀏覽器用的公開金鑰，資料的安全由第 3 步的 RLS 規則保護，可以放在網頁裡。

---

## 第 5 步：把網址與金鑰填進遊戲

三種方法擇一：

### 方法 A：編輯 `js/config.js`（正式發布用，推薦）

```js
window.DAWNLANDS_CONFIG = {
  supabaseUrl: 'https://abcdefghijklmnop.supabase.co',
  supabaseAnonKey: 'sb_publishable_xxxxxxxx 或 eyJhbGciOi...',
};
```

存檔後推送到 GitHub，所有玩家打開遊戲就會自動連到你的 Supabase。

### 方法 B：在登入畫面設定（先在自己電腦上測試）

登入畫面的連線狀態旁邊有「**Supabase 設定**」連結，點下去依序貼上 Project URL 和金鑰。這個設定只存在這台電腦的瀏覽器裡。要清除時，再點一次，網址欄位留空按確定。

### 方法 C：網址參數（臨時測試）

```
https://你的遊戲網址/?sb_url=https://xxxx.supabase.co&sb_key=金鑰
```

---

## 第 6 步：把遊戲放上網路（免費）

遊戲是純網頁檔案，不需要自己的伺服器。最簡單的是 **GitHub Pages**：

1. 到 GitHub 的這個專案 → **Settings** → 左側 **Pages**。
2. **Source** 選 **Deploy from a branch**。
3. **Branch** 選放遊戲的分支（例如 `main`），資料夾選 `/ (root)`，按 **Save**。
4. 等 1～2 分鐘，頁面上方會出現網址，例如 `https://你的帳號.github.io/Lineage/`。

其他免費選擇：Netlify、Cloudflare Pages、Vercel，把整個資料夾上傳即可。

想先在自己電腦測試，可以在遊戲資料夾裡執行：

```bash
python3 -m http.server 8000
```

然後用瀏覽器打開 <http://localhost:8000>。

---

## 第 7 步：測試

1. 打開遊戲，登入畫面應該顯示「**● 線上模式：已連線到 Supabase**」。
2. 輸入新的帳號名稱與密碼（至少 6 個字元），按「登入遊戲」。遊戲會詢問要不要建立新帳號，選確定。
3. 建立角色、進入遊戲。
4. 用**另一個瀏覽器**（或無痕視窗）登入另一個帳號，兩個角色走到同一個地方，應該看得到彼此，也能聊天：
   - 一般聊天：附近的人看得到
   - `/all 訊息`：全頻
   - `/w 名字 訊息`：悄悄話
   - `/who`：線上名單
5. 點擊其他玩家可以悄悄話、交易，或查看他的攤位。

---

## 免費方案的限制

以下數字以 Supabase 官網的 Pricing 頁面為準，這裡列的是大約的數字：

| 項目 | 免費方案 | 對這個遊戲的意義 |
| --- | --- | --- |
| 資料庫空間 | 約 500 MB | 一個角色存檔約幾十 KB，存上千個角色都沒問題 |
| 每月活躍使用者 | 約 50,000 | 綽綽有餘 |
| Realtime 同時連線 | 約 200 | 同時最多約 200 位玩家在線 |
| Realtime 每月訊息 | 約 200 萬則 | **最需要注意的限制**，見下方說明 |
| 閒置暫停 | 約 7 天沒有使用會自動暫停 | 到 Supabase 網站打開專案按 **Restore** 即可恢復，資料不會消失 |
| 免費專案數量 | 2 個 | |

### 關於 Realtime 訊息量

玩家移動時，遊戲每 0.3 秒送一次位置；站著不動時每 10 秒才送一次。Supabase 會把「送出」和「每個人收到」都算進訊息量。

- **大約的估算**：5 位玩家同時在線、常常在移動，一小時大約會用掉十幾萬則訊息。所以免費方案適合**朋友之間、每天玩幾個小時**的規模。
- **超過上限**：當月的即時同步會被限制（存檔與登入不受影響），可以等下個月或升級方案。
- **查用量**：在 Supabase 的 **Reports**（或 **Usage**）頁面。

---

## 管理玩家資料

- **刪除帳號**：**Authentication** → **Users**，找到 `帳號@dawnlands.game` 刪除。這個帳號的角色會一起刪除。
- **玩家忘記密碼**：因為沒有真的信箱，無法寄重設信。可以在 **Users** 刪掉那個帳號讓他重新註冊（角色會一起刪除）。有些版本的管理介面也能直接替使用者重設密碼。
- **查看或修改存檔**：**Table Editor** → `characters`，`data` 欄位就是整份存檔（JSON）。

---

## 常見問題

**Q：登入畫面顯示「無法連線到 Supabase」**
- 檢查 Project URL 有沒有貼錯（要有 `https://`，結尾是 `.supabase.co`）。
- 專案可能因為閒置被暫停了：到 Supabase 網站打開專案，按 **Restore project**。

**Q：顯示「資料表還沒建立」**
- 回到第 3 步，在 SQL Editor 執行 `supabase/schema.sql`。

**Q：顯示「anon key 不正確」**
- 重新複製第 4 步的 Publishable key 或 anon public 金鑰。注意不要多複製到空白。

**Q：註冊後顯示「需要信箱驗證才能登入」**
- 回到第 2 步關閉 **Confirm email**。
- 再到 **Authentication** → **Users** 刪掉剛剛那個帳號，重新註冊一次。

**Q：兩個人都登入了，卻看不到對方**
1. 確認兩個人在**同一張地圖**，而且距離不要太遠。
2. 到 Supabase 的 **Realtime** → **Settings**，確認沒有開啟「只允許私人頻道（Private channels only）」。遊戲使用公開頻道，需要允許公開存取（Allow public access）。
3. 確認兩個人用的是同一個 Supabase 專案（同一組網址與金鑰）。

**Q：同一個帳號在兩個地方登入會怎樣？**
- 舊的那一邊會被要求離開（顯示「你的帳號從其他地方登入了」）。

**Q：本機模式的角色可以搬到 Supabase 嗎？**
1. 在本機模式的遊戲中，到「設定」→「⬇ 匯出此角色」或「📋 複製存檔碼」。
2. 連上 Supabase 後，在選擇角色畫面按「**匯入角色**」。

---

## 安全性說明

- 每個人只能讀寫**自己的**帳號與角色，這由資料庫的 RLS 規則保證。其他人無法偷看或修改你的存檔。
- 但遊戲的戰鬥、掉寶、金幣都是在玩家自己的瀏覽器裡計算的，懂程式的人還是有辦法修改自己的角色。這是目前架構的限制，適合朋友之間遊玩。
- 管理員（GM）指令的驗證也在瀏覽器端進行。

---

## 還想用自架的 Node 伺服器？

`server/` 資料夾的 Node 伺服器仍然可以使用（參考 README）。`js/config.js` 沒有填 Supabase 時，若網頁由那台伺服器提供，就會自動連過去。
