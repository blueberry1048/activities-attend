// ============================================================
// 主應用程式元件
// ============================================================
// 包含路由設定與全域認證 Provider
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { EventList } from './pages/EventList'
import { EventDetail } from './pages/EventDetail'
import { AdminDashboard } from './pages/admin/AdminDashboard'
import { EventForm } from './pages/admin/EventForm'
import { Scanner } from './pages/admin/Scanner'
import { ParticipantManagement } from './pages/admin/ParticipantManagement'
import { ParticipantView } from './pages/ParticipantView'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          {/* 導航欄 */}
          <Navbar />
          
          {/* 主要內容區域 */}
          <main className="container mx-auto px-4 py-6">
            <Routes>
              {/* 公開路由 */}
              <Route path="/login" element={<Login />} />
              
              {/* 參加者路由 */}
              <Route path="/" element={
                <ProtectedRoute requireAdmin={false}>
                  <EventList />
                </ProtectedRoute>
              } />
              <Route path="/event/:id" element={
                <ProtectedRoute requireAdmin={false}>
                  <EventDetail />
                </ProtectedRoute>
              } />
              
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
              
              {/* 預設重導向 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
