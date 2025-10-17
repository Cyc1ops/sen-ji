/**
 * 格式化小时数为 HH:MM 格式
 */
export function formatHours(hours: number): string {
  const h = Math.floor(Math.abs(hours))
  const m = Math.round((Math.abs(hours) - h) * 60)
  const sign = hours < 0 ? '-' : ''
  return `${sign}${h}:${m.toString().padStart(2, '0')}`
}

/**
 * 将 HH:MM 格式转换为小时数
 */
export function parseHours(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length !== 2) return 0
  
  const hours = parseInt(parts[0], 10)
  const minutes = parseInt(parts[1], 10)
  
  // 如果小时部分无效，返回0
  if (isNaN(hours)) return 0
  
  // 如果分钟部分为空或无效，默认为0
  const validMinutes = isNaN(minutes) ? 0 : minutes
  
  return hours + validMinutes / 60
}

/**
 * 获取今天的日期字符串 YYYY-MM-DD
 */
export function getTodayDate(): string {
  const now = new Date()
  return formatDate(now)
}

/**
 * 获取昨天的日期字符串
 */
export function getYesterdayDate(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return formatDate(yesterday)
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 解析日期字符串
 */
export function parseDate(dateStr: string): Date {
  return new Date(dateStr)
}

/**
 * 获取日期的显示名称
 */
export function getDateDisplayName(dateStr: string): string {
  const today = getTodayDate()
  const yesterday = getYesterdayDate()
  
  if (dateStr === today) return '今天'
  if (dateStr === yesterday) return '昨天'
  
  return dateStr
}

/**
 * 计算两个日期之间的天数
 */
export function getDaysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diffTime = Math.abs(d2.getTime() - d1.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * 生成日期范围数组
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  
  while (current <= end) {
    dates.push(formatDate(current))
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

