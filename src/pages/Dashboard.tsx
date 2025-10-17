import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Plan, DailyRecord, RewardTask } from '../types'
import { formatHours, getTodayDate, getYesterdayDate } from '../utils/helpers'

interface DashboardProps {
  activePlan: Plan | null
}

export default function Dashboard({ activePlan }: DashboardProps) {
  const navigate = useNavigate()
  const [recentRecords, setRecentRecords] = useState<DailyRecord[]>([])
  const [yesterdayRecord, setYesterdayRecord] = useState<DailyRecord | null>(null)
  const [todayRecord, setTodayRecord] = useState<DailyRecord | null>(null)
  const [allTasks, setAllTasks] = useState<RewardTask[]>([])
  const [progressViewMode, setProgressViewMode] = useState<'stats' | 'heatmap'>(() => {
    // 从 localStorage 读取用户上次选择的视图，如果没有则使用默认设置
    const saved = localStorage.getItem('dashboardViewMode')
    if (saved) return saved as 'stats' | 'heatmap'
    const defaultView = localStorage.getItem('defaultDashboardView')
    return (defaultView as 'stats' | 'heatmap') || 'stats'
  })
  const [heatmapRecords, setHeatmapRecords] = useState<DailyRecord[]>([])
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const [showAllTasks, setShowAllTasks] = useState(false)
  const [unconfirmedDaysCount, setUnconfirmedDaysCount] = useState(0)

  useEffect(() => {
    if (activePlan) {
      loadData()
      loadHeatmapData()
    }
  }, [activePlan])

  // 保存视图模式到 localStorage
  useEffect(() => {
    localStorage.setItem('dashboardViewMode', progressViewMode)
  }, [progressViewMode])

  const loadData = async () => {
    if (!activePlan) return

    // 加载最近记录（5条）
    const records = await window.electronAPI.getDailyRecords(activePlan.id, 5)
    setRecentRecords(records)

    // 加载昨日记录
    const yesterday = getYesterdayDate()
    const yesterdayRec = await window.electronAPI.getDailyRecordByDate(activePlan.id, yesterday)
    setYesterdayRecord(yesterdayRec)

    // 加载今日记录
    const today = getTodayDate()
    const todayRec = await window.electronAPI.getDailyRecordByDate(activePlan.id, today)
    setTodayRecord(todayRec)

    // 加载所有任务
    const tasks = await window.electronAPI.getRewardTasks(activePlan.id)
    setAllTasks(tasks)

    // 统计需要确认的天数
    await calculateUnconfirmedDays()
  }

  const calculateUnconfirmedDays = async () => {
    if (!activePlan) return

    const planCreatedDate = new Date(activePlan.created_at.split(' ')[0])
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 获取从计划创建到昨天的所有记录
    const yesterday = getYesterdayDate()
    const startDateStr = planCreatedDate.toISOString().split('T')[0]
    
    const allRecords = await window.electronAPI.getRecordsByDateRange(
      activePlan.id,
      startDateStr,
      yesterday
    )

    // 创建记录映射
    const recordMap = new Map<string, DailyRecord>()
    allRecords.forEach(r => recordMap.set(r.date, r))

    // 统计需要确认的天数
    let count = 0
    const current = new Date(planCreatedDate)
    const yesterdayDate = new Date(yesterday)

    while (current <= yesterdayDate) {
      const dateStr = current.toISOString().split('T')[0]
      const record = recordMap.get(dateStr)
      
      // 判断是否需要确认：没有记录或者未确认（is_confirmed === 0）
      if (!record || record.is_confirmed === 0) {
        count++
      }

      current.setDate(current.getDate() + 1)
    }

    setUnconfirmedDaysCount(count)
  }

  const loadHeatmapData = async () => {
    if (!activePlan) return

    // 计算过去90天的日期范围
    const endDate = getTodayDate()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)
    const startDateStr = startDate.toISOString().split('T')[0]

    console.log('Loading heatmap data from', startDateStr, 'to', endDate)

    // 加载数据
    const records = await window.electronAPI.getRecordsByDateRange(
      activePlan.id,
      startDateStr,
      endDate
    )
    console.log('Heatmap records loaded:', records.length, 'records')
    setHeatmapRecords(records)
  }

  const handleQuickCompleteTask = async (e: React.MouseEvent, taskId: number) => {
    e.stopPropagation() // 阻止事件冒泡，防止触发导航
    
    const today = getTodayDate()
    await window.electronAPI.completeRewardTask(taskId, today)
    
    // 刷新数据
    loadData()
  }

  if (!activePlan) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">🌲</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">欢迎使用森记</h2>
          <p className="text-gray-600 mb-6">开始你的时间统计之旅</p>
          <a
            href="/settings"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            创建第一个计划
          </a>
        </div>
      </div>
    )
  }

  const progress = ((activePlan.initial_hours - activePlan.current_hours) / activePlan.initial_hours) * 100
  const totalSpent = activePlan.initial_hours - activePlan.current_hours

  // 今日总激励时间
  const todayTotalReward = todayRecord?.completed_tasks?.reduce((sum, t) => sum + t.reward_hours, 0) || 0

  // 今日已完成任务列表
  const todayCompletedTasks = todayRecord?.completed_tasks || []

  // 今日已完成任务的ID集合
  const todayCompletedTaskIds = new Set(todayCompletedTasks.map(t => t.reward_task_id))

  // 未完成任务列表（任务池中排除今日已完成的）
  const availableTasks = allTasks.filter(task => !todayCompletedTaskIds.has(task.id))

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">仪表盘</h1>

      {/* 进度卡片 */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        {/* 切换按钮 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{activePlan.name}</h2>
          <button
            onClick={() => {
              const newMode = progressViewMode === 'stats' ? 'heatmap' : 'stats'
              console.log('Switching view mode to:', newMode, 'heatmapRecords count:', heatmapRecords.length)
              setProgressViewMode(newMode)
            }}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title={progressViewMode === 'stats' ? '切换到热力图' : '切换到统计视图'}
          >
            {progressViewMode === 'stats' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
          </button>
        </div>

        {/* 统计视图 */}
        {progressViewMode === 'stats' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600">
                初始时间: {formatHours(activePlan.initial_hours)}
              </p>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">
                  {formatHours(activePlan.current_hours)}
                </div>
                <div className="text-sm text-gray-600 mt-1">剩余时间</div>
              </div>
            </div>

            {/* 进度条 */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>已完成 {progress.toFixed(1)}%</span>
                <span>已投入 {formatHours(totalSpent)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </>
        )}

        {/* 热力图视图 */}
        {progressViewMode === 'heatmap' && (
          <>
            {console.log('Rendering HeatmapView with', heatmapRecords.length, 'records')}
            <HeatmapView 
              records={heatmapRecords} 
              plan={activePlan}
            />
          </>
        )}
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* 昨日专注 - 智能卡片 */}
        {(() => {
          // 判断昨日是否有有效记录
          const hasYesterdayRecord = yesterdayRecord && yesterdayRecord.is_confirmed === 1
          
          // 计算昨日激励时间
          const yesterdayRewardHours = yesterdayRecord?.completed_tasks
            ? yesterdayRecord.completed_tasks.reduce((sum, t) => sum + t.reward_hours, 0)
            : 0

          // 状态1：昨日未记录
          if (!hasYesterdayRecord) {
            return (
              <div 
                onClick={() => navigate('/records?date=' + getYesterdayDate())}
                className="bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg hover:border-orange-300 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-orange-700 text-sm font-medium">昨日专注</span>
                  <span className="text-2xl">⚠️</span>
                </div>
                <div className="text-3xl font-bold text-orange-600 mb-2">-:--</div>
                <div className="text-xs text-orange-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  昨日专注时间未记录，点击记录
                </div>
              </div>
            )
          }

          // 状态2：昨日有记录 + 有未确认日期
          if (unconfirmedDaysCount > 0) {
            return (
              <div 
                onClick={() => navigate('/history?view=calendar')}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-700 text-sm font-medium">昨日专注</span>
                  <span className="text-2xl">📅</span>
                </div>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-3xl font-bold text-emerald-600">
                    {formatHours(yesterdayRecord.focus_hours)}
                  </span>
                  {yesterdayRewardHours > 0 && (
                    <>
                      <span className="text-lg font-medium text-gray-400">+</span>
                      <span className="text-base font-medium text-amber-600">
                        {formatHours(yesterdayRewardHours)}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-100 border border-yellow-300 rounded-lg">
                  <svg className="w-3.5 h-3.5 text-yellow-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs text-yellow-700 font-medium">
                    还有 {unconfirmedDaysCount} 天需确认
                  </span>
                </div>
              </div>
            )
          }

          // 状态3：昨日有记录 + 无未确认日期
          return (
            <div 
              onClick={() => navigate('/records?date=' + getTodayDate())}
              className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-xl shadow-sm p-6 cursor-pointer hover:shadow-lg hover:border-emerald-300 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-emerald-700 text-sm font-medium">昨日专注</span>
                <span className="text-2xl">✅</span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-3xl font-bold text-emerald-600">
                  {formatHours(yesterdayRecord.focus_hours)}
                </span>
                {yesterdayRewardHours > 0 && (
                  <>
                    <span className="text-lg font-medium text-gray-400">+</span>
                    <span className="text-base font-medium text-amber-600">
                      {formatHours(yesterdayRewardHours)}
                    </span>
                  </>
                )}
              </div>
              <div className="text-xs text-emerald-600 flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                点击记录今日专注
              </div>
            </div>
          )
        })()}

        {/* 今日已完成 - 显示已完成任务列表 */}
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col">
          <div 
            onClick={() => navigate('/tasks')} 
            className="flex items-center justify-between mb-3 cursor-pointer"
          >
            <span className="text-gray-600 text-sm">今日已完成</span>
            <span className="text-2xl">✅</span>
          </div>
          <div className="flex-1 flex flex-col min-h-[96px]">
            <div className="space-y-2 flex-1">
              {todayCompletedTasks.length > 0 ? (
                <>
                  {(showAllCompleted ? todayCompletedTasks : todayCompletedTasks.slice(0, 3)).map((task) => (
                    <div key={task.id} className="text-xs text-gray-700 flex justify-between items-center">
                      <span className="truncate flex-1 line-through opacity-75">{task.reward_task_name}</span>
                      <span className="text-amber-600 ml-2 font-medium line-through opacity-75">-{formatHours(task.reward_hours)}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-sm text-gray-500">暂无完成任务</div>
              )}
            </div>
            {todayCompletedTasks.length > 3 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAllCompleted(!showAllCompleted)
                }}
                className="text-xs text-blue-600 hover:text-blue-700 w-full text-center py-1 mt-1"
              >
                {showAllCompleted ? '收起 ▲' : `展开更多 (${todayCompletedTasks.length - 3}) ▼`}
              </button>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-3 pt-2 border-t flex justify-between items-center">
            <span>今日总激励</span>
            <span className="font-bold text-amber-600">{formatHours(todayTotalReward)}</span>
          </div>
        </div>

        {/* 任务池 - 显示未完成任务列表 */}
        <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow flex flex-col">
          <div 
            onClick={() => navigate('/tasks')} 
            className="flex items-center justify-between mb-3 cursor-pointer"
          >
            <span className="text-gray-600 text-sm">任务池</span>
            <span className="text-2xl">🎯</span>
          </div>
            <div className="flex-1 flex flex-col min-h-[96px]">
              <div className="space-y-2 flex-1">
                {availableTasks.length > 0 ? (
                  <>
                    {(showAllTasks ? availableTasks : availableTasks.slice(0, 3)).map((task) => (
                      <div key={task.id} className="group text-xs text-gray-700 flex justify-between items-center relative pr-8">
                        <span className="truncate flex-1">{task.name}</span>
                        <span className="text-amber-600 ml-2 font-medium">{formatHours(task.reward_hours)}</span>
                        <button
                          onClick={(e) => handleQuickCompleteTask(e, task.id)}
                          className="absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-green-500 hover:bg-green-600 text-white"
                          title="快捷完成"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-sm text-gray-500">全部完成！</div>
                )}
              </div>
              {availableTasks.length > 3 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAllTasks(!showAllTasks)
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 w-full text-center py-1 mt-1"
                >
                  {showAllTasks ? '收起 ▲' : `展开更多 (${availableTasks.length - 3}) ▼`}
                </button>
              )}
            </div>
          <div className="text-xs text-gray-500 mt-3 pt-2 border-t">
            今日完成 {todayCompletedTaskIds.size}/{allTasks.length + todayCompletedTaskIds.size}
          </div>
        </div>
      </div>

      {/* 最近记录 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">最近记录</h2>
          <button
            onClick={() => navigate('/history')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            查看更多 →
          </button>
        </div>
        {recentRecords.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无记录</p>
        ) : (
          <div className="space-y-3">
            {recentRecords.map((record) => (
              <div
                key={record.id}
                onClick={() => navigate('/history')}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-medium text-gray-900">{record.date}</div>
                  <div className="text-sm mt-1">
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
                  <div className="text-lg font-semibold text-blue-600">
                    {formatHours(record.remaining_hours)}
                  </div>
                  <div className="text-sm text-gray-600">剩余</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 热力图组件
interface HeatmapViewProps {
  records: DailyRecord[]
  plan: Plan
}

function HeatmapView({ records, plan }: HeatmapViewProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number; containerY: number; cellRight?: number } | null>(null)

  console.log('HeatmapView rendered, hoveredDate:', hoveredDate, 'hoverPosition:', hoverPosition)

  // 创建日期到记录的映射
  const recordMap = new Map(records.map((r) => [r.date, r]))

  // 获取过去90天的日期
  const days: Date[] = []
  for (let i = 89; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    days.push(date)
  }

  // 将日期按周分组（每周7天）
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  // 根据总森林时间返回绿色深浅（GitHub风格）
  const getTotalHoursGreenClass = (record: DailyRecord | undefined): string => {
    if (!record) return 'bg-gray-100'
    const totalHours = record.focus_hours + 
      (record.completed_tasks?.reduce((sum, t) => sum + t.reward_hours, 0) || 0)
    if (totalHours === 0) return 'bg-gray-100'
    if (totalHours < 3) return 'bg-green-100'
    if (totalHours < 5) return 'bg-green-200'
    if (totalHours < 8) return 'bg-green-300'
    if (totalHours < 10) return 'bg-green-400'
    return 'bg-green-500'
  }

  // 获取对应的hex颜色值
  const getHexColor = (className: string): string => {
    const colorMap: Record<string, string> = {
      'bg-gray-100': '#f3f4f6',
      'bg-green-100': '#dcfce7',
      'bg-green-200': '#bbf7d0',
      'bg-green-300': '#86efac',
      'bg-green-400': '#4ade80',
      'bg-green-500': '#22c55e'
    }
    return colorMap[className] || '#f3f4f6'
  }

  const navigate = useNavigate()

  const handleCellHover = (dateStr: string, event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const position = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      containerY: 0,
      cellRight: rect.right // 添加小方格的右边位置
    }
    setHoveredDate(dateStr)
    setHoverPosition(position)
  }

  const handleCellLeave = () => {
    console.log('Hover leave')
    setHoveredDate(null)
    setHoverPosition(null)
  }

  const handleCellClick = (dateStr: string) => {
    // 跳转到历史界面并传递日期参数
    navigate(`/history?date=${dateStr}`)
  }

  const hoveredRecord = hoveredDate ? recordMap.get(hoveredDate) : null

  return (
    <div className="relative heatmap-container">
      {/* 顶部信息 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">初始时间: {formatHours(plan.initial_hours)}</p>
          <p className="text-xs text-gray-500 mt-1">过去90天的总森林时间热力图</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-blue-600">
            {formatHours(plan.current_hours)}
          </div>
          <div className="text-sm text-gray-600 mt-1">剩余时间</div>
        </div>
      </div>

      {/* 热力图：外层处理滚动，内层用padding避免裁切 */}
      <div className="overflow-x-auto overflow-y-visible mt-6">
        <div className="p-3 pt-6">
          {/* 月份标签 */}
          <div className="flex gap-1.5 mb-2">
            {weeks.map((week, weekIdx) => {
              const firstDay = week[0]
              const month = firstDay.getMonth() + 1
              const prevWeekFirstDay = weekIdx > 0 ? weeks[weekIdx - 1][0] : null
              const prevMonth = prevWeekFirstDay ? prevWeekFirstDay.getMonth() + 1 : null
              const isNewMonth = prevMonth === null || month !== prevMonth
              
              return (
                <div key={weekIdx} className="w-4 h-5 flex items-start justify-center">
                  {isNewMonth && (
                    <span className="text-xs text-gray-500 font-medium">
                      {month}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* 热力图方块 */}
          <div className="flex gap-1.5">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1.5">
                {week.map((day, dayIdx) => {
                  const dateStr = day.toISOString().split('T')[0]
                  const record = recordMap.get(dateStr)
                  const colorClass = getTotalHoursGreenClass(record)

                  return (
                  <div
                      key={dayIdx}
                    className={`w-4 h-4 rounded-sm relative ${colorClass} cursor-pointer transition-opacity duration-150 ${
                      hoveredDate === dateStr ? 'opacity-70' : 'hover:opacity-80'
                    }`}
                      onMouseEnter={(e) => {
                        console.log('Mouse enter on cell:', dateStr)
                        handleCellHover(dateStr, e)
                      }}
                      onMouseLeave={() => {
                        console.log('Mouse leave cell')
                        handleCellLeave()
                      }}
                      onClick={() => handleCellClick(dateStr)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-600">
        <span>少</span>
        <div className="flex gap-1.5">
          <div className="w-4 h-4 rounded-sm bg-gray-100"></div>
          <div className="w-4 h-4 rounded-sm bg-green-100"></div>
          <div className="w-4 h-4 rounded-sm bg-green-200"></div>
          <div className="w-4 h-4 rounded-sm bg-green-300"></div>
          <div className="w-4 h-4 rounded-sm bg-green-400"></div>
          <div className="w-4 h-4 rounded-sm bg-green-500"></div>
        </div>
        <span>多</span>
      </div>

      {/* 通过 Portal 渲染悬浮层与预览卡片，避免任何 overflow 裁切 */}
      {hoveredDate && hoverPosition && createPortal(
        <div 
          className="fixed inset-0 pointer-events-none" 
          style={{ 
            zIndex: 999999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none'
          }}
        >
          {/* 悬浮放大方块（完全不受父容器overflow限制） */}
          <div
            className="absolute rounded-sm ring-2 ring-blue-500 shadow-lg"
            style={{
              width: '24px',
              height: '24px',
              left: `${hoverPosition.x - 12}px`,
              top: `${hoverPosition.y - 12}px`,
              backgroundColor: getHexColor(getTotalHoursGreenClass(hoveredRecord || undefined)),
              transition: 'all 150ms ease',
              position: 'absolute'
            }}
          />

          {/* 连接线 */}
          <svg 
            className="absolute inset-0 w-full h-full"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <line
              x1={hoverPosition.x}
              y1={hoverPosition.y}
              x2={(hoverPosition.cellRight || hoverPosition.x) + 35}
              y2={hoverPosition.y}
              stroke="#93c5fd"
              strokeWidth="1.5"
              strokeDasharray="6 3"
              opacity="0.7"
            />
          </svg>

          {/* 预览卡片 */}
          <div
            className="absolute bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-64 pointer-events-auto"
            style={{
              position: 'absolute',
              left: `${(hoverPosition.cellRight || hoverPosition.x) + 45}px`,
              top: `${Math.max(16, Math.min(hoverPosition.y - 100, window.innerHeight - 400))}px`,
              maxHeight: `${window.innerHeight - 32}px`,
              zIndex: 1
            }}
          >
            <div className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">
              {hoveredDate}
            </div>
            {hoveredRecord ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">专注时间</span>
                  <span className="font-medium text-emerald-600">
                    {formatHours(hoveredRecord.focus_hours)}
                  </span>
                </div>
                {hoveredRecord.completed_tasks && hoveredRecord.completed_tasks.length > 0 && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">激励时间</span>
                      <span className="font-medium text-amber-600">
                        {formatHours(
                          hoveredRecord.completed_tasks.reduce((sum, t) => sum + t.reward_hours, 0)
                        )}
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
                          {hoveredRecord.completed_tasks.map((task) => (
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
                <div className="flex justify-between pt-2 border-t font-semibold">
                  <span className="text-gray-700">总森林时间</span>
                  <span className="text-gray-900">
                    {formatHours(
                      hoveredRecord.focus_hours + 
                      (hoveredRecord.completed_tasks?.reduce((sum, t) => sum + t.reward_hours, 0) || 0)
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">暂无记录</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
