// ============================================================
// 認證 Context
// ============================================================
// 提供全域的認證狀態管理
import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, getCurrentUser } from '../api/axios'

// 建立 Context
const AuthContext = createContext(null)

// Provider 元件
export const AuthProvider = ({ children }) => {
  // 狀態
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // ----------------------------------------
  // 初始化：檢查 localStorage 中的 token
  // ----------------------------------------
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token')
      if (token) {
        try {
          // 嘗試取得使用者資訊
          const userData = await getCurrentUser()
          setUser(userData)
        } catch (err) {
          // Token 無效，清除 localStorage
          localStorage.removeItem('token')
          localStorage.removeItem('user')
        }
      }
      setLoading(false)
    }
    
    initAuth()
  }, [])
  
  // ----------------------------------------
  // 登入函式
  // ----------------------------------------
  const login = async (username, password) => {
    try {
      setError(null)
      const response = await apiLogin(username, password)
      
      // 儲存 token
      localStorage.setItem('token', response.access_token)
      
      // 取得使用者資訊
      const userData = await getCurrentUser()
      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
      
      return userData
    } catch (err) {
      // 登入失敗
      const message = err.response?.data?.detail || '登入失敗，請檢查帳號密碼'
      setError(message)
      throw new Error(message)
    }
  }
  
  // ----------------------------------------
  // 登出函式
  // ----------------------------------------
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }
  
  // ----------------------------------------
  // 檢查是否為管理員
  // ----------------------------------------
  const isAdmin = user?.is_admin === true
  
  // ----------------------------------------
  // 提供給子元件的值
  // ----------------------------------------
  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAdmin,
    isAuthenticated: !!user,
  }
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ----------------------------------------
// 自定義 Hook：使用認證
// ----------------------------------------
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth 必須在 AuthProvider 內使用')
  }
  return context
}
