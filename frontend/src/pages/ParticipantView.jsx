// ============================================================
// 參加者檢視頁面
// ============================================================
// 透過連結訪問，顯示活動資訊與 QR Code
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, CheckCircle, AlertCircle, RefreshCw, QrCode, Copy, ExternalLink } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { verifyParticipantToken } from '../api/axios'

export const ParticipantView = () => {
  const { token } = useParams()
  
  // 狀態
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(60)
  
  // ----------------------------------------
  // 驗證 Token 並取得活動資訊
  // ----------------------------------------
  useEffect(() => {
    const verifyToken = async () => {
      try {
        const result = await verifyParticipantToken(token)
        setData(result)
        
        if (!result.valid) {
          setError(result.message)
        }
      } catch (err) {
        setError(err.response?.data?.detail || '驗證失敗，請稍後再試')
      } finally {
        setLoading(false)
      }
    }
    
    verifyToken()
  }, [token])
  
  // ----------------------------------------
  // 刷新 Token (定時更新 QR Code)
  // ----------------------------------------
  const refreshToken = useCallback(async () => {
    try {
      const result = await verifyParticipantToken(token)
      if (result.valid) {
        setData(result)
        setCountdown(60)
      }
    } catch (err) {
      console.error('刷新 Token 失敗:', err)
    }
  }, [token])
  
  // 自動刷新檢查報到狀態 (每10秒)
  useEffect(() => {
    if (!data?.valid) return
    
    const statusTimer = setInterval(() => {
      refreshToken()
    }, 10000)
    
    return () => clearInterval(statusTimer)
  }, [data?.valid, refreshToken])
  
  // 倒數計時器
  useEffect(() => {
    if (!data?.valid) return
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshToken()
          return 60
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [data?.valid, refreshToken])
  
  // ----------------------------------------
  // 頁面可見時自動刷新 (從背景回來時)
  // ----------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && data?.valid) {
        refreshToken()
        setCountdown(60)
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [data?.valid, refreshToken])
  
  // ----------------------------------------
  // 複製連結
  // ----------------------------------------
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('連結已複製到剪貼簿！')
  }
  
  // ----------------------------------------
  // 渲染載入中
  // ----------------------------------------
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-gray-600">驗證中...</p>
        </div>
      </div>
    )
  }
  
  // ----------------------------------------
  // 渲染錯誤
  // ----------------------------------------
  if (error || !data?.valid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-sm p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">驗證失敗</h1>
          <p className="text-gray-600 mb-6">
            {error || data?.message || '無法驗證 QR Code'}
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            返回首頁
          </Link>
        </div>
      </div>
    )
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
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頁面頂部 */}
      <div className="bg-primary-600 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-2">活動報到</h1>
          <p className="text-primary-100">您好，{data.participant_name}</p>
        </div>
      </div>
      
      <div className="container mx-auto px-4 -mt-6">
        {/* 報到狀態卡片 */}
        {data.is_checked_in && (
          <div className="max-w-md mx-auto bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-4 text-center">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-green-800">✅ 您已完成報到！</h3>
            <p className="text-sm text-green-600">感謝您參加本次活動</p>
          </div>
        )}
        
        {/* 活動資訊卡片 */}
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {data.event_name}
            </h2>
            
            <div className="space-y-3">
              {/* 日期 */}
              {data.event_date && (
                <div className="flex items-center text-gray-700">
                  <Calendar className="h-5 w-5 mr-3 text-primary-500" />
                  <span>{formatDate(data.event_date)}</span>
                </div>
              )}
              
              {/* 時間 */}
              {data.event_time && (
                <div className="flex items-center text-gray-700">
                  <Clock className="h-5 w-5 mr-3 text-primary-500" />
                  <span>{data.event_time}</span>
                </div>
              )}
              
              {/* 地點 */}
              {data.event_location && (
                <div className="flex items-center text-gray-700">
                  <MapPin className="h-5 w-5 mr-3 text-primary-500" />
                  <span>{data.event_location}</span>
                </div>
              )}
            </div>
            
            {/* 詳情 */}
            {data.event_description && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="font-semibold text-gray-900 mb-2">活動詳情</h3>
                <p className="text-gray-600 whitespace-pre-wrap">
                  {data.event_description}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* QR Code 卡片 */}
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <QrCode className="h-6 w-6 text-primary-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">報到 QR Code</h3>
            </div>
            
            <p className="text-sm text-gray-500 mb-4">
              請出示此 QR Code 供管理員掃描報到
            </p>
            
            {/* QR Code 顯示區 */}
            <div className="bg-white p-4 inline-block rounded-xl border-2 border-gray-100 mb-4">
              <QRCodeSVG
                value={token}
                size={200}
                level={"H"}
                includeMargin={true}
              />
            </div>
            
            {/* 倒數計時器 */}
            <div className="flex items-center justify-center text-sm mb-4">
              <RefreshCw className="h-4 w-4 mr-2 text-gray-400" />
              <span className="text-gray-500">
                QR Code 將於 <span className="font-semibold text-primary-600">{countdown}</span> 秒後自動刷新
              </span>
            </div>
            
            {/* 提示 */}
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                <p className="text-sm text-yellow-800 text-left">
                  QR Code 具有時效性，請在報到時展示最新的 QR Code 畫面
                </p>
              </div>
            </div>
            
            {/* 操作按鈕 */}
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={copyLink}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <Copy className="h-4 w-4 mr-2" />
                複製連結
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* 底部資訊 */}
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-sm text-gray-400">
          活動報到系統 © 2026
        </p>
      </div>
    </div>
  )
}

export default ParticipantView
