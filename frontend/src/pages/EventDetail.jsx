// ============================================================
// 活動詳情頁面 (參加者)
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, CheckCircle, AlertCircle, RefreshCw, User, Mail } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { getEvent, getAttendanceStatus } from '../api/axios'
import axios from 'axios'

export const EventDetail = () => {
  const { id: eventId } = useParams()
  
  // 狀態
  const [event, setEvent] = useState(null)
  const [qrCode, setQrCode] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrLoading, setQrLoading] = useState(false)
  const [countdown, setCountdown] = useState(30)
  const [error, setError] = useState(null)
  
  // 參加者資訊表單
  const [participantName, setParticipantName] = useState('')
  const [participantEmail, setParticipantEmail] = useState('')
  const [showForm, setShowForm] = useState(true)
  const [formError, setFormError] = useState('')
  
  // ----------------------------------------
  // 取得活動詳情
  // ----------------------------------------
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await getEvent(eventId)
        setEvent(data)
      } catch (err) {
        setError(err.response?.data?.detail || '載入活動失敗')
      }
    }
    fetchEvent()
  }, [eventId])
  
  // ----------------------------------------
  // 取得報到狀態
  // ----------------------------------------
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getAttendanceStatus(eventId)
        setStatus(data)
      } catch (err) {
        console.error('取得報到狀態失敗:', err)
      }
    }
    fetchStatus()
  }, [eventId])
  
  // ----------------------------------------
  // 產生 QR Code
  // ----------------------------------------
  const generateQRCode = useCallback(async () => {
    if (!participantName.trim()) {
      setFormError('請輸入姓名')
      return
    }
    
    try {
      setQrLoading(true)
      setFormError('')
      
      const response = await axios.post(`/api/events/${eventId}/qr/generate`, {
        name: participantName,
        email: participantEmail || null
      })
      
      setQrCode(response.data.qr_code)
      setShowForm(false)
      setCountdown(30)
    } catch (err) {
      console.error('產生 QR Code 失敗:', err)
      setFormError(err.response?.data?.detail || '產生 QR Code 失敗，請稍後再試')
    } finally {
      setQrLoading(false)
    }
  }, [eventId, participantName, participantEmail])
  
  // ----------------------------------------
  // 刷新 QR Code (使用現有資訊)
  // ----------------------------------------
  const refreshQRCode = useCallback(async () => {
    if (!participantName.trim()) return
    
    try {
      setQrLoading(true)
      
      const response = await axios.post(`/api/events/${eventId}/qr/generate`, {
        name: participantName,
        email: participantEmail || null
      })
      
      setQrCode(response.data.qr_code)
      setCountdown(30)
    } catch (err) {
      console.error('刷新 QR Code 失敗:', err)
    } finally {
      setQrLoading(false)
    }
  }, [eventId, participantName, participantEmail])
  
  // 初始載入 QR Code (如果已有資訊)
  useEffect(() => {
    if (event && participantName && !showForm) {
      refreshQRCode()
    }
  }, [event])
  
  // 倒數計時器 (每分鐘刷新 QR Code)
  useEffect(() => {
    if (!qrCode || showForm) return
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          refreshQRCode()
          return 30
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [qrCode, showForm, refreshQRCode])
  
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
  
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return ''
    const date = new Date(dateTimeString)
    return date.toLocaleString('zh-TW')
  }
  
  // ----------------------------------------
  // 重新輸入資訊
  // ----------------------------------------
  const handleResetForm = () => {
    setShowForm(true)
    setQrCode('')
    setParticipantName('')
    setParticipantEmail('')
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
        ← 返回活動列表
      </Link>
      
      {/* 活動資訊卡片 */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{event?.name}</h1>
        
        <div className="space-y-3">
          {/* 日期 */}
          <div className="flex items-center text-gray-700">
            <Calendar className="h-5 w-5 mr-3 text-primary-500" />
            <span>{formatDate(event?.event_date)}</span>
          </div>
          
          {/* 時間 */}
          {event?.start_time && (
            <div className="flex items-center text-gray-700">
              <Clock className="h-5 w-5 mr-3 text-primary-500" />
              <span>
                {formatTime(event?.start_time)}
                {event?.end_time && ` - ${formatTime(event?.end_time)}`}
              </span>
            </div>
          )}
          
          {/* 地點 */}
          {event?.location && (
            <div className="flex items-center text-gray-700">
              <MapPin className="h-5 w-5 mr-3 text-primary-500" />
              <span>{event?.location}</span>
            </div>
          )}
          
          {/* 詳情 */}
          {event?.description && (
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-semibold text-gray-900 mb-2">活動詳情</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{event?.description}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* QR Code 卡片 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">個人報到 QR Code</h2>
          
          {/* 參加者資訊輸入表單 */}
          {showForm ? (
            <div className="max-w-sm mx-auto mb-6">
              <p className="text-gray-500 text-sm mb-4">
                請輸入您的姓名和電郵以產生報到 QR Code
              </p>
              
              <div className="space-y-4">
                {/* 姓名輸入 */}
                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="inline h-4 w-4 mr-1" />
                    姓名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="請輸入您的姓名"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                {/* 電郵輸入 */}
                <div className="text-left">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="inline h-4 w-4 mr-1" />
                    電郵 <span className="text-gray-400">(選填)</span>
                  </label>
                  <input
                    type="email"
                    value={participantEmail}
                    onChange={(e) => setParticipantEmail(e.target.value)}
                    placeholder="請輸入您的電郵 (選填)"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                
                {/* 表單錯誤 */}
                {formError && (
                  <div className="text-red-600 text-sm text-left">
                    {formError}
                  </div>
                )}
                
                {/* 產生 QR Code 按鈕 */}
                <button
                  onClick={generateQRCode}
                  disabled={qrLoading || !participantName.trim()}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {qrLoading ? '產生中...' : '產生 QR Code'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 顯示已輸入的資訊 */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg inline-block">
                <p className="text-sm text-gray-600">
                  <User className="inline h-4 w-4 mr-1" />
                  {participantName}
                  {participantEmail && (
                    <>
                      <span className="mx-2">|</span>
                      <Mail className="inline h-4 w-4 mr-1" />
                      {participantEmail}
                    </>
                  )}
                </p>
                <button
                  onClick={handleResetForm}
                  className="text-xs text-primary-600 hover:underline mt-1 block"
                >
                  更改個人資訊
                </button>
              </div>
              
              {/* 報到狀態 */}
              {status?.is_checked_in && (
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full mb-4">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="font-medium">已完成報到</span>
                </div>
              )}
              
              {/* QR Code 顯示區 */}
              <div className="bg-white p-4 inline-block rounded-xl border-2 border-gray-100">
                {qrLoading ? (
                  <div className="w-48 h-48 flex items-center justify-center">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  <QRCodeSVG
                    value={qrCode}
                    size={200}
                    level={"H"}
                    includeMargin={true}
                  />
                )}
              </div>
              
              {/* 倒數計時器 */}
              <div className="mt-4 flex items-center justify-center text-sm">
                <RefreshCw className="h-4 w-4 mr-2 text-gray-400" />
                <span className="text-gray-500">
                  QR Code 將於 <span className="font-semibold text-primary-600">{countdown}</span> 秒後自動刷新
                </span>
              </div>
              
              {/* 提示 */}
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                  <p className="text-sm text-yellow-800 text-left">
                    QR Code 具有時效性，請在報到時展示最新的 QR Code 畫面
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default EventDetail
