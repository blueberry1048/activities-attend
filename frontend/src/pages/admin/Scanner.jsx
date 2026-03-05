// ============================================================
// QR Code 掃描頁面 (管理員)
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowLeft, Camera, CheckCircle, XCircle, AlertCircle, Users, Clock, MapPin, Calendar, RefreshCw, QrCode } from 'lucide-react'
import { getEvent, checkIn, getParticipants } from '../../api/supabase'

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
        
        // 轉換 Supabase 回傳的資料結構
        const formattedParticipants = (participantsData || []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          name: p.user?.full_name || '未知',
          email: p.user?.email || '',
          is_checked_in: p.is_checked_in,
          checked_in_at: p.checked_in_at
        }))
        
        setParticipants(formattedParticipants)
        
        // 計算統計資料
        const total = participantsData.length || 0
        const checkedIn = participantsData?.filter(p => {
          // 假設有 is_checked_in 欄位
          return p.is_checked_in === true
        }).length || 0
        
        // 從活動資料取得已報到人數
        setStats({
          total: total,
          checkedIn: checkedIn
        })
      } catch (err) {
        console.error('載入活動失敗:', err)
        setError(err.message || '載入活動失敗')
      }
    }
    fetchData()
  }, [eventId])

  // ----------------------------------------
  // 自動刷新統計資料 (每3秒)
  // ----------------------------------------
  useEffect(() => {
    if (!eventId) return
    
    const interval = setInterval(() => {
      refreshStats()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [eventId])
  
  // ----------------------------------------
  // 頁面可見時自動刷新統計
  // ----------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshStats()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // ----------------------------------------
  // 重新整理統計資料
  // ----------------------------------------
  const refreshStats = async () => {
    try {
      const participantsData = await getParticipants(eventId)
      
      // 轉換 Supabase 回傳的資料結構
      const formattedParticipants = (participantsData || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        name: p.user?.full_name || '未知',
        email: p.user?.email || '',
        is_checked_in: p.is_checked_in,
        checked_in_at: p.checked_in_at
      }))
      
      setParticipants(formattedParticipants)
      
      const total = formattedParticipants.length || 0
      const checkedIn = participantsData?.filter(p => p.is_checked_in === true).length || 0
      
      setStats({
        total: total,
        checkedIn: checkedIn
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
      // 如果是網址，則提取 token
      let token = qrCode
      if (qrCode.includes('/participants/')) {
        const url = new URL(qrCode)
        token = url.pathname.split('/participants/')[1] || qrCode
      }
      
      // 發送報到請求
      const response = await checkIn(token, eventId)

      setResult({
        success: true,
        message: '報到成功！',
        userName: response.user?.full_name || response.user?.email,
        userEmail: response.user?.email,
        eventName: response.event?.name,
        checkedInAt: response.checked_in_at
      })
      
      // 刷新統計
      refreshStats()
      
      // 自動繼續掃描 (2秒後)
      setTimeout(async () => {
        setResult(null)
        setError(null)
        await startScanning()
      }, 2000)
    } catch (err) {
      // 報到失敗
      setResult({
        success: false,
        message: err.message || '報到失敗，請重試',
        userName: null,
        userEmail: null,
        eventName: null,
        checkedInAt: null
      })
      
      // 自動繼續掃描 (2秒後)
      setTimeout(async () => {
        setResult(null)
        setError(null)
        await startScanning()
      }, 2000)
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
<div className="    max-w-7xl mx-auto">
      {/* 返回連結 */}
      <Link 
        to="/" 
        className="inline-flex items-center text-primary-600 hover:underline mb-4"
        onClick={stopScanning}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        返回活動列表
      </Link>
      
      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {/* 結果顯示 */}
      {result && (
        <div className={`rounded-xl shadow-lg p-6 mb-4 ${result.success ? 'bg-green-50 border-2 border-green-300' : 'bg-red-50 border-2 border-red-300'}`}>
          <div className="flex items-center justify-between">
            {/* 圖示和訊息 */}
            <div className="flex items-center">
              {result.success ? (
                <CheckCircle className="h-16 w-16 text-green-600 mr-4" />
              ) : (
                <XCircle className="h-16 w-16 text-red-600 mr-4" />
              )}
              
              <div>
                <h3 className={`text-2xl font-bold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                  {result.message}
                </h3>
                
                {/* 參加者資訊 */}
                {result.userName && (
                  <div className="mt-2">
                    <p className="text-lg font-semibold text-gray-900">{result.userName}</p>
                    {result.userEmail && <p className="text-gray-600">{result.userEmail}</p>}
                    {result.checkedInAt && (
                      <p className="text-sm text-gray-500 mt-1">
                        報到時間：{new Date(result.checkedInAt).toLocaleString('zh-TW')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* 繼續掃描按鈕 */}
            <button
              onClick={continueScan}
              className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg text-lg hover:bg-primary-700"
            >
              <Camera className="h-5 w-5 mr-2" />
              繼續掃描
            </button>
          </div>
        </div>
      )}
      
      {/* 主要內容區 - 雙欄佈局 */}
      {!result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：掃描器 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* 掃描區域 */}
              {!scanning ? (
                <div className="p-12 text-center">
                  <Camera className="mx-auto h-20 w-20 text-gray-300 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">準備掃描</h3>
                  <p className="text-gray-500 mb-6">點擊下方按鈕開啟相機</p>
                  
                  {/* 相機權限錯誤 */}
                  {cameraError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 max-w-md mx-auto">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700 text-left">{cameraError}</p>
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={startScanning}
                    className="inline-flex items-center px-8 py-4 bg-primary-600 text-white rounded-xl text-lg hover:bg-primary-700"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    開始掃描
                  </button>
                  
                  {/* 相機資訊 */}
                  {cameraInfo && (
                    <p className="mt-4 text-sm text-gray-400">📷 {cameraInfo}</p>
                  )}
                </div>
              ) : (
                <div className="relative">
                  {/* 掃描區域 */}
                  <div id="qr-reader" className="h-[400px] bg-gray-900"></div>
                  
                  {/* 停止按鈕 */}
                  <div className="p-4 bg-gray-800">
                    <button
                      onClick={stopScanning}
                      className="w-full py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      停止掃描
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 右側：活動資訊和參加者列表 */}
          <div className="space-y-4">
            {/* 活動資訊和統計 */}
            {event && (
              <div className="bg-white rounded-xl shadow-lg p-4">
                <h2 className="text-xl font-bold text-gray-900 mb-3">{event.name}</h2>
                
                {/* 活動詳情 */}
                <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                  {event.event_date && (
                    <span className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                      <Calendar className="h-4 w-4 mr-1 text-primary-500" />
                      {event.event_date}
                    </span>
                  )}
                  {event.start_time && (
                    <span className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                      <Clock className="h-4 w-4 mr-1 text-primary-500" />
                      {formatTime(event.start_time)}
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                      <MapPin className="h-4 w-4 mr-1 text-primary-500" />
                      {event.location}
                    </span>
                  )}
                </div>
                
                {/* 統計資訊 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-700">報到統計</span>
                    <button
                      onClick={refreshStats}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                      title="重新整理"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-2xl font-bold text-primary-600">{stats.checkedIn}</div>
                      <div className="text-xs text-gray-500">已報到</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
                      <div className="text-xs text-gray-500">總人數</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-2xl font-bold text-green-600">
                        {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}%
                      </div>
                      <div className="text-xs text-gray-500">出席率</div>
                    </div>
                  </div>
                  
                  {/* 進度條 */}
                  <div className="mt-3 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-primary-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${stats.total > 0 ? (stats.checkedIn / stats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* 參加者列表 */}
            {participants.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg">
                <div className="p-3 border-b flex items-center justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-primary-500" />
                    參加者列表 ({participants.length})
                  </h3>
                  <span className="text-sm text-green-600 font-medium">
                    {stats.checkedIn} 已報到
                  </span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">狀態</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">姓名</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">郵箱</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">報到時間</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {participants.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            {p.is_checked_in ? (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                已報到
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                                未報到
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2 font-medium text-gray-900">{p.name}</td>
                          <td className="px-4 py-2 text-gray-600 text-sm">{p.email || '-'}</td>
                          <td className="px-4 py-2 text-gray-500 text-sm">
                            {p.checked_in_at ? new Date(p.checked_in_at).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 載入中 */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="spinner mx-auto mb-4"></div>
            <p className="text-gray-700 text-lg">處理中...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Scanner
