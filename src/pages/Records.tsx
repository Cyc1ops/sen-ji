import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plan, DailyRecord } from '../types'
import { formatHours, parseHours, getTodayDate, getYesterdayDate, getDateDisplayName } from '../utils/helpers'
import TimeInput from '../components/TimeInput'

interface RecordsProps {
  activePlan: Plan | null
}

export default function Records({ activePlan }: RecordsProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedDate, setSelectedDate] = useState(getYesterdayDate())
  const [focusTime, setFocusTime] = useState('')
  const [existingRecord, setExistingRecord] = useState<DailyRecord | null>(null)
  const [isCustomDate, setIsCustomDate] = useState(false)

  // 处理URL参数，设置初始日期
  useEffect(() => {
    const dateParam = searchParams.get('date')
    if (dateParam) {
      setSelectedDate(dateParam)
      setSearchParams({}) // 清除URL参数
    }
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (activePlan && selectedDate) {
      loadRecord()
    }
  }, [activePlan, selectedDate])

  const loadRecord = async () => {
    if (!activePlan) return
    const record = await window.electronAPI.getDailyRecordByDate(activePlan.id, selectedDate)
    setExistingRecord(record)
    if (record) {
      setFocusTime(formatHours(record.focus_hours))
    } else {
      setFocusTime('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activePlan) return

    const focusHours = parseHours(focusTime)
    if (focusHours < 0) {
      alert('请输入有效的时间格式')
      return
    }

    try {
      if (existingRecord) {
        await window.electronAPI.updateDailyRecord(existingRecord.id, focusHours)
        alert('记录已更新！')
      } else {
        await window.electronAPI.createDailyRecord(activePlan.id, selectedDate, focusHours)
        alert('记录已创建！')
      }
      loadRecord()
      // 刷新页面
      window.location.reload()
    } catch (error) {
      console.error(error)
      alert('保存失败，请重试')
    }
  }

  if (!activePlan) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">请先创建一个计划</p>
      </div>
    )
  }

  const yesterday = getYesterdayDate()
  const today = getTodayDate()

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">记录</h1>

      {/* 日期选择 */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">选择日期</h2>
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => {
              setSelectedDate(yesterday)
              setIsCustomDate(false)
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedDate === yesterday && !isCustomDate
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            昨天 ({yesterday})
          </button>
          <button
            onClick={() => {
              setSelectedDate(today)
              setIsCustomDate(false)
            }}
            className={`px-4 py-2 rounded-lg transition-colors ${
              selectedDate === today && !isCustomDate
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            今天 ({today})
          </button>
          <button
            onClick={() => setIsCustomDate(true)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isCustomDate
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            自定义日期
          </button>
        </div>

        {isCustomDate && (
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        )}
      </div>

      {/* 已完成的任务 - 紧凑设计 */}
      {existingRecord && existingRecord.completed_tasks && existingRecord.completed_tasks.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-sm font-semibold text-amber-900">
                {getDateDisplayName(selectedDate)} 已完成任务
              </h3>
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-xs font-medium rounded-full">
                {existingRecord.completed_tasks.length}
              </span>
            </div>
            <span className="text-sm font-bold text-amber-700">
              -{formatHours(existingRecord.completed_tasks.reduce((sum, t) => sum + t.reward_hours, 0))}
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {existingRecord.completed_tasks.map((task) => (
              <div
                key={task.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-300 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <span className="text-sm text-gray-800 line-through opacity-75">
                  {task.reward_task_name}
                </span>
                <span className="text-xs text-amber-600 font-semibold">
                  -{formatHours(task.reward_hours)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 专注时间输入 */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {getDateDisplayName(selectedDate)} 的专注时间
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              专注时间
            </label>
            <TimeInput
              value={focusTime}
              onChange={(value) => setFocusTime(value)}
              placeholder="0:00"
            />
            <p className="text-sm text-gray-500 mt-3">
              输入昨日的专注时间，例如 7 小时 41 分钟
            </p>
          </div>

          {/* 预览 */}
          {focusTime && existingRecord?.completed_tasks && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">记录预览</h3>
              <div className="text-sm text-gray-700">
                <div>专注时间: {focusTime}</div>
                {existingRecord.completed_tasks.length > 0 && (
                  <div>
                    奖励任务: {existingRecord.completed_tasks.length} 个，共 
                    {formatHours(
                      existingRecord.completed_tasks.reduce((sum, t) => sum + t.reward_hours, 0)
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {existingRecord ? '更新记录' : '创建记录'}
          </button>
        </form>

        {existingRecord && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              <div className="flex justify-between mb-2">
                <span>当前记录剩余时间:</span>
                <span className="font-semibold text-blue-600">
                  {formatHours(existingRecord.remaining_hours)}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                创建于 {new Date(existingRecord.created_at).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 使用说明 */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">💡 使用提示</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 通常在第二天早上记录昨天的专注时间</li>
          <li>• 如果昨天完成了奖励任务，会自动显示在上方</li>
          <li>• 可以使用"自定义日期"进行补记</li>
          <li>• 记录创建后仍可以修改</li>
        </ul>
      </div>
    </div>
  )
}

