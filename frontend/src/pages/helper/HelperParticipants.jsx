// ============================================================
// Helper 專用參加者名單頁面
// ============================================================
// 顯示活動參加者名單與簽到狀態
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Users, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react'
import { getEvent, getParticipants } from '../../api/supabase'
import HelperNavBar from '../../components/HelperNavBar'

export const HelperParticipants = () => {
  const { eventId } = useParams()
  const navigate = useNavigate()
  
  const [event, setEvent] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCheckedIn, setFilterCheckedIn] = useState('all') // all, checked, unchecked
  
  // 取得活動詳情
  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) {
        navigate('/helper/events')
        return
      }
      
      try {
        setLoading(true)
        
        // 取得活動資料
        const eventData = await getEvent(eventId)
        setEvent(eventData)
        
        // 取得參加者名單
        const participantsData = await getParticipants(eventId)
        
        // 轉換格式
        const formattedParticipants = (participantsData || []).map(p => ({
          id: p.id,
          user_id: p.user_id,
          name: p.user?.full_name || '未知',
          email: p.user?.email || '',
          is_checked_in: p.is_checked_in,
          checked_in_at: p.checked_in_at
        }))
        
        setParticipants(formattedParticipants)
      } catch (err) {
        console.error('載入失敗:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [eventId, navigate])
  
  // 篩選參加者
  const filteredParticipants = participants.filter(p => {
    // 搜尋篩選
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 簽到狀態篩選
    if (filterCheckedIn === 'checked') {
      return matchesSearch && p.is_checked_in
    } else if (filterCheckedIn === 'unchecked') {
      return matchesSearch && !p.is_checked_in
    }
    
    return matchesSearch
  })
  
  // 統計
  const totalCount = participants.length
  const checkedInCount = participants.filter(p => p.is_checked_in).length
  const uncheckedCount = totalCount - checkedInCount
  
  // 格式化時間
  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 返回活動列表
  const handleBack = () => {
    navigate('/helper/events')
  }
  
  // 重新整理
  const handleRefresh = async () => {
    setLoading(true)
    try {
      const participantsData = await getParticipants(eventId)
      const formattedParticipants = (participantsData || []).map(p => ({
        id: p.id,
        user_id: p.user_id,
        name: p.user?.full_name || '未知',
        email: p.user?.email || '',
        is_checked_in: p.is_checked_in,
        checked_in_at: p.checked_in_at
      }))
      setParticipants(formattedParticipants)
    } catch (err) {
      console.error('重新整理失敗:', err)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading && participants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex justify-center items-center">
          <div className="spinner"></div>
        </div>
        <HelperNavBar />
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 頂部標題 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 hover:text-primary-600"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              <span className="text-sm">返回</span>
            </button>
            <h1 className="text-lg font-bold text-gray-900">參加者名單</h1>
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:text-primary-600"
              disabled={loading}
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          {/* 活動名稱 */}
          <p className="text-sm text-gray-500 mt-1">{event?.name}</p>
        </div>
        
        {/* 統計資訊 */}
        <div className="px-4 pb-3 flex gap-2 text-xs">
          <div className="flex-1 bg-gray-100 rounded-lg p-2 text-center">
            <div className="font-bold text-gray-900">{totalCount}</div>
            <div className="text-gray-500">總人數</div>
          </div>
          <div className="flex-1 bg-green-50 rounded-lg p-2 text-center">
            <div className="font-bold text-green-600">{checkedInCount}</div>
            <div className="text-green-600">已簽到</div>
          </div>
          <div className="flex-1 bg-red-50 rounded-lg p-2 text-center">
            <div className="font-bold text-red-600">{uncheckedCount}</div>
            <div className="text-red-600">未簽到</div>
          </div>
        </div>
        
        {/* 搜尋與篩選 */}
        <div className="px-4 pb-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋姓名或電郵..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          {/* 篩選按鈕 */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilterCheckedIn('all')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                filterCheckedIn === 'all' 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              全部
            </button>
            <button
              onClick={() => setFilterCheckedIn('checked')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                filterCheckedIn === 'checked' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              已簽到
            </button>
            <button
              onClick={() => setFilterCheckedIn('unchecked')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
                filterCheckedIn === 'unchecked' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              未簽到
            </button>
          </div>
        </div>
      </div>
      
      {/* 參加者列表 */}
      <div className="px-4 py-4">
        {filteredParticipants.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>沒有找到參加者</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredParticipants.map((participant) => (
              <div
                key={participant.id}
                className={`bg-white rounded-lg shadow-sm p-3 flex items-center justify-between ${
                  participant.is_checked_in ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {participant.name}
                  </div>
                  {participant.email && (
                    <div className="text-xs text-gray-500 truncate">
                      {participant.email}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-2">
                  {participant.is_checked_in ? (
                    <div className="flex flex-col items-center">
                      <CheckCircle className="h-6 w-6 text-green-500" />
                      <span className="text-xs text-green-600">
                        {formatTime(participant.checked_in_at)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <XCircle className="h-6 w-6 text-red-400" />
                      <span className="text-xs text-red-400">未簽到</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <HelperNavBar />
    </div>
  )
}

export default HelperParticipants
