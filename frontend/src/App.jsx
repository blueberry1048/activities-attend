// ============================================================
// 主應用程式元件
// ============================================================
// 包含路由設定與全域認證 Provider
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { EventForm } from './pages/admin/EventForm'
import { Scanner } from './pages/admin/Scanner'
import { ParticipantManagement } from './pages/admin/ParticipantManagement'
import { ParticipantView } from './pages/ParticipantView'
import { HelperEvents } from './pages/helper/HelperEvents'
import { HelperScan } from './pages/helper/HelperScan'
import { HelperParticipants } from './pages/helper/HelperParticipants'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'

// 根路由重導向元件
const RootRedirect = () => {
  const { user, isAdmin, isHelper, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    )
  }
  
  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }
  
  if (isHelper) {
    return <Navigate to="/helper/events" replace />
  }
  
  // 未登入或普通用戶，引導至登入
  return <Navigate to="/login" replace />
}

// 輔助元件：決定是否顯示 Navbar
const AppContent = () => {
  const location = useLocation()
  
  // Helper 手機模式不需要頂部導航欄
  const isHelperRoute = location.pathname.startsWith('/helper') || location.pathname.startsWith('/scan')
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* 導航欄 - 非 Helper 頁面顯示 */}
        {!isHelperRoute && <Navbar />}
        
        {/* 主要內容區域 */}
        <main className={`${isHelperRoute ? '' : 'container mx-auto px-4 py-6'}`}>
          <Routes>
            {/* 公開路由 */}
            <Route path="/login" element={<Login />} />
            
            {/* 根目錄重導向 - 根據用戶角色導向不同頁面 */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* 公開路由 - 參加者連結檢視 */}
            <Route path="/participants/:token" element={<ParticipantView />} />
            
            {/* 管理員路由 */}
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/events/new" element={
              <ProtectedRoute requireAdmin={true}>
                <EventForm />
              </ProtectedRoute>
            } />
            <Route path="/admin/events/:id/edit" element={
              <ProtectedRoute requireAdmin={true}>
                <EventForm />
              </ProtectedRoute>
            } />
            <Route path="/admin/scan/:eventId" element={
              <ProtectedRoute requireAdmin={true}>
                <Scanner />
              </ProtectedRoute>
            } />
            <Route path="/admin/participants/:id" element={
              <ProtectedRoute requireAdmin={true}>
                <ParticipantManagement />
              </ProtectedRoute>
            } />

            {/* Helper 掃描路由 */}
            <Route path="/scan/:eventId" element={
              <ProtectedRoute requireHelper={true}>
                <Scanner />
              </ProtectedRoute>
            } />
            
            {/* Helper 手機優化介面 */}
            <Route path="/helper" element={
              <ProtectedRoute requireHelper={true}>
                <HelperEvents />
              </ProtectedRoute>
            } />
            <Route path="/helper/events" element={
              <ProtectedRoute requireHelper={true}>
                <HelperEvents />
              </ProtectedRoute>
            } />
            <Route path="/helper/scan/:eventId" element={
              <ProtectedRoute requireHelper={true}>
                <HelperScan />
              </ProtectedRoute>
            } />
            <Route path="/helper/participants/:eventId" element={
              <ProtectedRoute requireHelper={true}>
                <HelperParticipants />
              </ProtectedRoute>
            } />
            
            {/* 預設重導向 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </>
  )
}

function App() {
  return (
    <BrowserRouter future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true
    }}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
