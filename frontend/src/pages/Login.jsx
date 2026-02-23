// ============================================================
// 登入頁面
// ============================================================
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { User, Lock, LogIn } from 'lucide-react'

export const Login = () => {
  const navigate = useNavigate()
  const { login, isAdmin, isAuthenticated, loading } = useAuth()
  
  // 表單狀態
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  // ----------------------------------------
  // 初始化：如果已登入，導向首頁
  // ----------------------------------------
  if (!loading && isAuthenticated) {
    navigate(isAdmin ? '/admin' : '/')
    return null
  }
  
  // ----------------------------------------
  // 處理表單提交
  // ----------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)
    
    try {
      const user = await login(username, password)
      
      // 根據權限導向不同頁面
      if (user.is_admin) {
        navigate('/admin')
      } else {
        navigate('/')
      }
    } catch (error) {
      setErrorMessage(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4">
      <div className="max-w-md w-full">
        {/* 標題 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            活動報到系統
          </h1>
          <p className="text-gray-600 mt-2">
            請登入以繼續
          </p>
        </div>
        
        {/* 登入表單 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 使用者名稱 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                使用者名稱
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="請輸入使用者名稱"
                  required
                />
              </div>
            </div>
            
            {/* 密碼 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                密碼
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="請輸入密碼"
                  required
                />
              </div>
            </div>
            
            {/* 錯誤訊息 */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {errorMessage}
              </div>
            )}
            
            {/* 提交按鈕 */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <div className="spinner mr-2" style={{ width: '20px', height: '20px' }}></div>
                  登入中...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-5 w-5" />
                  登入
                </>
              )}
            </button>
          </form>
        </div>
        
        {/* 提示資訊 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>如需註冊帳號，請聯繫系統管理員</p>
        </div>
      </div>
    </div>
  )
}

export default Login
