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

/**
 * 获取N天前/后的日期
 * @param days 天数，正数表示未来，负数表示过去
 * @param fromDate 基准日期，默认为今天
 */
export function addDays(days: number, fromDate?: Date | string): string {
  const date = fromDate ? new Date(fromDate) : new Date()
  date.setDate(date.getDate() + days)
  return formatDate(date)
}

/**
 * 获取月份的第一天
 */
export function getMonthStart(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDate(new Date(d.getFullYear(), d.getMonth(), 1))
}

/**
 * 获取月份的最后一天
 */
export function getMonthEnd(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

/**
 * 获取周的第一天（周日）
 */
export function getWeekStart(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = d.getDay()
  const diff = d.getDate() - day
  return formatDate(new Date(d.getFullYear(), d.getMonth(), diff))
}

/**
 * 获取周的最后一天（周六）
 */
export function getWeekEnd(date: Date | string = new Date()): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = d.getDay()
  const diff = d.getDate() + (6 - day)
  return formatDate(new Date(d.getFullYear(), d.getMonth(), diff))
}

/**
 * 判断是否是周末
 */
export function isWeekend(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = d.getDay()
  return day === 0 || day === 6
}

/**
 * 判断是否是工作日
 */
export function isWeekday(date: Date | string): boolean {
  return !isWeekend(date)
}

/**
 * 判断日期是否在某个范围内（包含边界）
 */
export function isDateInRange(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  return date >= startDate && date <= endDate
}

/**
 * 获取两个日期之间的所有日期（增强版）
 * @param includeWeekends 是否包含周末，默认 true
 */
export function getDateRangeEnhanced(
  startDate: string,
  endDate: string,
  options?: { includeWeekends?: boolean }
): string[] {
  const dates: string[] = []
  const current = new Date(startDate)
  const end = new Date(endDate)
  const includeWeekends = options?.includeWeekends ?? true
  
  while (current <= end) {
    const dateStr = formatDate(current)
    if (includeWeekends || isWeekday(dateStr)) {
      dates.push(dateStr)
    }
    current.setDate(current.getDate() + 1)
  }
  
  return dates
}

/**
 * 生成日历数组（42天，6周）
 * 从月份的第一天所在周的周日开始
 */
export function generateCalendarDays(date: Date | string = new Date()): Date[] {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear()
  const month = d.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())
  
  const days: Date[] = []
  const current = new Date(startDate)
  
  while (days.length < 42) {
    days.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  
  return days
}

/**
 * 获取日期所属的月份名称
 */
export function getMonthName(date: Date | string, format: 'short' | 'long' = 'long'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const monthNames = {
    short: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    long: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  }
  return monthNames[format][d.getMonth()]
}

/**
 * 获取星期几的名称
 */
export function getDayName(date: Date | string, format: 'short' | 'long' = 'long'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dayNames = {
    short: ['日', '一', '二', '三', '四', '五', '六'],
    long: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  }
  return dayNames[format][d.getDay()]
}

