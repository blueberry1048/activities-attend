// ============================================================
// Helper 掃描頁面 (手機優化版)
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { ArrowLeft, Camera, CheckCircle, XCircle, RefreshCw, Volume2, VolumeX, CameraSwitch } from 'lucide-react'
import { getEvent, checkIn } from '../../api/supabase'
import HelperNavBar from '../../components/HelperNavBar'

export const HelperScan = () => {
  const { eventId } = useParams()
  const navigate = useNavigate()
  
  // 狀態
  const [event, setEvent] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 })
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [cameras, setCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState(null)
  
  // 掃描器引用
  const html5QrcodeRef = useRef(null)

  // ----------------------------------------
  // 載入可用相機
  // ----------------------------------------
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras()
        if (devices && devices.length > 0) {
          setCameras(devices)
          // 預設選擇後鏡頭
          const backCamera = devices.find(c => 
            c.label && (
              c.label.toLowerCase().includes('back') || 
              c.label.toLowerCase().includes('rear')
            )
          )
          setSelectedCameraId(backCamera ? backCamera.id : devices[devices.length - 1].id)
        }
      } catch (err) {
        console.error('載入相機失敗:', err)
      }
    }
    loadCameras()
  }, [])

  // ----------------------------------------
  // 載入活動資訊
  // ----------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventData = await getEvent(eventId)
        setEvent(eventData)
      } catch (err) {
        console.error('載入活動失敗:', err)
      }
    }
    fetchData()
  }, [eventId])

  // ----------------------------------------
  // 清理函數
  // ----------------------------------------
  const cleanupScanner = useCallback(async () => {
    if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
      try {
        await html5QrcodeRef.current.stop()
        html5QrcodeRef.current = null
      } catch (err) {
        console.error('停止掃描失敗:', err)
      }
    }
    setScanning(false)
  }, [])

  // ----------------------------------------
  // 開始掃描
  // ----------------------------------------
  const startScanning = async (cameraId = null) => {
    setCameraError(null)
    setScanning(true)
    
    try {
      const devices = await Html5Qrcode.getCameras()
      
      if (!devices || devices.length === 0) {
        setCameraError('找不到相機設備')
        setScanning(false)
        return
      }
      
      html5QrcodeRef.current = new Html5Qrcode("qr-reader")
      
      // 使用指定的相機或已選擇的相機
      let selectedId = cameraId || selectedCameraId
      
      // 如果沒有選擇相機，預設後鏡頭
      if (!selectedId) {
        const backCamera = devices.find(c => 
          c.label && (
            c.label.toLowerCase().includes('back') || 
            c.label.toLowerCase().includes('rear')
          )
        )
        selectedId = backCamera ? backCamera.id : devices[devices.length - 1].id
        setSelectedCameraId(selectedId)
      }
      
      await html5QrcodeRef.current.start(
        selectedId,
        {
          fps: 10,
          qrbox: { width: 280, height: 280 }
        },
        (decodedText) => {
          handleScanSuccess(decodedText)
        },
        (errorMessage) => {
          // 忽略掃描錯誤
        }
      )
    } catch (err) {
      console.error('相機錯誤:', err)
      setScanning(false)
      
      if (err.toString().includes('Permission') || err.toString().includes('NotAllowed')) {
        setCameraError('請授予相機權限')
      } else if (err.toString().includes('NotFound')) {
        setCameraError('找不到相機設備')
      } else {
        setCameraError('相機啟動失敗')
      }
    }
  }

  // ----------------------------------------
  // 處理掃描成功
  // ----------------------------------------
  const handleScanSuccess = async (qrCode) => {
    // 停止掃描
    await cleanupScanner()
    setLoading(true)
    
    try {
      // 提取 token
      let token = qrCode
      if (qrCode.includes('/participants/')) {
        const url = new URL(qrCode)
        token = url.pathname.split('/participants/')[1] || qrCode
      }
      
      // 發送報到請求
      const response = await checkIn(token, eventId)
      
      // 播放成功音效
      if (soundEnabled) {
        playSound('success')
      }
      
      setResult({
        success: true,
        message: '報到成功！',
        userName: response.user?.full_name || response.user?.email,
        checkedInAt: response.checked_in_at
      })
      
      // 更新統計
      updateStats()
      
      // 3秒後自動繼續掃描
      setTimeout(async () => {
        setResult(null)
        await startScanning()
      }, 2500)
      
    } catch (err) {
      // 播放失敗音效
      if (soundEnabled) {
        playSound('error')
      }
      
      setResult({
        success: false,
        message: err.message || '報到失敗',
        userName: null,
        checkedInAt: null
      })
      
      // 3秒後自動繼續掃描
      setTimeout(async () => {
        setResult(null)
        await startScanning()
      }, 2500)
    } finally {
      setLoading(false)
    }
  }

  // ----------------------------------------
  // 更新統計
  // ----------------------------------------
  const updateStats = async () => {
    // 這裡可以調用 API 獲取最新統計
    // 暫時使用簡單的遞增
    setStats(prev => ({
      ...prev,
      checkedIn: prev.checkedIn + 1
    }))
  }

  // ----------------------------------------
  // 播放音效
  // ----------------------------------------
  const playSound = (type) => {
    // 使用 Web Audio API 產生提示音
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      if (type === 'success') {
        oscillator.frequency.value = 800
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      } else {
        oscillator.frequency.value = 300
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      }
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (e) {
      // 忽略音效錯誤
    }
  }

  // ----------------------------------------
  // 返回活動列表
  // ----------------------------------------
  const handleBack = async () => {
    await cleanupScanner()
    navigate('/helper/events')
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
  }, [cleanupScanner])

  // ----------------------------------------
  // 渲染
  // ----------------------------------------
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* 頂部欄 */}
      <div className="bg-gray-800 text-white p-3 flex items-center justify-between">
        <button
          onClick={handleBack}
          className="flex items-center text-white/80 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          返回
        </button>
        
        <h1 className="text-base font-medium truncate flex-1 text-center px-2">
          {event?.name || '載入中...'}
        </h1>
        
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2"
        >
          {soundEnabled ? (
            <Volume2 className="h-5 w-5 text-white/80" />
          ) : (
            <VolumeX className="h-5 w-5 text-white/40" />
          )}
        </button>
      </div>

      {/* 掃描結果 */}
      {result && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center p-6 ${
          result.success ? 'bg-green-500/90' : 'bg-red-500/90'
        }`}>
          <div className="text-center">
            {result.success ? (
              <CheckCircle className="h-24 w-24 text-white mx-auto mb-4 animate-bounce" />
            ) : (
              <XCircle className="h-24 w-24 text-white mx-auto mb-4" />
            )}
            
            <h2 className="text-3xl font-bold text-white mb-2">
              {result.message}
            </h2>
            
            {result.userName && (
              <p className="text-xl text-white/90 mb-2">{result.userName}</p>
            )}
            
            {result.checkedInAt && (
              <p className="text-white/70">
                {new Date(result.checkedInAt).toLocaleTimeString('zh-TW', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 載入中 */}
      {loading && (
        <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-full p-4">
            <RefreshCw className="h-8 w-8 text-primary-600 animate-spin" />
          </div>
        </div>
      )}

      {/* 掃描區域 */}
      <div className="flex-1 flex flex-col">
        {/* QR Reader */}
        <div className="flex-1 relative">
          <div id="qr-reader" className="absolute inset-0"></div>
          
          {/* 掃描時的相機切換按鈕 */}
          {scanning && cameras.length > 1 && (
            <div className="absolute top-4 right-4 z-10">
              <select
                value={selectedCameraId || ''}
                onChange={async (e) => {
                  const newCameraId = e.target.value
                  await cleanupScanner()
                  setSelectedCameraId(newCameraId)
                  setTimeout(() => startScanning(newCameraId), 100)
                }}
                className="px-3 py-2 bg-black/50 text-white rounded-lg text-sm backdrop-blur-sm"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `相機 ${cameras.indexOf(camera) + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* 掃描框裝飾 */}
          {scanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[280px] h-[280px] relative">
                {/* 四角 */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>
                
                {/* 掃描線動畫 */}
                <div className="absolute left-2 right-2 top-1/2">
                  <div className="h-1 bg-gradient-to-r from-transparent via-primary-400 to-transparent animate-scan"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* 相機錯誤 */}
          {cameraError && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center p-6">
              <div className="text-center text-white">
                <Camera className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                <p className="text-lg font-medium mb-2">{cameraError}</p>
                <p className="text-gray-400 text-sm mb-4">請確保使用 HTTPS 連線並授予相機權限</p>
                <button
                  onClick={startScanning}
                  className="px-6 py-3 bg-primary-600 rounded-lg font-medium"
                >
                  重試
                </button>
              </div>
            </div>
          )}
          
          {/* 未掃描時的提示 */}
          {!scanning && !cameraError && !result && (
            <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
              <div className="text-center text-white p-6">
                <Camera className="h-20 w-20 mx-auto mb-4 text-gray-500" />
                <p className="text-lg font-medium mb-2">準備掃描</p>
                <p className="text-gray-400 text-sm mb-6">點擊下方按鈕開啟相機</p>
                
                {/* 相機選擇 */}
                {cameras.length > 1 && (
                  <div className="mb-6">
                    <label className="text-sm text-gray-400 block mb-2">選擇相機</label>
                    <select
                      value={selectedCameraId || ''}
                      onChange={(e) => setSelectedCameraId(e.target.value)}
                      className="px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 w-full max-w-xs"
                    >
                      {cameras.map((camera) => (
                        <option key={camera.id} value={camera.id}>
                          {camera.label || `相機 ${cameras.indexOf(camera) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <button
                  onClick={() => startScanning()}
                  className="px-8 py-4 bg-primary-600 text-white rounded-full font-semibold text-lg shadow-lg active:scale-95 transition-transform"
                >
                  開始掃描
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* 底部統計 */}
        <div className="bg-gray-800 p-4">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{stats.checkedIn}</div>
              <div className="text-xs text-gray-400">已報到</div>
            </div>
            <div className="text-gray-600 text-2xl">/</div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-gray-400">總人數</div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部導航欄 */}
      <HelperNavBar />
      
      {/* 樣式注入 */}
      <style>{`
        @keyframes scan {
          0%, 100% { transform: translateY(-100px); opacity: 0; }
          50% { transform: translateY(0); opacity: 1; }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}

export default HelperScan
