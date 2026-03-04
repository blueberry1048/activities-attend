// ============================================================
// Supabase API 層
// ============================================================
// 處理與 Supabase 資料庫的所有互動
import { supabase } from '../lib/supabase'

// ============================================================
// 認證 API (使用 Supabase Auth)
// ============================================================

/**
 * 使用者登入
 * @param {string} email - 電子郵件
 * @param {string} password - 密碼
 * @returns {Promise} - 使用者 session
 */
export const login = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) throw error
  return data
}

/**
 * 使用者登出
 * @returns {Promise}
 */
export const logout = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * 取得目前使用者資訊
 * @returns {Promise} - 使用者資料
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) throw error
  
  // 從 users table 取得額外資料 (如 is_admin)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()
    
  // 如果使用者不存在於 users 表中，仍然允許登入
  if (userError && userError.code === 'PGRST116') {
    console.log('使用者尚未建立資料，嘗試建立...')
    
    try {
      // 自動建立使用者資料
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          id: user.id,
          email: user.email,
          full_name: user.email.split('@')[0], // 預設名稱
          username: user.email.split('@')[0], // 使用者名稱 (必填)
          is_admin: false
        }])
        .select()
        .single()
        
      if (insertError) {
        console.error('建立使用者失敗:', insertError)
        
        // 如果建立失敗，嘗試再次讀取（可能是 trigger 已經建立了）
        const { data: retryUser, error: retryError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
          
        if (retryError) throw retryError
        return {
          id: user.id,
          email: user.email,
          ...retryUser
        }
      }
      
      return {
        id: user.id,
        email: user.email,
        ...newUser
      }
    } catch (err) {
      console.error('處理使用者資料時發生錯誤:', err)
      throw err
    }
  }
  
  if (userError) throw userError
  
  return {
    id: user.id,
    email: user.email,
    ...userData
  }
}

/**
 * 取得目前的 session
 * @returns {Promise} - Session 資料
 */
export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

/**
 * 訂閱認證狀態變化
 * @param {Function} callback - 回調函式
 * @returns {Function} - 取消訂閱函式
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback)
}

// ============================================================
// 活動 API (Event)
// ============================================================

/**
 * 取得所有活動列表
 * @returns {Promise} - 活動列表
 */
export const getEvents = async () => {
  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('event_date', { ascending: false })
    
  if (error) throw error
  
  // 取得每個活動的參加人數和報到人數
  const eventsWithCounts = await Promise.all(events.map(async (event) => {
    // 取得總參加人數
    const { count: attendeeCount } = await supabase
      .from('event_attendances')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
    
    // 取得已報到人數
    const { count: checkedInCount } = await supabase
      .from('event_attendances')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id)
      .eq('is_checked_in', true)
    
    return {
      ...event,
      attendee_count: attendeeCount || 0,
      checked_in_count: checkedInCount || 0
    }
  }))
  
  return eventsWithCounts
}

/**
 * 取得單一活動
 * @param {string} eventId - 活動 ID
 * @returns {Promise} - 活動資料
 */
export const getEvent = async (eventId) => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()
    
  if (error) throw error
  return data
}

/**
 * 建立新活動
 * @param {Object} eventData - 活動資料
 * @returns {Promise} - 新建立的活動
 */
export const createEvent = async (eventData) => {
  const { data, error } = await supabase
    .from('events')
    .insert([eventData])
    .select()
    .single()
    
  if (error) throw error
  return data
}

/**
 * 更新活動
 * @param {string} eventId - 活動 ID
 * @param {Object} eventData - 更新的資料
 * @returns {Promise} - 更新後的活動
 */
export const updateEvent = async (eventId, eventData) => {
  const { data, error } = await supabase
    .from('events')
    .update(eventData)
    .eq('id', eventId)
    .select()
    .single()
    
  if (error) throw error
  return data
}

/**
 * 刪除活動
 * @param {string} eventId - 活動 ID
 * @returns {Promise}
 */
export const deleteEvent = async (eventId) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    
  if (error) throw error
}

// ============================================================
// 參加者管理 API (Participant)
// ============================================================

/**
 * 取得活動的參加者列表
 * @param {string} eventId - 活動 ID
 * @returns {Promise} - 參加者列表
 */
export const getParticipants = async (eventId) => {
  const { data, error } = await supabase
    .from('event_attendances')
    .select(`
      *,
      user:users(*)
    `)
    .eq('event_id', eventId)
    
  if (error) throw error
  return data
}

/**
 * 建立參加者並產生 QR Code
 * @param {string} eventId - 活動 ID
 * @param {Object} participantData - 參加者資料 {email, full_name}
 * @returns {Promise} - 參加者資料與 QR Code
 */
export const createParticipant = async (eventId, participantData) => {
  // 1. 先建立使用者
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert([{
      email: participantData.email,
      full_name: participantData.full_name,
      is_admin: false
    }])
    .select()
    .single()
    
  if (userError) throw userError
  
  // 2. 產生 QR Token (使用 UUID)
  const qrToken = `${eventId}-${user.id}-${Date.now()}`
  
  // 3. 建立報到記錄
  const { data: attendance, error: attendanceError } = await supabase
    .from('event_attendances')
    .insert([{
      event_id: eventId,
      user_id: user.id,
      qr_token: qrToken
    }])
    .select()
    .single()
    
  if (attendanceError) throw attendanceError
  
  return {
    user,
    attendance,
    qr_token: qrToken
  }
}

/**
 * 批量建立參加者
 * @param {string} eventId - 活動 ID
 * @param {Array} participants - 參加者資料陣列
 * @returns {Promise} - 所有參加者資料與 QR Code
 */
export const createParticipantsBulk = async (eventId, participants) => {
  const results = []
  
  for (const participant of participants) {
    try {
      const result = await createParticipant(eventId, participant)
      results.push(result)
    } catch (error) {
      console.error(`建立參加者失敗: ${participant.email}`, error)
    }
  }
  
  return results
}

/**
 * 刪除參加者
 * @param {string} attendanceId - 報到記錄 ID
 * @returns {Promise}
 */
export const deleteParticipant = async (attendanceId) => {
  const { error } = await supabase
    .from('event_attendances')
    .delete()
    .eq('id', attendanceId)
    
  if (error) throw error
}

/**
 * 驗證參加者 Token 並取得活動資訊
 * @param {string} token - QR Code Token
 * @returns {Promise} - 活動資訊
 */
export const verifyParticipantToken = async (token) => {
  // Token 格式: eventId-userId-timestamp
  const [eventId] = token.split('-')
  
  // 1. 查詢報到記錄 - 使用 maybeSingle 避免 PGRST116 錯誤
  const { data: attendance, error } = await supabase
    .from('event_attendances')
    .select(`
      *,
      event:events(*),
      user:users(*)
    `)
    .eq('qr_token', token)
    .maybeSingle()
    
  if (error) throw new Error('無效的 QR Code')
  if (!attendance) throw new Error('找不到此 QR Code 的報到記錄')
  
  return attendance
}

/**
 * 重新產生 QR Token (動態 QR Code)
 * @param {string} token - 舊的 QR Code Token
 * @returns {Promise} - 新的參加者與活動資訊
 */
export const regenerateQRToken = async (token) => {
  // 1. 找出現有的 attendance 記錄
  const { data: oldAttendance, error: findError } = await supabase
    .from('event_attendances')
    .select('*')
    .eq('qr_token', token)
    .maybeSingle()
    
  if (findError || !oldAttendance) throw new Error('找不到報到記錄')
  
  // 2. 產生新的 QR Token
  const newQrToken = `${oldAttendance.event_id}-${oldAttendance.user_id}-${Date.now()}`
  
  // 3. 更新 attendance 記錄
  const { data: attendance, error: updateError } = await supabase
    .from('event_attendances')
    .update({ qr_token: newQrToken })
    .eq('id', oldAttendance.id)
    .select(`
      *,
      event:events(*),
      user:users(*)
    `)
    .maybeSingle()
    
  if (updateError) throw updateError
  
  return {
    ...attendance,
    qr_token: newQrToken
  }
}

/**
 * 執行報到
 * @param {string} qrCode - QR Code Token
 * @param {string} eventId - 活動 ID
 * @returns {Promise} - 報到結果
 */
export const checkIn = async (qrCode, eventId) => {
  // 1. 驗證 QR Code
  const attendance = await verifyParticipantToken(qrCode)

  if (attendance.event_id !== eventId) {
    throw new Error('此 QR Code 不屬於這個活動')
  }
  
  if (attendance.is_checked_in) {
    throw new Error('此參加者已經報到了')
  }
  
  // 2. 更新報到狀態 - 先更新不回傳，然後再查詢結果
  const { error: updateError } = await supabase
    .from('event_attendances')
    .update({
      is_checked_in: true,
      checked_in_at: new Date().toISOString()
    })
    .eq('qr_token', qrCode)
    
  if (updateError) throw updateError
  
  // 然後查詢更新後的記錄
  const { data, error } = await supabase
    .from('event_attendances')
    .select(`
      *,
      user:users(*),
      event:events(*)
    `)
    .eq('qr_token', qrCode)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error('更新失敗，請重試')
  
  return data
}

// ============================================================
// 個人相關 API
// ============================================================

/**
 * 取得個人 QR Code
 * @param {string} eventId - 活動 ID
 * @returns {Promise} - QR Code Token
 */
export const getEventQRCode = async (eventId) => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('請先登入')
  
  const { data, error } = await supabase
    .from('event_attendances')
    .select('qr_token')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .single()
    
  if (error) throw error
  
  return { qr_token: data.qr_token }
}

/**
 * 取得個人報到狀態
 * @param {string} eventId - 活動 ID
 * @returns {Promise} - 報到狀態
 */
export const getAttendanceStatus = async (eventId) => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('請先登入')
  
  const { data, error } = await supabase
    .from('event_attendances')
    .select(`
      *,
      event:events(name, event_date)
    `)
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle()
    
  if (error) {
    // 如果是找不到資料，回傳 null 而不是拋出錯誤
    if (error.code === 'PGRST116') {
      return null
    }
    throw error
  }
  
  return data
}
