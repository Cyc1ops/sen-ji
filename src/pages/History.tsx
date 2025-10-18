import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plan, DailyRecord } from '../types'
import { formatHours, formatDate, parseHours, generateCalendarDays } from '../utils/helpers'
import TimeInput from '../components/TimeInput'

interface HistoryProps {
  activePlan: Plan | null
}

export default function History({ activePlan }: HistoryProps) {
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [selectedRecord, setSelectedRecord] = useState<DailyRecord | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(() => {
    // 从 localStorage 读取用户上次选择的视图，如果没有则使用默认设置
    const saved = localStorage.getItem('historyViewMode')
    if (saved) return saved as 'list' | 'calendar'
    const defaultView = localStorage.getItem('defaultHistoryView')
    return (defaultView as 'list' | 'calendar') || 'list'
  })
  const [searchParams, setSearchParams] = useSearchParams()
  const [highlightDate, setHighlightDate] = useState<string | null>(null)

  useEffect(() => {
    if (activePlan) {
      loadRecords()
    }
  }, [activePlan])

  // 保存视图模式到 localStorage
  useEffect(() => {
    localStorage.setItem('historyViewMode', viewMode)
  }, [viewMode])

  useEffect(() => {
    // 从URL读取date参数
    const dateParam = searchParams.get('date')
    const viewParam = searchParams.get('view')
    
    // 处理view参数（独立处理，不需要等待records）
    if (viewParam === 'calendar') {
      setViewMode('calendar')
    }
    
    // 处理date参数
    if (dateParam && records.length > 0) {
      // 切换到日历视图
      setViewMode('calendar')
      // 查找对应的记录
      const targetRecord = records.find(r => r.date === dateParam)
      if (targetRecord) {
        setSelectedRecord(targetRecord)
        setHighlightDate(dateParam)
        // 3秒后移除高亮
        setTimeout(() => setHighlightDate(null), 3000)
      }
    }
    
    // 清除URL参数
    if (dateParam || viewParam) {
      setSearchParams({})
    }
  }, [searchParams, records])

  const loadRecords = async () => {
    if (!activePlan) return
    const recordList = await window.electronAPI.getDailyRecords(activePlan.id, 100)
    setRecords(recordList)
  }

  if (!activePlan) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">请先创建一个计划</p>
      </div>
    )
  }

  const totalFocusHours = records.reduce((sum, r) => sum + r.focus_hours, 0)
  const totalRewardHours = records.reduce(
    (sum, r) => sum + (r.completed_tasks?.reduce((s, t) => s + t.reward_hours, 0) || 0),
    0
  )

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">历史记录</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            列表视图
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            日历视图
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm text-gray-600 mb-1">记录天数</div>
          <div className="text-2xl font-bold text-gray-900">{records.length} 天</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm text-gray-600 mb-1">累计专注</div>
          <div className="text-2xl font-bold text-emerald-600">
            {formatHours(totalFocusHours)}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-sm text-gray-600 mb-1">累计奖励</div>
          <div className="text-2xl font-bold text-amber-600">
            {formatHours(totalRewardHours)}
          </div>
        </div>
      </div>

      {/* 列表视图 */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm">
          {records.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📅</div>
              <p className="text-gray-500">暂无历史记录</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="p-6 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedRecord(record)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {record.date}
                        </h3>
                        {record.completed_tasks && record.completed_tasks.length > 0 && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                            {record.completed_tasks.length} 个任务
                          </span>
                        )}
                      </div>
                      <div className="text-sm">
                        {(() => {
                          const rewardHours = record.completed_tasks?.reduce((sum, t) => sum + t.reward_hours, 0) || 0
                          const totalHours = record.focus_hours + rewardHours
                          return (
                            <>
                              <span className="text-gray-700 font-semibold">
                                {formatHours(totalHours)}
                              </span>
                              <span className="text-gray-500"> = </span>
                              <span className="text-emerald-600">
                                {formatHours(record.focus_hours)}
                              </span>
                              {rewardHours > 0 && (
                                <>
                                  <span className="text-gray-500"> + </span>
                                  <span className="text-amber-600">
                                    {formatHours(rewardHours)}
                                  </span>
                                </>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatHours(record.remaining_hours)}
                      </div>
                      <div className="text-sm text-gray-600">剩余</div>
                    </div>
                  </div>

                  {/* 任务列表 */}
                  {record.completed_tasks && record.completed_tasks.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-wrap gap-2">
                        {record.completed_tasks.map((task) => (
                          <div
                            key={task.id}
                            className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                          >
                            {task.reward_task_name} (-{formatHours(task.reward_hours)})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 日历视图 */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <CalendarView 
            records={records} 
            onSelectRecord={setSelectedRecord}
            activePlan={activePlan}
            onRecordsUpdate={loadRecords}
          />
        </div>
      )}

      {/* 记录详情弹窗 */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          highlight={highlightDate === selectedRecord.date}
        />
      )}
    </div>
  )
}

interface CalendarViewProps {
  records: DailyRecord[]
  onSelectRecord: (record: DailyRecord) => void
  activePlan: Plan
  onRecordsUpdate: () => void
}

// 根据总森林时间返回颜色类名（蓝色系）
function getTotalHoursColorClass(totalHours: number): { bg: string; text: string; border: string } {
  if (totalHours === 0) {
    return { bg: 'bg-gray-100', text: 'text-gray-900', border: 'border-gray-200' }
  } else if (totalHours < 3) {
    return { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-200' }
  } else if (totalHours < 5) {
    return { bg: 'bg-blue-200', text: 'text-blue-900', border: 'border-blue-300' }
  } else if (totalHours < 8) {
    return { bg: 'bg-blue-300', text: 'text-blue-900', border: 'border-blue-400' }
  } else if (totalHours < 10) {
    return { bg: 'bg-blue-400', text: 'text-white', border: 'border-blue-500' }
  } else {
    return { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600' }
  }
}

function CalendarView({ records, onSelectRecord, activePlan, onRecordsUpdate }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [backfillDate, setBackfillDate] = useState<string | null>(null)
  const [backfillFocusHours, setBackfillFocusHours] = useState('0:00')

  const recordMap = new Map(records.map((r) => [r.date, r]))
  
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  
  // 生成日历数组（6周 * 7天 = 42天）
  const days = generateCalendarDays(currentMonth)

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1))
  }

  const needsAttention = (dateStr: string, record: DailyRecord | undefined): boolean => {
    // 获取计划创建日期
    const planCreatedDate = new Date(activePlan.created_at.split(' ')[0])
    const currentDate = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 如果日期在计划创建之前，不需要提醒
    if (currentDate < planCreatedDate) return false
    
    // 如果日期是今天或未来，不需要提醒（今天还没过完）
    if (currentDate >= today) return false
    
    // 如果没有记录，需要提醒
    if (!record) return true
    
    // 如果已确认（用户已经处理过，无论是记录了专注时间还是确认无专注），不需要提醒
    if (record.is_confirmed === 1) return false
    
    // 如果未确认但有专注时间（这种情况理论上不应该出现，因为有专注时间会自动确认），不需要提醒
    if (record.focus_hours > 0) return false
    
    // 其他情况（未确认且无专注时间），需要提醒
    return true
  }

  const isToday = (dateStr: string): boolean => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    return dateStr === todayStr
  }

  const handleBackfillSubmit = async () => {
    if (!backfillDate) return
    const hours = parseHours(backfillFocusHours)
    await window.electronAPI.createDailyRecord(activePlan.id, backfillDate, hours)
    setBackfillDate(null)
    setBackfillFocusHours('0:00')
    onRecordsUpdate()
  }

  const handleConfirmNoFocus = async () => {
    if (!backfillDate) return
    await window.electronAPI.createDailyRecord(activePlan.id, backfillDate, 0, true)
    setBackfillDate(null)
    await onRecordsUpdate()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={prevMonth}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          ← 上月
        </button>
        <h2 className="text-xl font-semibold text-gray-900">
          {year}年{month + 1}月
        </h2>
        <button
          onClick={nextMonth}
          className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          下月 →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
            {day}
          </div>
        ))}

        {days.map((day, index) => {
          const dateStr = formatDate(day)
          const record = recordMap.get(dateStr)
          const isCurrentMonth = day.getMonth() === month
          
          // 计算总森林时间
          const rewardHours = record?.completed_tasks?.reduce((sum, t) => sum + t.reward_hours, 0) || 0
          const totalHours = (record?.focus_hours || 0) + rewardHours
          
          // 获取颜色类名
          const colors = totalHours > 0
            ? getTotalHoursColorClass(totalHours)
            : { bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-200' }

          const isTodayDate = isToday(dateStr)
          
          return (
            <div
              key={index}
              className={`aspect-square p-2 rounded-lg border transition-all relative ${
                isCurrentMonth ? colors.border : 'border-transparent'
              } ${
                record ? `${colors.bg} hover:shadow-md cursor-pointer` : colors.bg
              } ${
                needsAttention(dateStr, record) ? 'cursor-pointer hover:shadow-md' : ''
              } ${!isCurrentMonth ? 'opacity-40' : ''} ${
                isTodayDate ? 'ring-2 ring-blue-400' : ''
              }`}
              onClick={() => {
                if (needsAttention(dateStr, record)) {
                  setBackfillDate(dateStr)
                } else if (record) {
                  onSelectRecord(record)
                }
              }}
            >
              {/* 今天的背景文字 */}
              {isTodayDate && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <span className="text-6xl font-bold text-blue-300 opacity-70">今</span>
                </div>
              )}
              
              {/* 需要确认的角标 */}
              {needsAttention(dateStr, record) && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                  ?
                </div>
              )}
              
              {/* 日期和时间信息 */}
              <div className="relative z-10">
                <div className={`text-sm mb-1 ${colors.text} ${isTodayDate ? 'font-bold text-blue-600' : ''}`}>
                  {day.getDate()}
                </div>
                {record && totalHours > 0 && (
                  <div className={`text-xs font-medium ${colors.text}`}>
                    {formatHours(totalHours)}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* 补记对话框 */}
      {backfillDate && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setBackfillDate(null)}
        >
          <div 
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">补记 {backfillDate}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  专注时间
                </label>
                <TimeInput 
                  value={backfillFocusHours} 
                  onChange={setBackfillFocusHours} 
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleBackfillSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确认补记
              </button>
              <button
                onClick={handleConfirmNoFocus}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                确认无专注
              </button>
            </div>
            <button
              onClick={() => setBackfillDate(null)}
              className="w-full mt-2 px-4 py-2 text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface RecordDetailModalProps {
  record: DailyRecord
  onClose: () => void
  highlight?: boolean
}

function RecordDetailModal({ record, onClose, highlight = false }: RecordDetailModalProps) {
  const rewardHours = record.completed_tasks?.reduce((sum, t) => sum + t.reward_hours, 0) || 0
  const totalHours = record.focus_hours + rewardHours
  
  // 监听 Esc 键关闭弹窗
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    
    // 清理事件监听器
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])
  
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-full max-w-md ${
          highlight ? 'animate-highlight' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
        style={highlight ? {
          animation: 'highlight 2s ease-in-out'
        } : {}}
      >
        {/* 标题 */}
        <div className="flex items-center justify-between mb-3 border-b pb-2">
          <h2 className="text-sm font-semibold text-gray-900">{record.date}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {/* 专注时间 */}
          <div className="flex justify-between">
            <span className="text-gray-600">专注时间</span>
            <span className="font-medium text-emerald-600">
              {formatHours(record.focus_hours)}
            </span>
          </div>

          {/* 激励时间和任务气泡 */}
          {record.completed_tasks && record.completed_tasks.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">激励时间</span>
                <span className="font-medium text-amber-600">
                  {formatHours(rewardHours)}
                </span>
              </div>
              
              {/* 任务气泡 */}
              <div className="relative pl-4">
                {/* 指向激励时间的小箭头 */}
                <div className="absolute left-0 top-2 w-3 h-3 rotate-45 bg-amber-50 border-l border-t border-amber-200"></div>
                
                {/* 任务列表气泡 */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  <div className="text-xs text-gray-500 mb-2">已完成任务</div>
                  <div className="space-y-1.5">
                    {record.completed_tasks.map((task) => (
                      <div key={task.id} className="flex justify-between items-center">
                        <span className="text-xs text-gray-700 truncate mr-2 line-through opacity-75">
                          {task.reward_task_name}
                        </span>
                        <span className="text-xs text-amber-600 font-medium whitespace-nowrap">
                          {formatHours(task.reward_hours)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 总森林时间 */}
          <div className="flex justify-between pt-2 border-t font-semibold">
            <span className="text-gray-700">总森林时间</span>
            <span className="text-gray-900">
              {formatHours(totalHours)}
            </span>
          </div>

          {/* 剩余时间 */}
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-600">剩余时间</span>
            <span className="font-medium text-blue-600">
              {formatHours(record.remaining_hours)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

