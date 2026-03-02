// ============================================================
// 權限保護路由元件
// ============================================================
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * 權限保護路由
 * 
 * 根據用戶權限控制頁面訪問
 * 
 * @param {React.ReactNode} children - 子元件
 * @param {boolean} requireAdmin - 是否需要管理員權限
 * @param {boolean} requireHelper - 是否需要 Helper 權限
 */
export const ProtectedRoute = ({ children, requireAdmin = false, requireHelper = false }) => {
  const { isAuthenticated, isAdmin, isHelper, loading } = useAuth()
  const location = useLocation()
  
  // 載入中顯示
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="spinner"></div>
      </div>
    )
  }
  
  // 未登入則導向登入頁
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  
  // 需要管理員權限但用戶不是管理員
  if (requireAdmin && !isAdmin) {
    // 一般用戶或 Helper 導向首頁
    return <Navigate to="/" replace />
  }
  
  // 需要 Helper 權限但用戶不是 Helper
  if (requireHelper && !isHelper) {
    // 非 Helper 導向首頁
    return <Navigate to="/" replace />
  }
  
  // 已通過權限檢查
  return children
}
