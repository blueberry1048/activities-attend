// ============================================================
// 活動表單頁面 (建立/編輯)
// ============================================================
import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Save, ArrowLeft } from 'lucide-react'
import { getEvent, createEvent, updateEvent } from '../../api/axios'

export const EventForm = () => {
  const { id: eventId } = useParams()
  const navigate = useNavigate()
  const isEditing = !!eventId
  
  // 表單狀態
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    event_date: '',
    start_time: '',
    end_time: '',
    is_active: true
  })
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEditing)
  const [error, setError] = useState(null)
  
  // ----------------------------------------
  // 如果是編輯模式，載入活動資料
  // ----------------------------------------
  useEffect(() => {
    if (isEditing) {
      const fetchEvent = async () => {
        try {
          const data = await getEvent(eventId)
          // 格式化日期和時間
          const formattedData = {
            ...data,
            event_date: data.event_date, // ISO date string
            start_time: data.start_time ? data.start_time.substring(0, 5) : '',
            end_time: data.end_time ? data.end_time.substring(0, 5) : ''
          }
          setFormData(formattedData)
        } catch (err) {
          setError(err.response?.data?.detail || '載入活動失敗')
        } finally {
          setFetching(false)
        }
      }
      fetchEvent()
    }
  }, [eventId, isEditing])
  
  // ----------------------------------------
  // 處理表單變更
  // ----------------------------------------
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }
  
  // ----------------------------------------
  // 提交表單
  // ----------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    
    try {
      // 格式化時間 (HH:mm:ss)
      const submitData = {
        ...formData,
        start_time: formData.start_time ? formData.start_time + ':00' : null,
        end_time: formData.end_time ? formData.end_time + ':00' : null
      }
      
      if (isEditing) {
        await updateEvent(eventId, submitData)
      } else {
        await createEvent(submitData)
      }
      
      // 成功後返回儀表板
      navigate('/admin')
    } catch (err) {
      setError(err.response?.data?.detail || '儲存失敗')
    } finally {
      setLoading(false)
    }
  }
  
  // ----------------------------------------
  // 渲染載入中
  // ----------------------------------------
  if (fetching) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="spinner"></div>
      </div>
    )
  }
  
  return (
    <div className="max-w-2xl mx-auto">
      {/* 返回連結 */}
      <Link to="/admin" className="inline-flex items-center text-primary-600 hover:underline mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" />
        返回活動管理
      </Link>
      
      {/* 頁面標題 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? '編輯活動' : '建立新活動'}
        </h1>
      </div>
      
      {/* 錯誤訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {/* 表單 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 活動名稱 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              活動名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="請輸入活動名稱"
              required
            />
          </div>
          
          {/* 活動日期 */}
          <div>
            <label htmlFor="event_date" className="block text-sm font-medium text-gray-700 mb-2">
              活動日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="event_date"
              name="event_date"
              value={formData.event_date}
              onChange={handleChange}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          {/* 活動時間 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                開始時間
              </label>
              <input
                type="time"
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                結束時間
              </label>
              <input
                type="time"
                id="end_time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          {/* 活動地點 */}
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
              活動地點
            </label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="請輸入活動地點"
            />
          </div>
          
          {/* 活動詳情 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              活動詳情
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="block w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
              placeholder="請輸入活動詳情"
            />
          </div>
          
          {/* 是否啟用 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
              啟用此活動
            </label>
          </div>
          
          {/* 提交按鈕 */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Link
              to="/admin"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="spinner mr-2" style={{ width: '16px', height: '16px' }}></div>
                  儲存中...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  儲存
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EventForm
