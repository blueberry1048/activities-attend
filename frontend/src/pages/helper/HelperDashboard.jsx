// ============================================================
// Helper 儀表板
// ============================================================
// 只能查看活動列表和掃描 QR Code
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getEvents } from '../../api/supabase'
import { Calendar, MapPin, Clock, Users, QrCode, LogOut, ScanLine } from 'lucide-react'

export const HelperDashboard = () => {
  const { user, logout } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ----------------------------------------
  // 載入活動列表
  // ----------------------------------------
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getEvents()
        setEvents(data)
      } catch (err) {
        console.error('載入活動失敗:', err)
        setError(err.message || '載入活動失敗')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  // ----------------------------------------
  // 格式化日期
  // ----------------------------------------
  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    })
  }

  // ----------------------------------------
  // 渲染
  // ----------------------------------------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ScanLine className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Helper 報到系統</h1>
              <p className="text-sm text-gray-500">協助掃描 QR Code</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="登出"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* 內容 */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* 歡迎訊息 */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            您好，{user?.full_name || user?.username || 'Helper'}
          </h2>
          <p className="text-gray-600 mt-1">
            請選擇要進行報到的活動
          </p>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* 載入中 */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="spinner"></div>
          </div>
        )}

        {/* 活動列表 */}
        {!loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                目前沒有活動
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                        {event.name}
                      </h3>
                    </div>

                    <div className="space-y-3 mb-6">
                      {/* 日期 */}
                      {event.event_date && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{formatDate(event.event_date)}</span>
                        </div>
                      )}

                      {/* 時間 */}
                      {event.start_time && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{event.start_time}</span>
                        </div>
                      )}

                      {/* 地點 */}
                      {event.location && (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}

                      {/* 人數 */}
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                        <span>
                          報到：{event.checked_in_count || 0} / {event.attendee_count || 0}
                        </span>
                      </div>
                    </div>

                    {/* 掃描按鈕 */}
                    <Link
                      to={`/scan/${event.id}`}
                      className="block w-full text-center py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <QrCode className="inline-block h-4 w-4 mr-2" />
                      開始掃描報到
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default HelperDashboard
