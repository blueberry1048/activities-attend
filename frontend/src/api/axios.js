// ============================================================
// API 用戶端 (Axios)
// ============================================================
// 處理與後端 API 的所有 HTTP 請求
import axios from 'axios'

// 建立 Axios 實例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ----------------------------------------
// 請求攔截器
// ----------------------------------------
// 自動在每個請求中加入 JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// ----------------------------------------
// 回應攔截器
// ----------------------------------------
// 處理錯誤回應
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 如果收到 401 未授權錯誤，導向登入頁
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ============================================================
// 認證 API
// ============================================================

/**
 * 使用者登入
 * @param {string} username - 使用者名稱
 * @param {string} password - 密碼
 * @returns {Promise} - JWT Token
 */
export const login = async (username, password) => {
  const formData = new FormData()
  formData.append('username', username)
  formData.append('password', password)
  
  const response = await api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  return response.data
}

/**
 * 取得目前使用者資訊
 * @returns {Promise} - 使用者資料
 */
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me')
  return response.data
}

// ============================================================
// 活動 API (參加者)
// ============================================================

/**
 * 取得活動詳情
 * @param {string} eventId - 活動 ID
 * @returns {Promise} - 活動資料
 */
export const getEvent = async (eventId) => {
  const response = await api.get(`/events/${eventId}`)
  return response.data
}

/**
 * 取得個人 QR Code
 * @param {string} eventId - 活動 ID
 * @returns {Promise} - QR Code Token
 */
export const getEventQRCode = async (eventId) => {
  const response = await api.get(`/events/${eventId}/qr`)
  return response.data
}

/**
 * 取得個人報到狀態
 * @param {string} eventId - 活動 ID
 * @returns {Promise} - 報到狀態
 */
export const getAttendanceStatus = async (eventId) => {
  const response = await api.get(`/events/${eventId}/status`)
  return response.data
}

// ============================================================
// 活動 API (管理員)
// ============================================================

/**
 * 取得所有活動列表
 * @returns {Promise} - 活動列表
 */
export const getEvents = async () => {
  const response = await api.get('/events/')
  return response.data
}

/**
 * 建立新活動
 * @param {Object} eventData - 活動資料
 * @returns {Promise} - 新建立的活動
 */
export const createEvent = async (eventData) => {
  const response = await api.post('/events/', eventData)
  return response.data
}

/**
 * 更新活動
 * @param {string} eventId - 活動 ID
 * @param {Object} eventData - 更新的資料
 * @returns {Promise} - 更新後的活動
 */
export const updateEvent = async (eventId, eventData) => {
  const response = await api.put(`/events/${eventId}`, eventData)
  return response.data
}

/**
 * 刪除活動
 * @param {string} eventId - 活動 ID
 * @returns {Promise}
 */
export const deleteEvent = async (eventId) => {
  const response = await api.delete(`/events/${eventId}`)
  return response.data
}

/**
 * 執行報到
 * @param {string} qrCode - QR Code Token
 * @param {string} eventId - 活動 ID
 * @returns {Promise} - 報到結果
 */
export const checkIn = async (qrCode, eventId) => {
  const response = await api.post('/admin/checkin', {
    qr_code: qrCode,
    event_id: eventId
  })
  return response.data
}

// ============================================================
// 參加者管理 API
// ============================================================

/**
 * 建立參加者並產生 QR Code
 * @param {string} eventId - 活動 ID
 * @param {Object} participantData - 參加者資料 {name, email, phone}
 * @returns {Promise} - 參加者資料與 QR Code
 */
export const createParticipant = async (eventId, participantData) => {
  const response = await api.post(`/participants/events/${eventId}`, participantData)
  return response.data
}

/**
 * 批量建立參加者
 * @param {string} eventId - 活動 ID
 * @param {Array} participants - 參加者資料陣列
 * @returns {Promise} - 所有參加者資料與 QR Code
 */
export const createParticipantsBulk = async (eventId, participants) => {
  const response = await api.post(`/participants/events/${eventId}/bulk`, {
    participants: participants
  })
  return response.data
}

/**
 * 取得活動的參加者列表
 * @param {string} eventId - 活動 ID
 * @returns {Promise} - 參加者列表
 */
export const getParticipants = async (eventId) => {
  const response = await api.get(`/participants/events/${eventId}`)
  return response.data
}

/**
 * 驗證參加者 Token 並取得活動資訊
 * @param {string} token - QR Code Token
 * @returns {Promise} - 活動資訊
 */
export const verifyParticipantToken = async (token) => {
  const response = await api.get(`/participants/verify/${token}`)
  return response.data
}

export default api
