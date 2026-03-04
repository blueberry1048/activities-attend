// ============================================================
// Helper 活動列表頁面 (手機優化)
// ============================================================
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin, Users, QrCode, RefreshCw, Download } from 'lucide-react'
import { getEvents, getParticipants } from '../../api/supabase'
import HelperNavBar from '../../components/HelperNavBar'

export const HelperEvents = () => {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [eventStats, setEventStats] = useState({})
  
  // PWA 安裝狀態
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)
  
  // ----------------------------------------
  // PWA: 檢測是否已安裝 & 監聽安裝提示
  // ----------------------------------------
  useEffect(() => {
    // 檢查是否已經以 PWA 模式運行
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                           window.navigator.standalone === true
      if (isStandalone) {
        setIsInstalled(true)
      }
    }
    
    checkInstalled()
    
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])
  
  // ----------------------------------------
  // 處理 PWA 安裝
  // ----------------------------------------
  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      setDeferredPrompt(null)
    } else {
      // 瀏�器不支援自動提示，顯示引導訊息
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      if (isIOS) {
        alert('iOS 用戶：請使用 Safari 瀏覽器的「分享」按鈕，選擇「加入主畫面」')
      } else {
        alert('請使用瀏覽器的選單，選擇「安裝應用程式」或「加到主畫面」')
      }
    }
  }

  // 獲取活動列表
  const fetchEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getEvents()
      setEvents(data || [])
    } catch (err) {
      setError(err.message || '載入活動失敗')
    } finally {
      setLoading(false)
    }
  }

  // 獲取每個活動的參加者統計
  const fetchEventStats = async (eventId) => {
    try {
      const participants = await getParticipants(eventId)
      const total = participants?.length || 0
      const checkedIn = participants?.filter(p => p.is_checked_in).length || 0
      return { total, checkedIn }
    } catch {
      return { total: 0, checkedIn: 0 }
    }
  }

  // 初始化
  useEffect(() => {
    fetchEvents()
  }, [])

  // 載入每個活動的統計
  useEffect(() => {
    const loadStats = async () => {
      const stats = {}
      for (const event of events) {
        stats[event.id] = await fetchEventStats(event.id)
      }
      setEventStats(stats)
    }
    if (events.length > 0) {
      loadStats()
    }
  }, [events])

  // 格式化日期
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
  }

  // 格式化時間
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    return timeStr.substring(0, 5)
  }

  // 進入掃描頁面
  const handleStartScan = (eventId) => {
    navigate(`/helper/scan/${eventId}`)
  }

  // 渲染
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 頂部標題 */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">選擇活動</h1>
            <p className="text-primary-100 text-sm">點擊活動開始掃描報到</p>
          </div>
          <div className="flex items-center gap-2">
            {/* PWA 安裝按鈕 - 總是顯示（除非已安裝） */}
            {!isInstalled && (
              <button
                onClick={handleInstallPWA}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="加入主畫面"
              >
                <Download className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={fetchEvents}
              className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 載入中 */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
        </div>
      )}

      {/* 活動列表 */}
      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Calendar className="h-16 w-16 mb-4 text-gray-300" />
          <p className="text-lg font-medium">目前沒有活動</p>
        </div>
      )}

      {/* 活動卡片 */}
      {!loading && events.length > 0 && (
        <div className="p-4 space-y-4">
          {events.map((event) => {
            const stats = eventStats[event.id] || { total: 0, checkedIn: 0 }
            const progress = stats.total > 0 ? (stats.checkedIn / stats.total) * 100 : 0

            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* 活動資訊 */}
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                    {event.name}
                  </h3>

                  {/* 活動詳情 */}
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                    {event.event_date && (
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1 text-primary-500" />
                        {formatDate(event.event_date)}
                      </span>
                    )}
                    {event.start_time && (
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-primary-500" />
                        {formatTime(event.start_time)}
                      </span>
                    )}
                    {event.location && (
                      <span className="flex items-center truncate">
                        <MapPin className="h-4 w-4 mr-1 text-primary-500" />
                        {event.location}
                      </span>
                    )}
                  </div>

                  {/* 統計資訊 */}
                  <div className="bg-gray-50 rounded-xl p-3 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">報到進度</span>
                      <span className="text-sm font-bold text-primary-600">
                        {stats.checkedIn} / {stats.total}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 開始掃描按鈕 */}
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => handleStartScan(event.id)}
                    className="w-full py-4 flex items-center justify-center bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 transition-all active:scale-95"
                  >
                    <QrCode className="h-5 w-5 mr-2" />
                    開始掃描報到
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 底部導航欄 */}
      <HelperNavBar />
    </div>
  )
}

export default HelperEvents
