// ============================================================
// 參加者管理頁面 (管理員)
// ============================================================
// 管理活動的參加者名單與 QR Code
import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Users, Download, Mail, Trash2, Copy, QrCode, RefreshCw, ExternalLink, Upload, Globe, Trash, CheckCircle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { getEvent, createParticipant, createParticipantsBulk, getParticipants, deleteParticipant } from '../../api/supabase'

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
  const [showCsvForm, setShowCsvForm] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [participantName, setParticipantName] = useState('')
  const [participantEmail, setParticipantEmail] = useState('')
  const [participantPhone, setParticipantPhone] = useState('')
  const [bulkInput, setBulkInput] = useState('')
  const fileInputRef = useRef(null)
  
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
          // 轉換 Supabase 回傳的資料結構
          const formattedParticipants = (participantsData || []).map(p => ({
            id: p.id,
            user_id: p.user_id,
            name: p.user?.full_name || '未知',
            email: p.user?.email || '',
            phone: p.user?.phone || '',
            qr_code: p.qr_token,
            is_checked_in: p.is_checked_in,
            checked_in_at: p.checked_in_at
          }))
          setParticipants(formattedParticipants)
        } catch (pErr) {
          setParticipants([])
        }
      } catch (err) {
        console.error('載入活動失敗:', err)
        setError(err.message || '載入活動失敗')
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
        full_name: participantName,
        email: participantEmail || `${Date.now()}@placeholder.com` // 使用假的 email 避免 unique 錯誤
      })
      
      // newParticipant 回傳 { user, attendance, qr_token }
      // 需要組合成頁面需要的格式
      const participantWithQR = {
        id: newParticipant.attendance.id, // 使用 attendance ID
        user_id: newParticipant.user.id,
        name: newParticipant.user.full_name,
        email: newParticipant.user.email,
        qr_code: newParticipant.qr_token,
        is_checked_in: false
      }
      
      setParticipants([...participants, participantWithQR])
      setParticipantName('')
      setParticipantEmail('')
      setParticipantPhone('')
      setShowForm(false)
      setSuccess(`已為 ${participantName} 建立 QR Code`)
    } catch (err) {
      console.error('建立參加者失敗:', err)
      setError(err.message || '建立失敗，請稍後再試')
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
      const participantsData = names.map((name, index) => ({ 
        full_name: name, 
        email: `${Date.now()}-${index}@placeholder.com` // 使用假的 email
      }))
      const results = await createParticipantsBulk(eventId, participantsData)
      
      // 轉換結果格式
      const formattedResults = results.map(r => ({
        id: r.attendance.id,
        user_id: r.user.id,
        name: r.user.full_name,
        email: r.user.email,
        qr_code: r.qr_token,
        is_checked_in: false
      }))
      
      setParticipants([...participants, ...formattedResults])
      setBulkInput('')
      setShowBulkForm(false)
      setSuccess(`已成功建立 ${results.length} 位參加者的 QR Code`)
    } catch (err) {
      console.error('批量建立失敗:', err)
      setError(err.message || '批量建立失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
  }
  
  // ----------------------------------------
  // 解析 CSV 檔案
  // ----------------------------------------
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    const participants = []
    
    // 跳過標題行
    for (let i = 1; i < lines.length; i++) {
      // 處理 CSV（支援逗號或分號分隔）
      const line = lines[i].trim()
      if (!line) continue
      
      // 簡單的 CSV 解析（處理引號內的逗號）
      const parts = []
      let current = ''
      let inQuotes = false
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes
        } else if ((char === ',' || char === ';') && !inQuotes) {
          parts.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      parts.push(current.trim())
      
      // name 是第一欄（必填），email 是第二欄（選填）
      const name = parts[0]?.replace(/^"|"$/g, '')
      const email = parts[1]?.replace(/^"|"$/g, '').replace(/^'|'$/g, '')
      
      if (name && name.trim()) {
        participants.push({
          full_name: name.trim(),
          email: email && email.trim() ? email.trim() : `${Date.now()}-${i}@placeholder.com`
        })
      }
    }
    
    return participants
  }
  
  // ----------------------------------------
  // 匯入 CSV
  // ----------------------------------------
  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // 驗證檔案類型
    if (!file.name.endsWith('.csv')) {
      setError('請上傳 CSV 檔案')
      return
    }
    
    try {
      const text = await file.text()
      const participantsData = parseCSV(text)
      
      if (participantsData.length === 0) {
        setError('CSV 檔案中沒有有效的參加者資料')
        return
      }
      
      if (participantsData.length > 100) {
        setError('每次最多匯入 100 位參加者')
        return
      }
      
      setSaving(true)
      setError(null)
      setSuccess(null)
      
      const results = await createParticipantsBulk(eventId, participantsData)
      
      // 轉換結果格式
      const formattedResults = results.map(r => ({
        id: r.attendance.id,
        user_id: r.user.id,
        name: r.user.full_name,
        email: r.user.email,
        qr_code: r.qr_token,
        is_checked_in: false
      }))
      
      setParticipants([...participants, ...formattedResults])
      setShowCsvForm(false)
      setSuccess(`已成功匯入 ${results.length} 位參加者`)
    } catch (err) {
      console.error('CSV 匯入失敗:', err)
      setError(err.message || '匯入失敗，請檢查 CSV 格式')
    } finally {
      setSaving(false)
      // 清空檔案輸入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  
  // ----------------------------------------
  // 下載 CSV 範本
  // ----------------------------------------
  const downloadCsvTemplate = () => {
    const link = document.createElement('a')
    link.href = '/participants_template.csv'
    link.download = 'participants_template.csv'
    link.click()
  }
  
  // ----------------------------------------
  // 刪除參加者
  // ----------------------------------------
  const handleDeleteParticipant = async (attendanceId, participantName) => {
    if (!window.confirm(`確定要刪除 ${participantName} 嗎？此操作無法復原。`)) {
      return
    }
    
    try {
      setSaving(true)
      await deleteParticipant(attendanceId)
      setParticipants(participants.filter(p => p.id !== attendanceId))
      setSuccess('已刪除參加者')
    } catch (err) {
      console.error('刪除失敗:', err)
      setError(err.message || '刪除失敗')
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
  // 下載全部連結
  // ----------------------------------------
  const downloadAllLinks = (format = 'txt') => {
    const baseUrl = window.location.origin
    const links = participants.map(p => ({
      name: p.name,
      email: p.email,
      link: `${baseUrl}/participants/${p.qr_code}`
    }))
    
    let content, mimeType, extension
    
    // UTF-8 BOM for proper Chinese character encoding
    const BOM = '\uFEFF'
    
    if (format === 'csv') {
      // CSV 格式
      const header = '姓名,電郵,連結\n'
      const rows = links.map(l => `${l.name},${l.email || ''},${l.link}`).join('\n')
      content = BOM + header + rows
      mimeType = 'text/csv;charset=utf-8;'
      extension = 'csv'
    } else {
      // TXT 格式 (Tab 分隔)
      const header = '姓名\t電郵\t連結\n'
      const rows = links.map(l => `${l.name}\t${l.email || ''}\t${l.link}`).join('\n')
      content = BOM + header + rows
      mimeType = 'text/plain;charset=utf-8;'
      extension = 'txt'
    }
    
    const blob = new Blob([content], { type: mimeType })
    
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${event?.name || '活動'}_參加者連結.${extension}`
    link.click()
    setShowDownloadMenu(false)
  }
  
  // ----------------------------------------
  // 刪除全部參加者
  // ----------------------------------------
  const handleDeleteAllParticipants = async () => {
    if (!window.confirm(`確定要刪除全部 ${participants.length} 位參加者嗎？此操作無法復原。`)) {
      return
    }
    
    if (!window.confirm('這將會刪除所有參加者及其 QR Code，確定要繼續嗎？')) {
      return
    }
    
    setSaving(true)
    setError(null)
    setSuccess(null)
    
    try {
      // 逐一刪除
      for (const p of participants) {
        await deleteParticipant(p.id)
      }
      setParticipants([])
      setSuccess('已刪除全部參加者')
    } catch (err) {
      console.error('刪除失敗:', err)
      setError(err.message || '刪除失敗，請稍後再試')
    } finally {
      setSaving(false)
    }
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
    <div className="max-w-7xl mx-auto">
      {/* 返回連結 */}
      <Link 
        to="/admin" 
        className="inline-flex items-center text-primary-600 hover:underline mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        返回管理員儀表板
      </Link>
      
      {/* 活動標題和統計 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              參加者管理
            </h1>
            <p className="text-gray-600">
              活動：{event?.name}
            </p>
            <p className="text-sm text-gray-500">
              日期：{event?.event_date} {event?.start_time}
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">{participants.length}</div>
              <div className="text-sm text-gray-500">總人數</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{participants.filter(p => p.is_checked_in).length}</div>
              <div className="text-sm text-gray-500">已報到</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600">
                {participants.length > 0 ? Math.round((participants.filter(p => p.is_checked_in).length / participants.length) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-500">出席率</div>
            </div>
          </div>
        </div>
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
        
        <button
          onClick={() => setShowCsvForm(!showCsvForm)}
          className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <Upload className="h-4 w-4 mr-2" />
          匯入 CSV
        </button>
        
        {participants.length > 0 && (
          <>
            <div className="relative">
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <Globe className="h-4 w-4 mr-2" />
                下載全部連結
              </button>
              {showDownloadMenu && (
                <div className="absolute left-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={() => { downloadAllLinks('txt'); setShowDownloadMenu(false) }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                  >
                    TXT 格式
                  </button>
                  <button
                    onClick={() => { downloadAllLinks('csv'); setShowDownloadMenu(false) }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-b-lg"
                  >
                    CSV 格式
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={() => {
                participants.forEach(p => downloadQRCode(p))
              }}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Download className="h-4 w-4 mr-2" />
              下載全部 QR Code
            </button>
            
            <button
              onClick={handleDeleteAllParticipants}
              disabled={saving}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300"
            >
              <Trash className="h-4 w-4 mr-2" />
              刪除全部
            </button>
          </>
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
      
      {/* CSV 匯入表單 */}
      {showCsvForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">匯入 CSV 檔案</h3>
          <p className="text-sm text-gray-600 mb-4">
            CSV 檔案需包含 name（姓名，必填）和 email（電郵，選填）兩欄
          </p>
          
          <div className="mb-4">
            <button
              onClick={downloadCsvTemplate}
              className="text-primary-600 hover:underline text-sm"
            >
              下載 CSV 範本
            </button>
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleCsvImport}
              className="hidden"
              id="csv-upload"
            />
            <label
              htmlFor="csv-upload"
              className="cursor-pointer"
            >
              <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 mb-2">點擊選擇 CSV 檔案或拖放到此處</p>
              <p className="text-sm text-gray-400">支援 .csv 格式</p>
            </label>
          </div>
          
          {saving && (
            <div className="mt-4 text-center text-gray-600">
              匯入中...
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowCsvForm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              關閉
            </button>
          </div>
        </div>
      )}
      
      {/* 參加者列表 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 lg:p-6 border-b flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h3 className="text-lg lg:text-xl font-bold">
            參加者列表 ({participants.length} 人)
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-green-600 font-medium">
              {participants.filter(p => p.is_checked_in).length} 人已報到
            </span>
            <button
              onClick={async () => {
                try {
                  const participantsData = await getParticipants(eventId)
                  const formatted = (participantsData || []).map(p => ({
                    id: p.id,
                    user_id: p.user_id,
                    name: p.user?.full_name || '未知',
                    email: p.user?.email || '',
                    phone: p.user?.phone || '',
                    qr_code: p.qr_token,
                    is_checked_in: p.is_checked_in,
                    checked_in_at: p.checked_in_at
                  }))
                  setParticipants(formatted)
                } catch (err) {
                  console.error('刷新失敗:', err)
                }
              }}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
              title="刷新"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {participants.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">尚無參加者資料</p>
            <p className="text-sm mt-1">請點擊上方按鈕新增參加者</p>
          </div>
        ) : (
          <>
            {/* 桌面版表格 */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">姓名</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">電郵</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">電話</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">狀態</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">報到時間</th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {participants.map((participant) => (
                    <tr key={participant.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="bg-primary-100 rounded-full p-2 mr-3">
                            <Users className="h-4 w-4 text-primary-600" />
                          </div>
                          <span className="font-medium text-gray-900">{participant.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{participant.email || '-'}</td>
                      <td className="px-6 py-4 text-gray-600">{participant.phone || '-'}</td>
                      <td className="px-6 py-4">
                        {participant.is_checked_in ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            已報到
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                            未報到
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {participant.checked_in_at ? new Date(participant.checked_in_at).toLocaleString('zh-TW') : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => openShareLink(participant.qr_code)}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                            title="開啟參加者頁面"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => copyShareLink(participant.qr_code)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            title="複製分享連結"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setSelectedQR(selectedQR === participant.id ? null : participant.id)}
                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                            title="顯示 QR Code"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => copyQRToken(participant.qr_code)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="複製 Token"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => downloadQRCode(participant)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="下載 QR Code"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteParticipant(participant.id, participant.name)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="刪除參加者"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* 手機版卡片 */}
            <div className="lg:hidden divide-y divide-gray-100">
              {participants.map((participant) => (
                <div key={participant.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{participant.name}</h4>
                      {participant.email && (
                        <p className="text-sm text-gray-500">{participant.email}</p>
                      )}
                      {participant.phone && (
                        <p className="text-sm text-gray-500">{participant.phone}</p>
                      )}
                      <div className="mt-2">
                        {participant.is_checked_in ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            已報到
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            未報到
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-wrap justify-end max-w-[180px]">
                      <button
                        onClick={() => openShareLink(participant.qr_code)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg"
                        title="開啟"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => copyShareLink(participant.qr_code)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                        title="複製"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelectedQR(selectedQR === participant.id ? null : participant.id)}
                        className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                        title="QR"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => copyQRToken(participant.qr_code)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="Token"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => downloadQRCode(participant)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="下載"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteParticipant(participant.id, participant.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="刪除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* QR Code 顯示 */}
                  {selectedQR === participant.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex flex-col items-center">
                        <QRCodeSVG
                          id={`qr-${participant.id}`}
                          value={`${window.location.origin}/participants/${participant.qr_code}`}
                          size={150}
                          level={"H"}
                          includeMargin={true}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          掃描此 QR Code 進行報到
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ParticipantManagement
