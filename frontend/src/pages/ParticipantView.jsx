// ============================================================
// 參加者檢視頁面
// ============================================================
// 透過連結訪問，顯示活動資訊與 QR Code
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, CheckCircle, AlertCircle, RefreshCw, QrCode, Copy, ExternalLink, Download, Info } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { verifyParticipantToken, regenerateQRToken } from '../api/supabase'
import { supabase } from '../lib/supabase'

export const ParticipantView = () => {
  const { token } = useParams()
  
  // 狀態
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(60)
  const [currentToken, setCurrentToken] = useState(token) // 追蹤當前 Token (用於動態 QR Code)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('qr') // 'info' or 'qr'
  
  // PWA 安裝狀態
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  
  // ----------------------------------------
  // PWA: 監聽安裝提示
  // ----------------------------------------
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
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
    if (!deferredPrompt) return
    
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    setDeferredPrompt(null)
    setShowInstallButton(false)
  }
  
  // ----------------------------------------
  // 驗證 Token 並取得活動資訊
  // ----------------------------------------
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const attendance = await verifyParticipantToken(token)
        
        // 轉換為頁面需要的格式
        const result = {
          valid: true,
          participant_name: attendance.user?.full_name || attendance.user?.email,
          is_checked_in: attendance.is_checked_in,
          event_name: attendance.event?.name,
          event_date: attendance.event?.event_date,
          event_time: attendance.event?.start_time,
          event_location: attendance.event?.location,
          event_description: attendance.event?.description
        }
        
        setData(result)
        setCurrentToken(token)
      } catch (err) {
        console.error('驗證 Token 失敗:', err)
        setError(err.message || '無效的 QR Code')
      } finally {
        setLoading(false)
      }
    }
    
    verifyToken()
  }, [token])
  
  // 刷新 Token (定時更新 QR Code)
  // ----------------------------------------
  const refreshToken = useCallback(async (shouldRegenerate = false) => {
    try {
      // 使用 currentToken 而非 token，因為 token 是 URL 參數不會自動更新
      const activeToken = shouldRegenerate ? currentToken : currentToken
      
      let attendance
      
      if (shouldRegenerate) {
        setIsRefreshing(true)
        // 產生新的 QR Token
        attendance = await regenerateQRToken(activeToken)
      } else {
        // 只驗證現有 Token
        attendance = await verifyParticipantToken(activeToken)
      }
      
      const result = {
        valid: true,
        participant_name: attendance.user?.full_name || attendance.user?.email,
        is_checked_in: attendance.is_checked_in,
        event_name: attendance.event?.name,
        event_date: attendance.event?.event_date,
        event_time: attendance.event?.start_time,
        event_location: attendance.event?.location,
        event_description: attendance.event?.description,
        newQrToken: shouldRegenerate ? attendance.qr_token : null
      }
      
      setData(result)
      setCountdown(60)
      
      // 如果產生了新 Token，更新 URL (不重新整理頁面)
      if (shouldRegenerate && attendance.qr_token) {
        setCurrentToken(attendance.qr_token)
        // 更新瀏覽器 URL 但不重新載入
        window.history.replaceState(null, '', `/participants/${attendance.qr_token}`)
      }
    } catch (err) {
      console.error('刷新 Token 失敗:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [currentToken])
  
  // ----------------------------------------
  // Supabase 即時訂閱 - 監聽報到狀態變化
  // ----------------------------------------
  useEffect(() => {
    if (!currentToken) return
    
    // 訂閱 event_attendances 表格的變化
    const channel = supabase
      .channel('attendance-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_attendances',
          filter: `qr_token=eq.${currentToken}`
        },
        (payload) => {
          // 立即刷新資料
          refreshToken()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentToken, refreshToken])
  
  // 倒數計時器
  useEffect(() => {
    if (!data)
      return
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshToken(true) // 產生新的 QR Token
          return 60
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [data, refreshToken])
  
  // ----------------------------------------
  // 頁面可見時自動刷新 (從背景回來時)
  // ----------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && data) {
        refreshToken()
        setCountdown(60)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [data, refreshToken])
  
  // ----------------------------------------
  // 複製連結
  // ----------------------------------------
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('連結已複製到剪貼簿！')
  }
  
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
      weekday: 'long'
    })
  }
  
  // ----------------------------------------
  // 渲染載入中
  // ----------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 flex justify-center items-center p-4">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
            <QrCode className="h-10 w-10 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-white/90 mt-6 font-medium">正在驗證您的報到資訊...</p>
        </div>
      </div>
    )
  }
  
  // ----------------------------------------
  // 渲染錯誤
  // ----------------------------------------
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">驗證失敗</h1>
            <p className="text-gray-500 mb-8">
              {error || data?.message || '無法驗證 QR Code，請確認連結是否正確'}
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center justify-center w-full px-6 py-4 bg-primary-600 text-white font-semibold rounded-2xl hover:bg-primary-700 transition-all shadow-lg hover:shadow-xl"
            >
              返回首頁
            </Link>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 pb-20">
      {/* 頂部 Header */}
      <div className="pt-8 pb-10 px-6">
        {/* 成功報到狀態 */}
        {data.is_checked_in && (
          <div className="max-w-md mx-auto mb-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-lg border border-green-200 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-green-800 text-sm">已完成報到</h3>
                <p className="text-xs text-green-600">歡迎參加本次活動！</p>
              </div>
            </div>
          </div>
        )}
        
        {/* 歡迎文字 */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            您好，{data.participant_name}
          </h1>
          <p className="text-sm text-gray-600">請出示 QR Code 進行報到</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 -mt-2">
        {/* 活動詳情 Tab */}
        {activeTab === 'info' && (
          <div className="max-w-md mx-auto">
            {/* 活動資訊卡片 */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-4">
              <div className="p-5">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 text-primary-600" />
                  </div>
                  {data.event_name}
                </h2>
                
                <div className="space-y-3">
                  {/* 日期 */}
                  {data.event_date && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">活動日期</p>
                        <p className="text-gray-900 font-semibold text-sm">{formatDate(data.event_date)}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 時間 */}
                  {data.event_time && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Clock className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">開始時間</p>
                        <p className="text-gray-900 font-semibold text-sm">{data.event_time}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* 地點 */}
                  {data.event_location && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center">
                        <MapPin className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">活動地點</p>
                        <p className="text-gray-900 font-semibold text-sm">{data.event_location}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 詳情 */}
                {data.event_description && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm">活動說明</h3>
                    <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">
                      {data.event_description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* QR Code Tab */}
        {activeTab === 'qr' && (
          <div className="max-w-md mx-auto">
            {/* QR Code 卡片 */}
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-4">
              <div className="p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <QrCode className="h-5 w-5 text-primary-600" />
                  <h3 className="text-base font-bold text-gray-900">報到 QR Code</h3>
                </div>
                
                <p className="text-xs text-gray-500 mb-4">
                  請出示此 QR Code 供管理員掃描
                </p>
                
                {/* QR Code 顯示區 */}
                <div className={`relative inline-block mb-4 ${isRefreshing ? 'animate-pulse' : ''}`}>
                  {/* 發光背景 */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl blur-xl opacity-20 transform scale-110"></div>
                  
                  {/* QR Code 本體 */}
                  <div className="relative bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-inner">
                    <QRCodeSVG
                      value={`${window.location.origin}/participants/${currentToken}`}
                      size={200}
                      level={"H"}
                      includeMargin={true}
                      imageSettings={data.is_checked_in ? {
                        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2322c55e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M22 11.08V12a10 10 0 1 1-5.93-9.14'%3E%3C/path%3E%3Cpath d='m9 11 3 3L22 4'%3E%3C/path%3E%3C/svg%3E",
                        height: 36,
                        width: 36,
                        excavate: true
                      } : undefined}
                    />
                  </div>
                </div>
                
                {/* 倒數計時器 */}
                <div className="mb-4">
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mb-2">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-1000 ease-linear"
                      style={{ width: `${(countdown / 60) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-center gap-1.5 text-xs">
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-primary-600' : 'text-gray-400'}`} />
                    <span className="text-gray-500">
                      {isRefreshing ? '產生新碼中...' : `${countdown} 秒後自動刷新`}
                    </span>
                  </div>
                </div>
                
                {/* 提示 */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 text-left">
                      QR Code 具有時效性，請展示最新畫面
                    </p>
                  </div>
                </div>
                
                {/* 操作按鈕 */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      refreshToken(true)
                      setCountdown(60)
                    }}
                    disabled={isRefreshing}
                    className="w-full inline-flex items-center justify-center px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? '產生中...' : '立即刷新'}
                  </button>
                  
                  <button
                    onClick={copyLink}
                    className="w-full inline-flex items-center justify-center px-5 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    複製連結
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 底部導航欄 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-pb">
        <div className="flex items-center justify-around py-2">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex flex-col items-center py-2 px-6 rounded-lg transition-colors ${
              activeTab === 'info' ? 'text-primary-600 bg-primary-50' : 'text-gray-500'
            }`}
          >
            <Info className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">活動詳情</span>
          </button>
          
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex flex-col items-center py-2 px-6 rounded-lg transition-colors ${
              activeTab === 'qr' ? 'text-primary-600 bg-primary-50' : 'text-gray-500'
            }`}
          >
            <QrCode className="h-6 w-6" />
            <span className="text-xs mt-1 font-medium">QR Code</span>
          </button>
        </div>
      </div>
      
      {/* 底部資訊 */}
      <div className="text-center mt-6 pb-24">
        <p className="text-xs text-gray-400">
          活動報到系統 v2.0
        </p>
      </div>
    </div>
  )
}
