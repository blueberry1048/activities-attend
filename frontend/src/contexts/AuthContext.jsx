// ============================================================
// 認證 Context
// ============================================================
// 提供全域的認證狀態管理
import { createContext, useContext, useState, useEffect } from 'react'
import { login as supabaseLogin, logout as supabaseLogout, getCurrentUser, onAuthStateChange } from '../api/supabase'

// 建立 Context
const AuthContext = createContext(null)

// Provider 元件
export const AuthProvider = ({ children }) => {
  // 狀態
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // ----------------------------------------
  // 初始化：檢查 localStorage 中的 session
  // ----------------------------------------
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 嘗試取得使用者資訊
        const userData = await getCurrentUser()
        setUser(userData)
      } catch (err) {
        // Session 無效，清除 localStorage
      }
      setLoading(false)
    }
    
    initAuth()
    
    // 訂閱認證狀態變化
    const { data: { subscription } } = onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (session) {
        getCurrentUser().then(setUser).catch(console.error)
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
  // ----------------------------------------
  // 登入函式
  // ----------------------------------------
  const login = async (email, password) => {
    try {
      setError(null)
      
      // Supabase 登入 (使用 email)
      const response = await supabaseLogin(email, password)
      
      // 取得使用者資訊
      const userData = await getCurrentUser()
      setUser(userData)
      
      return userData
    } catch (err) {
      // 登入失敗
      const message = err.message || '登入失敗，請檢查帳號密碼'
      setError(message)
      throw new Error(message)
    }
  }
  
  // ----------------------------------------
  // 登出函式
  // ----------------------------------------
  const logout = async () => {
    try {
      await supabaseLogout()
      setUser(null)
    } catch (err) {
      console.error('登出失敗', err)
    }
  }
  
  // ----------------------------------------
  // 檢查是否為管理員
  // ----------------------------------------
  const isAdmin = user?.is_admin === true
  
  // ----------------------------------------
  // 檢查是否為 Helper
  // ----------------------------------------
  const isHelper = user?.is_helper === true
  
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
    isHelper,
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
