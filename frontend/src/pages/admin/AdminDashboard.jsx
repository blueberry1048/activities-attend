// ============================================================
// 管理員儀表板
// ============================================================
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Users, QrCode, Plus, Edit, Trash2, UserPlus } from 'lucide-react'
import { getEvents, deleteEvent } from '../../api/axios'

export const AdminDashboard = () => {
  // 狀態
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  
  // ----------------------------------------
  // 載入活動列表
  // ----------------------------------------
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        const data = await getEvents()
        setEvents(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEvents()
  }, [])
  
  // ----------------------------------------
  // 刪除活動
  // ----------------------------------------
  const handleDelete = async (eventId, eventName) => {
    if (!window.confirm(`確定要刪除活動「${eventName}」嗎？此操作無法復原。`)) {
      return
    }
    
    try {
      setDeletingId(eventId)
      await deleteEvent(eventId)
      // 重新載入列表
      setEvents(events.filter(e => e.id !== eventId))
    } catch (err) {
      alert(err.response?.data?.detail || '刪除失敗')
    } finally {
      setDeletingId(null)
    }
  }
  
  // ----------------------------------------
  // 格式化日期
  // ----------------------------------------
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  // ----------------------------------------
  // 格式化時間
  // ----------------------------------------
  const formatTime = (timeString) => {
    if (!timeString) return ''
    return timeString.substring(0, 5)
  }
  
  // ----------------------------------------
  // 渲染載入中
  // ----------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="spinner"></div>
      </div>
    )
  }
  
  // ----------------------------------------
  // 渲染錯誤
  // ----------------------------------------
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <p>載入失敗：{error}</p>
      </div>
    )
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* 頁面標題與新增按鈕 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">活動管理</h1>
          <p className="text-gray-600 mt-2">管理所有活動與報到</p>
        </div>
        <Link
          to="/admin/events/new"
          className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          新建活動
        </Link>
      </div>
      
      {/* 活動列表 */}
      {events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">尚無活動</h3>
          <p className="mt-2 text-gray-500">點擊上方按鈕建立第一個活動</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  {/* 活動資訊 */}
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h2 className="text-xl font-semibold text-gray-900">
                        {event.name}
                      </h2>
                      {/* 狀態標籤 */}
                      <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                        event.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {event.is_active ? '啟用' : '停用'}
                      </span>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {/* 日期 */}
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-primary-500" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                      
                      {/* 時間 */}
                      {event.start_time && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2 text-primary-500" />
                          <span>{formatTime(event.start_time)}</span>
                        </div>
                      )}
                      
                      {/* 地點 */}
                      {event.location && (
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 text-primary-500" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* 報到統計 */}
                    <div className="mt-3 flex items-center text-sm">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">
                        報到人數：
                        <span className="font-semibold text-primary-600">
                          {event.checked_in_count || 0}
                        </span>
                        {' / '}
                        <span className="font-semibold">{event.attendee_count || 0}</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* 操作按鈕 */}
                  <div className="mt-4 md:mt-0 md:ml-6 flex items-center space-x-3">
                    {/* 參加者管理按鈕 */}
                    <Link
                      to={`/admin/participants/${event.id}`}
                      className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      參加者管理
                    </Link>
                    
                    {/* 掃描按鈕 */}
                    <Link
                      to={`/admin/scan/${event.id}`}
                      className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <QrCode className="h-4 w-4 mr-1" />
                      掃描報到
                    </Link>
                    
                    {/* 編輯按鈕 */}
                    <Link
                      to={`/admin/events/${event.id}/edit`}
                      className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      編輯
                    </Link>
                    
                    {/* 刪除按鈕 */}
                    <button
                      onClick={() => handleDelete(event.id, event.name)}
                      disabled={deletingId === event.id}
                      className="inline-flex items-center px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {deletingId === event.id ? '刪除中...' : '刪除'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
