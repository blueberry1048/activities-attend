// ============================================================
// QR Code 掃描頁面 (管理員)
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowLeft, Camera, CheckCircle, XCircle, AlertCircle, Users, Clock, MapPin, Calendar, RefreshCw, QrCode } from 'lucide-react'
import { getEvent, checkIn, getParticipants } from '../../api/axios'

export const Scanner = () => {
  const { eventId } = useParams()
  const navigate = useNavigate()
  
  // 狀態
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [cameraError, setCameraError] = useState(null)
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 })
  const [cameraInfo, setCameraInfo] = useState(null)
  
  // 掃描器引用
  const html5QrcodeRef = useRef(null)
  
  // ----------------------------------------
  // 載入活動和參加者資訊
  // ----------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 取得活動資訊
        const eventData = await getEvent(eventId)
        setEvent(eventData)
        
        // 取得參加者列表
        const participantsData = await getParticipants(eventId)
        setParticipants(participantsData.participants || [])
        
        // 計算統計資料
        const total = participantsData.total || 0
        const checkedIn = participantsData.participants?.filter(p => {
          // 假設有 is_checked_in 欄位，暫時用 localStorage 記錄
          return localStorage.getItem(`checked_in_${eventId}_${p.id}`) === 'true'
        }).length || 0
        
        // 從活動資料取得已報到人數
        setStats({
          total: eventData.total_participants || total,
          checkedIn: eventData.checked_in_count || checkedIn
        })
      } catch (err) {
        setError(err.response?.data?.detail || '載入活動失敗')
      }
    }
    fetchData()
  }, [eventId])

  // ----------------------------------------
  // 重新整理統計資料
  // ----------------------------------------
  const refreshStats = async () => {
    try {
      const participantsData = await getParticipants(eventId)
      const eventData = await getEvent(eventId)
      
      setParticipants(participantsData.participants || [])
      setStats({
        total: eventData.total_participants || participantsData.total || 0,
        checkedIn: eventData.checked_in_count || 0
      })
    } catch (err) {
      console.error('重新整理失敗:', err)
    }
  }
  
  // ----------------------------------------
  // 獲取可用相機列表
  // ----------------------------------------
  const getAvailableCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras()
      return devices
    } catch (err) {
      console.error('獲取相機列表失敗:', err)
      return []
    }
  }
  
  // ----------------------------------------
  // 開始掃描
  // ----------------------------------------
  const startScanning = async () => {
    setCameraError(null)
    setScanning(true)
    
    try {
      // 先獲取可用相機
      const cameras = await getAvailableCameras()
      
      console.log('可用相機:', cameras)
      
      if (!cameras || cameras.length === 0) {
        // 嘗試使用 getUserMedia 直接獲取
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          stream.getTracks().forEach(track => track.stop())
          setCameraError('檢測到相機但無法識別。請嘗試重新整理頁面。')
        } catch (e) {
          setCameraError('找不到相機設備。請確保手機有相機並授予權限。')
        }
        setScanning(false)
        return
      }
      
      // 建立掃描器實例
      html5QrcodeRef.current = new Html5Qrcode("qr-reader")
      
      // 選擇相機：優先使用後鏡頭
      let cameraId = cameras[0].id
      const backCamera = cameras.find(c => c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear'))
      if (backCamera) {
        cameraId = backCamera.id
      } else if (cameras.length > 1) {
        // 嘗試第二個相機
        cameraId = cameras[1].id
      }
      
      console.log('使用相機:', cameraId)
      setCameraInfo(cameras.find(c => c.id === cameraId)?.label || cameraId)
      
      // 請求相機權限並開始掃描
      await html5QrcodeRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          // 成功掃描到 QR Code
          handleScanSuccess(decodedText)
        },
        (errorMessage) => {
          // 掃描錯誤 (忽略)
        }
      )
    } catch (err) {
      console.error('相機錯誤:', err)
      setScanning(false)
      
      // 處理不同的錯誤
      const errorStr = err.toString()
      if (errorStr.includes('Permission') || errorStr.includes('NotAllowed')) {
        setCameraError('無法存取相機。請確保已授予相機權限，並且使用 HTTPS 連線。')
      } else if (errorStr.includes('NotFound') || errorStr.includes('not found') || errorStr.includes('no video device')) {
        setCameraError('找不到相機設備。請確保手機有相機。')
      } else if (errorStr.includes('NotReadable') || errorStr.includes('in use')) {
        setCameraError('相機已被其他應用程式使用。請關閉其他使用相機的應用。')
      } else {
        setCameraError(`相機啟動失敗: ${err.message || err}`)
      }
    }
  }
  
  // ----------------------------------------
  // 停止掃描
  // ----------------------------------------
  const stopScanning = async () => {
    setCameraInfo(null)
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop()
        html5QrcodeRef.current = null
      } catch (err) {
        console.error('停止掃描失敗:', err)
      }
    }
    setScanning(false)
  }
  
  // ----------------------------------------
  // 處理掃描成功
  // ----------------------------------------
  const handleScanSuccess = async (qrCode) => {
    // 停止掃描
    await stopScanning()
    
    setLoading(true)
    
    try {
      // 發送報到請求
      const response = await checkIn(qrCode, eventId)
      
      // 記錄已報到（用於本地顯示）
      localStorage.setItem(`checked_in_${eventId}_${response.user_id}`, 'true')
      
      setResult({
        success: response.success,
        message: response.message,
        userName: response.user_name,
        userEmail: response.user_email,
        eventName: response.event_name,
        checkedInAt: response.checked_in_at
      })
      
      // 刷新統計
      refreshStats()
    } catch (err) {
      // 報到失敗
      setResult({
        success: false,
        message: err.response?.data?.detail || '報到失敗，請重試',
        userName: null,
        userEmail: null,
        eventName: null,
        checkedInAt: null
      })
    } finally {
      setLoading(false)
    }
  }
  
  // ----------------------------------------
  // 繼續掃描
  // ----------------------------------------
  const continueScan = async () => {
    setResult(null)
    setError(null)
    await startScanning()
  }
  
  // ----------------------------------------
  // 格式化時間
  // ----------------------------------------
  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    return timeStr
  }
  
  // ----------------------------------------
  // 組件卸載時清理
  // ----------------------------------------
  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(err => console.error('清理掃描器失敗:', err))
      }
    }
  }, [])
  
  // ----------------------------------------
  // 渲染
  // ----------------------------------------
  return (
    <div className="max-w-lg mx-auto">
      {/* 返回連結 */}
      <Link 
        to="/admin" 
        className="inline-flex items-center text-primary-600 hover:underline mb-4"
        onClick={stopScanning}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        返回活動管理
      </Link>
      
      {/* 活動資訊卡片 */}
      {event && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{event.name}</h2>
          
          {/* 活動詳情 */}
          <div className="grid grid-cols-2 gap-3 text-sm mb-4">
            {event.event_date && (
              <div className="flex items-center text-gray-600">
                <Calendar className="h-4 w-4 mr-2 text-primary-500" />
                <span>{event.event_date}</span>
              </div>
            )}
            {event.start_time && (
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2 text-primary-500" />
                <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
              </div>
            )}
            {event.location && (
              <div className="flex items-center text-gray-600 col-span-2">
                <MapPin className="h-4 w-4 mr-2 text-primary-500" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
          
          {/* 統計資訊 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-primary-600" />
                <span className="text-sm font-medium text-gray-700">報到統計</span>
              </div>
              <button
                onClick={refreshStats}
                className="p-1 text-gray-500 hover:text-primary-600"
                title="重新整理"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-primary-600">{stats.checkedIn}</div>
                <div className="text-xs text-gray-500">已報到</div>
              </div>
              <div className="text-gray-300">/</div>
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
                <div className="text-xs text-gray-500">總人數</div>
              </div>
              <div className="text-gray-300">/</div>
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-green-600">
                  {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-500">出席率</div>
              </div>
            </div>
            
            {/* 進度條 */}
            <div className="mt-3 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.total > 0 ? (stats.checkedIn / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {/* 結果顯示 */}
      {result && (
        <div className={`rounded-xl shadow-sm p-6 mb-4 ${
          result.success ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
        }`}>
          <div className="text-center">
            {/* 圖示 */}
            {result.success ? (
              <CheckCircle className="mx-auto h-16 w-16 text-green-600 mb-4" />
            ) : (
              <XCircle className="mx-auto h-16 w-16 text-red-600 mb-4" />
            )}
            
            {/* 訊息 */}
            <h3 className={`text-xl font-bold mb-2 ${
              result.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.message}
            </h3>
            
            {/* 參加者資訊 */}
            {result.userName && (
              <div className="mt-4 text-left bg-white rounded-lg p-4">
                <div className="flex items-center mb-3">
                  <QrCode className="h-5 w-5 text-primary-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">參加者資訊</span>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-gray-400">姓名</p>
                    <p className="font-semibold text-gray-900">{result.userName}</p>
                  </div>
                  
                  {result.userEmail && (
                    <div>
                      <p className="text-xs text-gray-400">電子郵件</p>
                      <p className="text-sm text-gray-600">{result.userEmail}</p>
                    </div>
                  )}
                  
                  {result.eventName && (
                    <div>
                      <p className="text-xs text-gray-400">活動名稱</p>
                      <p className="text-sm text-gray-600">{result.eventName}</p>
                    </div>
                  )}
                  
                  {result.checkedInAt && (
                    <div>
                      <p className="text-xs text-gray-400">報到時間</p>
                      <p className="text-sm text-gray-600">
                        {new Date(result.checkedInAt).toLocaleString('zh-TW', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 繼續掃描按鈕 */}
            <button
              onClick={continueScan}
              className="mt-4 inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Camera className="h-5 w-5 mr-2" />
              繼續掃描
            </button>
          </div>
        </div>
      )}
      
      {/* 掃描區域 */}
      {!result && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {!scanning ? (
            <div className="p-8 text-center">
              <Camera className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">準備掃描</h3>
              <p className="text-gray-500 mb-6">點擊下方按鈕開啟相機進行掃描</p>
              
              {/* 相機權限錯誤 */}
              {cameraError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                    <p className="text-sm text-red-700 text-left">{cameraError}</p>
                  </div>
                </div>
              )}
              
              <button
                onClick={startScanning}
                className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Camera className="h-5 w-5 mr-2" />
                開始掃描
              </button>
              
              {/* 相機資訊 */}
              {cameraInfo && (
                <p className="mt-4 text-xs text-gray-500">相機: {cameraInfo}</p>
              )}
            </div>
          ) : (
            <>
              {/* 掃描區域 */}
              <div id="qr-reader" className="p-4"></div>
              
              {/* 停止按鈕 */}
              <div className="p-4 border-t">
                <button
                  onClick={stopScanning}
                  className="w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  停止掃描
                </button>
              </div>
            </>
          )}
        </div>
      )}
      
      {/* 載入中 */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-700">處理中...</p>
          </div>
        </div>
      )}
      
      {/* 參加者列表預覽 */}
      {participants.length > 0 && !result && !scanning && (
        <div className="bg-white rounded-xl shadow-sm mt-4">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-primary-500" />
              參加者列表 ({participants.length})
            </h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {participants.slice(0, 10).map((p) => (
              <div key={p.id} className="p-3 border-b last:border-b-0 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{p.name}</p>
                  {p.email && <p className="text-xs text-gray-500">{p.email}</p>}
                </div>
                <div className="text-xs text-gray-400">
                  <QrCode className="h-4 w-4" />
                </div>
              </div>
            ))}
            {participants.length > 10 && (
              <div className="p-3 text-center text-sm text-gray-500">
                還有 {participants.length - 10} 位參加者...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Scanner
