// ============================================================
// 參加者檢視頁面
// ============================================================
// 透過連結訪問，顯示活動資訊與 QR Code
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, CheckCircle, AlertCircle, RefreshCw, QrCode, Copy, ExternalLink, Sparkles } from 'lucide-react'
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
      let attendance
      
      if (shouldRegenerate) {
        setIsRefreshing(true)
        // 產生新的 QR Token
        attendance = await regenerateQRToken(token)
      } else {
        // 只驗證現有 Token
        attendance = await verifyParticipantToken(token)
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
  }, [token])
  
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
  
  // 自動刷新檢查報到狀態 (每10秒)
  useEffect(() => {
    if (!data) return
    
    const statusTimer = setInterval(() => {
      refreshToken()
    }, 10000)
    
    return () => clearInterval(statusTimer)
  }, [data, refreshToken])
  
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
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 pb-8">
      {/* 頂部裝飾 */}
      <div className="relative overflow-hidden">
        {/* 裝飾圓形 */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-b from-primary-400 to-transparent opacity-20 rounded-[100%]"></div>
        
        {/* 頂部 Header */}
        <div className="relative pt-12 pb-16 px-6">
          {/* 成功報到狀態 */}
          {data.is_checked_in && (
            <div className="max-w-md mx-auto mb-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-green-200 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-green-800">已完成報到</h3>
                  <p className="text-sm text-green-600">歡迎參加本次活動！</p>
                </div>
              </div>
            </div>
          )}
          
          {/* 歡迎文字 */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
              <Sparkles className="h-4 w-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-700">活動報到系統</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              您好，{data.participant_name}
            </h1>
            <div className="inline-flex items-center px-6 py-3 bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100">
              <p className="text-gray-600 font-medium">請出示 QR Code 進行報到</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 -mt-8">
        {/* 活動資訊卡片 */}
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-start gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-primary-600" />
              </div>
              {data.event_name}
            </h2>
            
            <div className="space-y-4">
              {/* 日期 */}
              {data.event_date && (
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">活動日期</p>
                    <p className="text-gray-900 font-semibold">{formatDate(data.event_date)}</p>
                  </div>
                </div>
              )}
              
              {/* 時間 */}
              {data.event_time && (
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">開始時間</p>
                    <p className="text-gray-900 font-semibold">{data.event_time}</p>
                  </div>
                </div>
              )}
              
              {/* 地點 */}
              {data.event_location && (
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MapPin className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">活動地點</p>
                    <p className="text-gray-900 font-semibold">{data.event_location}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* 詳情 */}
            {data.event_description && (
              <div className="mt-6 pt-6 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">活動說明</h3>
                <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">
                  {data.event_description}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* QR Code 卡片 */}
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <QrCode className="h-6 w-6 text-primary-600" />
              <h3 className="text-lg font-bold text-gray-900">報到 QR Code</h3>
            </div>
            
            <p className="text-sm text-gray-500 mb-6">
              請出示此 QR Code 供管理員掃描
            </p>
            
            {/* QR Code 顯示區 */}
            <div className={`relative inline-block mb-6 ${isRefreshing ? 'animate-pulse' : ''}`}>
              {/* 發光背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-3xl blur-xl opacity-20 transform scale-110"></div>
              
              {/* QR Code 本體 */}
              <div className="relative bg-white p-4 rounded-3xl border-2 border-gray-100 shadow-inner">
                <QRCodeSVG
                  value={`${window.location.origin}/participants/${currentToken}`}
                  size={220}
                  level={"H"}
                  includeMargin={true}
                  imageSettings={data.is_checked_in ? {
                    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366f1'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/%3E%3C/svg%3E",
                    height: 40,
                    width: 40,
                    excavate: true
                  } : undefined}
                />
              </div>
            </div>
            
            {/* 倒數計時器 */}
            <div className="mb-6">
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden mb-2">
                <div 
                  className="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 60) * 100}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary-600' : 'text-gray-400'}`} />
                <span className="text-gray-500">
                  {isRefreshing ? '產生新碼中...' : `QR Code 將於 ${countdown} 秒後自動刷新`}
                </span>
              </div>
            </div>
            
            {/* 提示 */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 text-left">
                  為確保安全，QR Code 具有時效性。請在報到時展示最新的 QR Code 畫面
                </p>
              </div>
            </div>
            
            {/* 操作按鈕 */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  refreshToken(true)
                  setCountdown(60)
                }}
                disabled={isRefreshing}
                className="w-full inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-2xl hover:from-primary-600 hover:to-primary-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`h-5 w-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? '產生中...' : '立即刷新 QR Code'}
              </button>
              
              <button
                onClick={copyLink}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-2xl hover:bg-gray-200 transition-colors"
              >
                <Copy className="h-4 w-4 mr-2" />
                複製報到連結
              </button>
            </div>
          </div>
        </div>
        
        {/* 底部資訊 */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-400">
            活動報到系統 v2.0
          </p>
        </div>
      </div>
    </div>
  )
}
