// ===== 多人連線設定 =====
// 使用 Supabase 做多人連線時，把專案的 Project URL 與 anon public key 填在這裡（教學：docs/SUPABASE.md）。
// anon key 本來就是公開給瀏覽器用的金鑰，資料的安全由資料表的 RLS 規則保護，可以放心放在網頁裡。
// 留空時：若網頁是由自架的 Node 伺服器提供，會連到那台伺服器；否則使用本機模式。
window.DAWNLANDS_CONFIG = {
  supabaseUrl: '',        // 例如 'https://abcdefghijklmnop.supabase.co'
  supabaseAnonKey: '',    // 例如 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....'
};
