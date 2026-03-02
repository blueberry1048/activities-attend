// ============================================================
// Supabase 客戶端配置
// ============================================================
import { createClient } from '@supabase/supabase-js'

// 從環境變數取得 Supabase 連接資訊
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// 驗證環境變數
if (!supabaseUrl || !supabaseKey) {
  console.error('缺少 Supabase 環境變數！')
  console.error('請在 .env 檔案中設定：')
  console.error('VITE_SUPABASE_URL=your_supabase_url')
  console.error('VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your_supabase_anon_key')
}

// 建立 Supabase 客戶端
export const supabase = createClient(supabaseUrl, supabaseKey)

// 預設匯出
export default supabase
