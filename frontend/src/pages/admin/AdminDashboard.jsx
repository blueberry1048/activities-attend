// ============================================================
// 管理員儀表板
// ============================================================
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Users, QrCode, Plus, Edit, Trash2, UserPlus } from 'lucide-react'
import { getEvents, deleteEvent } from '../../api/supabase'

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
      console.error('刪除失敗:', err)
      alert(err.message || '刪除失敗')
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
    <div className="max-w-7xl mx-auto">
      {/* 頁面標題與新增按鈕 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 bg-white rounded-2xl shadow-sm p-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">活動管理</h1>
          <p className="text-gray-600 mt-1">管理所有活動與報到</p>
          <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              總活動：{events.length}
            </span>
            <span className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              總參加者：{events.reduce((sum, e) => sum + (e.attendee_count || 0), 0)}
            </span>
          </div>
        </div>
        <Link
          to="/admin/events/new"
          className="mt-4 lg:mt-0 inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
        >
          <Plus className="h-5 w-5 mr-2" />
          新建活動
        </Link>
      </div>
      
      {/* 活動列表 */}
      {events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
          <Calendar className="mx-auto h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-medium text-gray-900">尚無活動</h3>
          <p className="mt-2 text-gray-500">點擊上方按鈕建立第一個活動</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* 桌面版表格 */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">活動名稱</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">日期時間</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">地點</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">狀態</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">報到</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="bg-primary-100 rounded-lg p-2 mr-3">
                          <Calendar className="h-5 w-5 text-primary-600" />
                        </div>
                        <span className="text-lg font-semibold text-gray-900">{event.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 font-medium">{formatDate(event.event_date)}</div>
                      {event.start_time && (
                        <div className="text-sm text-gray-500 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(event.start_time)}
                          {event.end_time && ` - ${formatTime(event.end_time)}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {event.location ? (
                        <div className="flex items-center text-sm text-gray-600">
                          <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                          {event.location}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        event.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`w-2 h-2 rounded-full mr-2 ${event.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {event.is_active ? '啟用' : '停用'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 mr-3 max-w-[100px]">
                          <div 
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${event.attendee_count > 0 ? ((event.checked_in_count || 0) / event.attendee_count) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {event.checked_in_count || 0}/{event.attendee_count || 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/admin/participants/${event.id}`}
                          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          title="參加者管理"
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          <span className="hidden xl:inline">參加者管理</span>
                        </Link>
                        
                        <Link
                          to={`/admin/scan/${event.id}`}
                          className="inline-flex items-center px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                          title="掃描報到"
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          <span className="hidden xl:inline">掃描報到</span>
                        </Link>
                        
                        <Link
                          to={`/admin/events/${event.id}/edit`}
                          className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                          title="編輯"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        
                        <button
                          onClick={() => handleDelete(event.id, event.name)}
                          disabled={deletingId === event.id}
                          className="inline-flex items-center px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                          title="刪除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 手機版卡片 */}
          <div className="lg:hidden divide-y divide-gray-100">
            {events.map((event) => (
              <div key={event.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {event.name}
                      </h2>
                      <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                        event.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {event.is_active ? '啟用' : '停用'}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(event.event_date)}
                      </span>
                      {event.start_time && (
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(event.start_time)}
                        </span>
                      )}
                      {event.location && (
                        <span className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 flex items-center text-sm">
                      <Users className="h-3 w-3 mr-1 text-gray-400" />
                      <span className="text-gray-600">
                        <span className="font-semibold text-primary-600">{event.checked_in_count || 0}</span>
                        {' / '}
                        <span className="font-semibold">{event.attendee_count || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center space-x-2 flex-wrap">
                  <Link
                    to={`/admin/participants/${event.id}`}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    參加者
                  </Link>
                  <Link
                    to={`/admin/scan/${event.id}`}
                    className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg"
                  >
                    <QrCode className="h-3 w-3 mr-1" />
                    掃描
                  </Link>
                  <Link
                    to={`/admin/events/${event.id}/edit`}
                    className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg"
                  >
                    <Edit className="h-3 w-3" />
                  </Link>
                  <button
                    onClick={() => handleDelete(event.id, event.name)}
                    disabled={deletingId === event.id}
                    className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
