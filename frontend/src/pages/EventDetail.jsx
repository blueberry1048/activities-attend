// ============================================================
// 活動詳情頁面
// ============================================================
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, QrCode } from 'lucide-react'
import { getEvent } from '../api/supabase'
import { useAuth } from '../contexts/AuthContext'

export const EventDetail = () => {
  const { id: eventId } = useParams()
  const { isHelper } = useAuth()

  // 狀態
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // ----------------------------------------
  // 取得活動詳情
  // ----------------------------------------
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        setLoading(true)
        const data = await getEvent(eventId)
        setEvent(data)
      } catch (err) {
        console.error('載入活動失敗:', err)
        setError(err.message || '載入活動失敗')
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [eventId])

  // ----------------------------------------
  // 格式化日期時間
  // ----------------------------------------
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    })
  }

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
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
        <Link to="/" className="text-primary-600 hover:underline">
          返回活動列表
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 返回連結 */}
      <Link to="/" className="inline-flex items-center text-primary-600 hover:underline mb-6">
        返回活動列表
      </Link>

      {/* 活動詳情卡片 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* 活動圖片 */}
        {event?.image_url && (
          <div className="h-48 md:h-64 overflow-hidden">
            <img
              src={event.image_url}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        
        <div className="p-6">
          {/* 活動名稱 */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {event?.name}
          </h1>
          
          {/* 活動資訊 */}
          <div className="space-y-3 mb-6">
            {/* 日期 */}
            <div className="flex items-center text-gray-600">
              <Calendar className="h-5 w-5 mr-3 text-primary-500" />
              <span>{formatDate(event?.event_date)}</span>
            </div>
            
            {/* 時間 */}
            {event?.start_time && (
              <div className="flex items-center text-gray-600">
                <Clock className="h-5 w-5 mr-3 text-primary-500" />
                <span>
                  {formatTime(event.start_time)}
                  {event.end_time && ` - ${formatTime(event.end_time)}`}
                </span>
              </div>
            )}
            
            {/* 地點 */}
            {event?.location && (
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-3 text-primary-500" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
          
          {/* 活動描述 */}
          {event?.description && (
            <div className="pt-4 border-t">
              <h3 className="font-semibold text-gray-900 mb-2">活動詳情</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{event?.description}</p>
            </div>
          )}
          
          {/* Helper 掃描按鈕 */}
          {isHelper && (
            <div className="mt-6 pt-4 border-t">
              <Link
                to={`/scan/${eventId}`}
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <QrCode className="h-5 w-5 mr-2" />
                掃描報到
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventDetail
