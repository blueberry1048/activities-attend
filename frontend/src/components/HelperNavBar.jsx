// ============================================================
// Helper 專用導航欄 (手機優化)
// ============================================================
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Home, QrCode, LogOut, ClipboardList } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export const HelperNavBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleSignOut = async () => {
    if (window.confirm('確定要登出嗎？')) {
      await logout()
      navigate('/login')
    }
  }

  // 判斷當前頁面
  const isEventsPage = location.pathname === '/helper' || location.pathname === '/helper/events'
  const isScanPage = location.pathname.startsWith('/helper/scan')
  const isParticipantsPage = location.pathname.startsWith('/helper/participants')

  // 從 URL 取得 eventId
  const getEventId = () => {
    const match = location.pathname.match(/\/helper\/(?:scan|participants)\/([^/]+)/)
    return match ? match[1] : null
  }
  
  const eventId = getEventId()

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {/* 活動列表 */}
        <Link
          to="/helper/events"
          className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
            isEventsPage ? 'text-primary-600 bg-primary-50' : 'text-gray-500'
          }`}
        >
          <Home className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">活動列表</span>
        </Link>

        {/* 參加者名單 - 需要先選擇活動 */}
        {eventId ? (
          <Link
            to={`/helper/participants/${eventId}`}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              isParticipantsPage ? 'text-primary-600 bg-primary-50' : 'text-gray-500'
            }`}
          >
            <ClipboardList className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">名單</span>
          </Link>
        ) : (
          <div className="flex flex-col items-center py-2 px-4 text-gray-300">
            <ClipboardList className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">請先選活動</span>
          </div>
        )}

        {/* 開始掃描 - 只有在有選擇活動後才啟用 */}
        {isScanPage ? (
          <div className="flex flex-col items-center py-2 px-4 text-gray-400">
            <QrCode className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">掃描中</span>
          </div>
        ) : eventId ? (
          <Link
            to={`/helper/scan/${eventId}`}
            className="flex flex-col items-center py-2 px-4 text-gray-500 hover:text-primary-600 transition-colors"
          >
            <QrCode className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">掃描</span>
          </Link>
        ) : (
          <div className="flex flex-col items-center py-2 px-4 text-gray-300">
            <QrCode className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">請先選活動</span>
          </div>
        )}

        {/* 登出 */}
        <button
          onClick={handleSignOut}
          className="flex flex-col items-center py-2 px-4 rounded-lg text-gray-500 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-6 w-6" />
          <span className="text-xs mt-1 font-medium">登出</span>
        </button>
      </div>
    </div>
  )
}

export default HelperNavBar
