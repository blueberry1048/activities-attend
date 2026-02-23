// ============================================================
// 導航欄元件
// ============================================================
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, User, LayoutDashboard } from 'lucide-react'

export const Navbar = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  
  // 處理登出
  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  
  // 如果未登入，不顯示導航欄
  if (!isAuthenticated) {
    return null
  }
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo / 首頁連結 */}
          <div className="flex-shrink-0">
            <Link to={isAdmin ? '/admin' : '/'} className="text-xl font-bold text-primary-600">
              活動報到系統
            </Link>
          </div>
          
          {/* 導航連結 */}
          <div className="flex items-center space-x-4">
            {/* 一般使用者 */}
            {!isAdmin && (
              <Link 
                to="/" 
                className="text-gray-600 hover:text-primary-600 transition-colors"
              >
                活動列表
              </Link>
            )}
            
            {/* 管理員 */}
            {isAdmin && (
              <>
                <Link 
                  to="/admin" 
                  className="flex items-center text-gray-600 hover:text-primary-600 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  活動管理
                </Link>
              </>
            )}
            
            {/* 使用者資訊與登出 */}
            <div className="flex items-center space-x-3 border-l pl-4 ml-2">
              {/* 使用者名稱 */}
              <div className="flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                <span>{user?.full_name || user?.username}</span>
                {isAdmin && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                    管理員
                  </span>
                )}
              </div>
              
              {/* 登出按鈕 */}
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-500 hover:text-red-600 transition-colors"
                title="登出"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
