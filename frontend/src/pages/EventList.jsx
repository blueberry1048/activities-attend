// ============================================================
// 活動列表頁面 (參加者)
// ============================================================
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Users, CheckCircle } from 'lucide-react'
import { getEvents } from '../api/axios'

export const EventList = () => {
  // 狀態
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // ----------------------------------------
  // 載入活動列表
  // ----------------------------------------
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true)
        // 取得所有活動 (只顯示已啟用的)
        const data = await getEvents()
        // 過濾出已啟用的活動
        const activeEvents = data.filter(event => event.is_active)
        setEvents(activeEvents)
      } catch (err) {
        setError(err.message)
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
    return timeString.substring(0, 5) // HH:mm 格式
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
        <p>載入活動失敗：{error}</p>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* 頁面標題 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">活動列表</h1>
        <p className="text-gray-600 mt-2">點擊活動查看詳情與個人 QR Code</p>
      </div>
      
      {/* 活動列表 */}
      {events.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">目前沒有活動</h3>
          <p className="mt-2 text-gray-500">敬請期待即將推出的活動</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {events.map((event) => (
            <Link
              key={event.id}
              to={`/event/${event.id}`}
              className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-100"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                {/* 活動資訊 */}
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {event.name}
                  </h2>
                  
                  <div className="mt-3 space-y-2">
                    {/* 日期 */}
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-5 w-5 mr-2 text-primary-500" />
                      <span>{formatDate(event.event_date)}</span>
                    </div>
                    
                    {/* 時間 */}
                    {event.start_time && (
                      <div className="flex items-center text-gray-600">
                        <Clock className="h-5 w-5 mr-2 text-primary-500" />
                        <span>
                          {formatTime(event.start_time)}
                          {event.end_time && ` - ${formatTime(event.end_time)}`}
                        </span>
                      </div>
                    )}
                    
                    {/* 地點 */}
                    {event.location && (
                      <div className="flex items-center text-gray-600">
                        <MapPin className="h-5 w-5 mr-2 text-primary-500" />
                        <span>{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 報到統計 */}
                <div className="mt-4 md:mt-0 md:ml-6 flex items-center">
                  <div className="flex items-center space-x-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{event.checked_in_count || 0}/{event.attendee_count || 0}</span>
                    </div>
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      <span>已報到</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default EventList
