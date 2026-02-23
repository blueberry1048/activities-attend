// ============================================================
// 參加者管理頁面 (管理員)
// ============================================================
// 管理活動的參加者名單與 QR Code
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Users, Download, Mail, Trash2, Copy, QrCode, RefreshCw, ExternalLink } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { getEvent, createParticipant, createParticipantsBulk, getParticipants } from '../../api/axios'

export const ParticipantManagement = () => {
  const { id: eventId } = useParams()
  
  // 狀態
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  
  // 表單狀態
  const [showForm, setShowForm] = useState(false)
  const [showBulkForm, setShowBulkForm] = useState(false)
  const [participantName, setParticipantName] = useState('')
  const [participantEmail, setParticipantEmail] = useState('')
  const [participantPhone, setParticipantPhone] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  
  // QR Code 顯示
  const [selectedQR, setSelectedQR] = useState(null)
  
  // ----------------------------------------
  // 取得活動詳情
  // ----------------------------------------
  useEffect(() => {
    const fetchData = async () => {
      try {
        const eventData = await getEvent(eventId)
        setEvent(eventData)
        
        try {
          const participantsData = await getParticipants(eventId)
          setParticipants(participantsData.participants || [])
        } catch (pErr) {
          console.log('取得參加者失敗:', pErr)
          setParticipants([])
        }
      } catch (err) {
        setError(err.response?.data?.detail || '載入活動失敗')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [eventId])
  
  // ----------------------------------------
  // 建立單一參加者
  // ----------------------------------------
  const handleCreateParticipant = async (e) => {
    e.preventDefault()
    
    if (!participantName.trim()) {
      setError('請輸入姓名')
      return
    }
    
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      const newParticipant = await createParticipant(eventId, {
        name: participantName,
        email: participantEmail || null,
        phone: participantPhone || null
      })
      
      setParticipants([...participants, newParticipant])
      setParticipantName('')
      setParticipantEmail('')
      setParticipantPhone('')
      setShowForm(false)
      setSuccess(`已為 ${participantName} 建立 QR Code`)
    } catch (err) {
      setError(err.response?.data?.detail || '建立失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }
  
  // ----------------------------------------
  // 批量建立參加者
  // ----------------------------------------
  const handleBulkCreate = async (e) => {
    e.preventDefault()
    
    if (!bulkInput.trim()) {
      setError('請輸入參加者名單')
      return
    }
    
    // 解析輸入 (每行一個名字，或用逗號分隔)
    const lines = bulkInput.split(/[\n,]/)
    const names = lines
      .map(line => line.trim())
      .filter(line => line.length > 0)
    
    if (names.length === 0) {
      setError('請輸入有效的姓名')
      return
    }
    
    if (names.length > 100) {
      setError('每次最多建立 100 位參加者')
      return
    }
    
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      const participantsData = names.map(name => ({ name }))
      const result = await createParticipantsBulk(eventId, participantsData)
      
      setParticipants([...participants, ...result.participants])
      setBulkInput('')
      setShowBulkForm(false)
      setSuccess(`已成功建立 ${result.total} 位參加者的 QR Code`)
    } catch (err) {
      setError(err.response?.data?.detail || '批量建立失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }
  
  // ----------------------------------------
  // 下載 QR Code 圖片
  // ----------------------------------------
  const downloadQRCode = (participant) => {
    const svg = document.getElementById(`qr-${participant.id}`)
    if (!svg) return
    
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      canvas.width = 300
      canvas.height = 300
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, 300, 300)
      
      const link = document.createElement('a')
      link.download = `${participant.name}_QRCode.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }
  
  // ----------------------------------------
  // 複製 QR Code Token
  // ----------------------------------------
  const copyQRToken = (token) => {
    navigator.clipboard.writeText(token)
    setSuccess('QR Code Token 已複製到剪貼簿')
  }
  
  // ----------------------------------------
  // 複製分享連結
  // ----------------------------------------
  const copyShareLink = (token) => {
    const baseUrl = window.location.origin
    const link = `${baseUrl}/participants/${token}`
    navigator.clipboard.writeText(link)
    setSuccess('分享連結已複製到剪貼簿')
  }
  
  // ----------------------------------------
  // 開啟分享連結
  // ----------------------------------------
  const openShareLink = (token) => {
    const baseUrl = window.location.origin
    const link = `${baseUrl}/participants/${token}`
    window.open(link, '_blank')
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
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          <p>{error}</p>
        </div>
        <Link to="/admin" className="text-primary-600 hover:underline">
          返回管理員儀表板
        </Link>
      </div>
    )
  }
  
  return (
    <div className="max-w-6xl mx-auto">
      {/* 返回連結 */}
      <Link 
        to="/admin" 
        className="inline-flex items-center text-primary-600 hover:underline mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回管理員儀表板
      </Link>
      
      {/* 活動標題 */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          參加者管理
        </h1>
        <p className="text-gray-600">
          活動：{event?.name}
        </p>
        <p className="text-sm text-gray-500">
          日期：{event?.event_date} {event?.start_time}
        </p>
      </div>
      
      {/* 成功/錯誤訊息 */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {/* 操作按鈕 */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          新增參加者
        </button>
        
        <button
          onClick={() => setShowBulkForm(!showBulkForm)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Users className="h-4 w-4 mr-2" />
          批量新增
        </button>
        
        {participants.length > 0 && (
          <button
            onClick={() => {
              // 下載所有參加者的 QR Code
              participants.forEach(p => downloadQRCode(p))
            }}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            下載全部 QR Code
          </button>
        )}
      </div>
      
      {/* 單一新增表單 */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">新增參加者</h3>
          <form onSubmit={handleCreateParticipant}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="請輸入姓名"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電郵
                </label>
                <input
                  type="email"
                  value={participantEmail}
                  onChange={(e) => setParticipantEmail(e.target.value)}
                  placeholder="請輸入電郵 (選填)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  電話
                </label>
                <input
                  type="tel"
                  value={participantPhone}
                  onChange={(e) => setParticipantPhone(e.target.value)}
                  placeholder="請輸入電話 (選填)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-300"
              >
                {saving ? '建立中...' : '建立'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* 批量新增表單 */}
      {showBulkForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">批量新增參加者</h3>
          <p className="text-sm text-gray-600 mb-4">
            每行輸入一個姓名，或用逗號分隔多個姓名
          </p>
          <form onSubmit={handleBulkCreate}>
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="王小明&#10;李大明&#10;陳小華"
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 mb-4"
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
              >
                {saving ? '建立中...' : '批量建立'}
              </button>
              <button
                type="button"
                onClick={() => setShowBulkForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* 參加者列表 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">
            參加者列表 ({participants.length} 人)
          </h3>
        </div>
        
        {participants.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>尚無參加者資料</p>
            <p className="text-sm">請點擊上方按鈕新增參加者</p>
          </div>
        ) : (
          <div className="divide-y">
            {participants.map((participant) => (
              <div key={participant.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{participant.name}</h4>
                  {participant.email && (
                    <p className="text-sm text-gray-500">{participant.email}</p>
                  )}
                  {participant.phone && (
                    <p className="text-sm text-gray-500">{participant.phone}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  {/* 分享連結按鈕 */}
                  <button
                    onClick={() => openShareLink(participant.qr_code)}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                    title="開啟參加者頁面"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </button>
                  
                  {/* 複製連結按鈕 */}
                  <button
                    onClick={() => copyShareLink(participant.qr_code)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                    title="複製分享連結"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={() => setSelectedQR(selectedQR === participant.id ? null : participant.id)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                    title="顯示 QR Code"
                  >
                    <QrCode className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={() => copyQRToken(participant.qr_code)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="複製 Token"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                  
                  <button
                    onClick={() => downloadQRCode(participant)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                    title="下載 QR Code"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                </div>
                
                {/* QR Code 顯示 */}
                {selectedQR === participant.id && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex flex-col items-center">
                      <QRCodeSVG
                        id={`qr-${participant.id}`}
                        value={participant.qr_code}
                        size={150}
                        level={"H"}
                        includeMargin={true}
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        掃描此 QR Code 進行報到
                      </p>
                      <p className="text-xs text-gray-400 mt-1 break-all">
                        Token: {participant.qr_code.substring(0, 30)}...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ParticipantManagement
