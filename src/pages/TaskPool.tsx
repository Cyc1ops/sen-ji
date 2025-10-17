import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plan, RewardTask, DailyRecord } from '../types'
import { formatHours, parseHours, getTodayDate } from '../utils/helpers'
import TimeInput from '../components/TimeInput'

interface TaskPoolProps {
  activePlan: Plan | null
}

export default function TaskPool({ activePlan }: TaskPoolProps) {
  const [tasks, setTasks] = useState<RewardTask[]>([])
  const [allTasksWithStatus, setAllTasksWithStatus] = useState<Array<RewardTask & { last_completed_date?: string }>>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingTask, setEditingTask] = useState<RewardTask | null>(null)
  const [todayCompletedTaskIds, setTodayCompletedTaskIds] = useState<Set<number>>(new Set())
  const [showBackfillDialog, setShowBackfillDialog] = useState(false)
  const [backfillTaskId, setBackfillTaskId] = useState<number | null>(null)
  const [backfillDate, setBackfillDate] = useState(getTodayDate())
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    if (activePlan) {
      loadTasks()
      loadAllTasksWithStatus()
      loadTodayCompletedTasks()
    }
  }, [activePlan])

  const loadTasks = async () => {
    if (!activePlan) return
    const taskList = await window.electronAPI.getRewardTasks(activePlan.id)
    setTasks(taskList)
  }

  const loadAllTasksWithStatus = async () => {
    if (!activePlan) return
    const tasksWithStatus = await window.electronAPI.getRewardTasksWithStatus(activePlan.id)
    setAllTasksWithStatus(tasksWithStatus)
  }

  const loadTodayCompletedTasks = async () => {
    if (!activePlan) return
    const today = getTodayDate()
    const todayRecord: DailyRecord | null = await window.electronAPI.getDailyRecordByDate(
      activePlan.id,
      today
    )
    
    if (todayRecord?.completed_tasks) {
      const completedIds = new Set(todayRecord.completed_tasks.map(t => t.reward_task_id))
      setTodayCompletedTaskIds(completedIds)
    }
  }

  const handleCompleteTask = async (taskId: number) => {
    const today = getTodayDate()
    
    // 检查今天是否已完成
    if (todayCompletedTaskIds.has(taskId)) {
      // 已完成，执行取消完成操作
      if (confirm('确定要取消这个任务的完成状态吗？')) {
        await window.electronAPI.uncompleteRewardTask(taskId, today)
        loadTasks()
        loadTodayCompletedTasks()
        loadAllTasksWithStatus()
      }
      return
    }

    // 未完成，执行完成操作
    await window.electronAPI.completeRewardTask(taskId, today)
    
    // 重新加载今日完成任务列表
    loadTodayCompletedTasks()
    loadAllTasksWithStatus()
  }

  const handleBackfillComplete = async () => {
    if (!backfillTaskId) {
      alert('请选择要补记的任务')
      return
    }
    
    await window.electronAPI.completeRewardTask(backfillTaskId, backfillDate)
    alert(`任务已补记到 ${backfillDate}！`)
    
    setShowBackfillDialog(false)
    setBackfillTaskId(null)
    setBackfillDate(getTodayDate())
    loadTasks()
    loadTodayCompletedTasks()
    loadAllTasksWithStatus()
  }

  const handleUncompleteTask = async (taskId: number, lastCompletedDate: string) => {
    if (confirm(`确定要撤回任务在 ${lastCompletedDate} 的完成状态吗？`)) {
      await window.electronAPI.uncompleteRewardTask(taskId, lastCompletedDate)
      loadTasks()
      loadTodayCompletedTasks()
      loadAllTasksWithStatus()
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (confirm('确定要删除这个任务吗？')) {
      await window.electronAPI.deleteRewardTask(taskId)
      loadTasks()
    }
  }

  if (!activePlan) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">请先创建一个计划</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">任务池</h1>
        <button
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 添加任务
        </button>
      </div>

      {tasks.length === 0 && allTasksWithStatus.filter(t => t.last_completed_date).length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-gray-500 mb-4">暂无任务</p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            创建第一个奖励任务
          </button>
        </div>
      ) : (
        <>
          {/* 活动任务列表：未完成的任务 + 今天完成的任务 */}
          {(() => {
            const today = getTodayDate()
            // 今天完成的任务
            const todayCompletedTasks = allTasksWithStatus.filter(t => 
              t.last_completed_date === today
            )
            // 合并未完成任务和今天完成的任务，使用 Map 去重
            const taskMap = new Map()
            tasks.forEach(t => taskMap.set(t.id, t))
            todayCompletedTasks.forEach(t => taskMap.set(t.id, t))
            const activeTasks = Array.from(taskMap.values())
            
            // 排序：未完成的任务在前，今日已完成的任务在后
            activeTasks.sort((a, b) => {
              const aCompleted = todayCompletedTaskIds.has(a.id)
              const bCompleted = todayCompletedTaskIds.has(b.id)
              if (aCompleted === bCompleted) return 0
              return aCompleted ? 1 : -1  // 已完成的排在后面
            })
            
            if (activeTasks.length === 0) return null
            
            return (
              <div className="space-y-3">
                {activeTasks.map((task) => {
                  const isCompletedToday = todayCompletedTaskIds.has(task.id)
                
                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{
                      layout: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
                      opacity: { duration: 0.3 },
                      y: { duration: 0.3 }
                    }}
                    className={`rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow ${
                      isCompletedToday ? 'bg-gray-50 opacity-50' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* 任务信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className={`text-base font-semibold text-gray-900 truncate ${
                            isCompletedToday ? 'line-through opacity-75' : ''
                          }`}>
                            {task.name}
                          </h3>
                          {isCompletedToday && (
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full whitespace-nowrap">
                              今日已完成
                            </span>
                          )}
                        </div>
                        <p className={`text-sm mt-1 ${
                          isCompletedToday ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          奖励: <span className={`font-medium ${
                            isCompletedToday ? 'text-gray-400 line-through' : 'text-amber-600'
                          }`}>{formatHours(task.reward_hours)}</span>
                        </p>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            isCompletedToday
                              ? 'bg-gray-100 text-gray-400 hover:bg-gray-200 cursor-pointer'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                          title={isCompletedToday ? '取消完成' : '完成任务'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingTask(task)}
                          disabled={isCompletedToday}
                          className={`p-2 rounded-lg transition-colors ${
                            isCompletedToday
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title={isCompletedToday ? '已完成任务不可编辑' : '编辑任务'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={isCompletedToday}
                          className={`p-2 rounded-lg transition-colors ${
                            isCompletedToday
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={isCompletedToday ? '已完成任务不可删除' : '删除任务'}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )
        })()}

          {/* 历史已完成任务折叠区域 */}
          {(() => {
            const today = getTodayDate()
            const completedTasks = allTasksWithStatus.filter(t => 
              t.last_completed_date && t.last_completed_date !== today
            )
            
            if (completedTasks.length === 0) return null
            
            return (
              <div className="mt-8">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors w-full"
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium">已完成</span>
                  <span className="text-gray-400">{completedTasks.length}</span>
                </button>

                {showCompleted && (
                  <div className="mt-4 space-y-2">
                    {completedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="group bg-gray-50 rounded-lg p-3 opacity-60 hover:opacity-100 transition-opacity relative"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <h3 className="text-sm text-gray-700 line-through truncate">
                                {task.name}
                              </h3>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 ml-6">
                              最后完成: {task.last_completed_date}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-400">
                              {formatHours(task.reward_hours)}
                            </div>
                            <button
                              onClick={() => handleUncompleteTask(task.id, task.last_completed_date!)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-600"
                              title="撤回完成"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </>
      )}

      {/* 底部补记入口 */}
      {tasks.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowBackfillDialog(true)}
            className="text-sm text-gray-500 hover:text-gray-700 underline decoration-dotted"
          >
            补记任务
          </button>
        </div>
      )}

      {/* 添加任务对话框 */}
      {showAddDialog && (
        <TaskDialog
          planId={activePlan.id}
          onClose={() => setShowAddDialog(false)}
          onSuccess={() => {
            setShowAddDialog(false)
            loadTasks()
          }}
        />
      )}

      {/* 编辑任务对话框 */}
      {editingTask && (
        <TaskDialog
          planId={activePlan.id}
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={() => {
            setEditingTask(null)
            loadTasks()
          }}
        />
      )}

      {/* 补记任务对话框 */}
      {showBackfillDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">补记任务完成</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择任务
              </label>
              <select
                value={backfillTaskId || ''}
                onChange={(e) => setBackfillTaskId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择任务</option>
                {tasks
                  .filter((task) => !todayCompletedTaskIds.has(task.id))
                  .map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.name} ({formatHours(task.reward_hours)})
                    </option>
                  ))}
              </select>
              {tasks.filter((task) => !todayCompletedTaskIds.has(task.id)).length === 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  今日所有任务都已完成，无需补记
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                完成日期
              </label>
              <input
                type="date"
                value={backfillDate}
                onChange={(e) => setBackfillDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBackfillDialog(false)
                  setBackfillTaskId(null)
                  setBackfillDate(getTodayDate())
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleBackfillComplete}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确认补记
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface TaskDialogProps {
  planId: number
  task?: RewardTask
  onClose: () => void
  onSuccess: () => void
}

function TaskDialog({ planId, task, onClose, onSuccess }: TaskDialogProps) {
  const [name, setName] = useState(task?.name || '')
  const [rewardTime, setRewardTime] = useState(
    task ? formatHours(task.reward_hours) : '1:00'
  )

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const rewardHours = parseHours(rewardTime)
    if (!name.trim() || rewardHours <= 0) {
      alert('请填写任务名称和有效的奖励时间')
      return
    }

    if (task) {
      await window.electronAPI.updateRewardTask(task.id, {
        name,
        reward_hours: rewardHours
      })
    } else {
      await window.electronAPI.createRewardTask(planId, name, rewardHours)
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {task ? '编辑任务' : '添加任务'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              任务名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="例如：完成森记应用开发"
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              奖励时间
            </label>
            <div className="space-y-4">
              <TimeInput
                value={rewardTime}
                onChange={(value) => setRewardTime(value)}
                placeholder="1:00"
              />
              
              {/* 快捷时间选项 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-xs font-medium text-blue-900">快捷选择</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['0:30', '1:00', '1:30', '2:00', '3:00', '5:00'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setRewardTime(time)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all transform hover:scale-105 ${
                        rewardTime === time
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                          : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
              
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                设置完成此任务的奖励时间，例如 5 小时 30 分钟
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {task ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

