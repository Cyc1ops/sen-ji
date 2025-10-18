import { useState, useEffect } from 'react'
import { Plan } from '../types'
import { formatHours, parseHours } from '../utils/helpers'
import TimeInput from '../components/TimeInput'

interface SettingsProps {
  onPlanChange: () => void
}

export default function Settings({ onPlanChange }: SettingsProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [activePlan, setActivePlan] = useState<Plan | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [editInitialHours, setEditInitialHours] = useState('')
  const [editCreatedAt, setEditCreatedAt] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [showOtherPlans, setShowOtherPlans] = useState(false)
  const [showArchivedPlans, setShowArchivedPlans] = useState(false)
  const [archivingPlan, setArchivingPlan] = useState<Plan | null>(null)
  
  // 默认视图设置
  const [defaultDashboardView, setDefaultDashboardView] = useState<'stats' | 'heatmap'>(() => {
    return (localStorage.getItem('defaultDashboardView') as 'stats' | 'heatmap') || 'stats'
  })
  const [defaultHistoryView, setDefaultHistoryView] = useState<'list' | 'calendar'>(() => {
    return (localStorage.getItem('defaultHistoryView') as 'list' | 'calendar') || 'list'
  })

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    const planList = await window.electronAPI.getAllPlans()
    setPlans(planList)

    const active = await window.electronAPI.getActivePlan()
    setActivePlan(active)
  }

  const handleSwitchPlan = async (planId: number) => {
    await window.electronAPI.setActivePlan(planId)
    loadPlans()
    onPlanChange()
  }

  const handleUpdatePlanDetails = async () => {
    if (!editingPlan) return
    const hours = parseHours(editInitialHours)
    await window.electronAPI.updatePlanDetails(editingPlan.id, hours, editCreatedAt)
    // 同时更新 deadline
    await window.electronAPI.updatePlan(editingPlan.id, { deadline: editDeadline || null })
    setEditingPlan(null)
    loadPlans()
    onPlanChange()
  }

  const handleArchivePlan = (plan: Plan) => {
    setArchivingPlan(plan)
  }

  const confirmArchivePlan = async (reason: 'completed' | 'suspended') => {
    if (!archivingPlan) return
    await window.electronAPI.archivePlan(archivingPlan.id, reason)
    setArchivingPlan(null)
    loadPlans()
    onPlanChange()
  }

  const handleRestorePlan = async (planId: number) => {
    if (confirm('确定要恢复这个计划吗？')) {
      await window.electronAPI.restorePlan(planId)
      loadPlans()
      onPlanChange()
    }
  }

  const handleDeletePlan = async (planId: number, planName: string) => {
    if (confirm(`确定要永久删除计划"${planName}"吗？此操作不可撤销，将删除该计划的所有数据（任务、记录等）。`)) {
      await window.electronAPI.deletePlan(planId)
      loadPlans()
      onPlanChange()
    }
  }

  const handleExportMarkdown = async () => {
    if (!activePlan) return
    const markdown = await window.electronAPI.exportToMarkdown(activePlan.id)
    
    // 创建下载链接
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activePlan.name}-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportJSON = async () => {
    if (!activePlan) return
    const json = await window.electronAPI.exportToJSON(activePlan.id)
    
    // 创建下载链接
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activePlan.name}-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDashboardViewChange = (view: 'stats' | 'heatmap') => {
    setDefaultDashboardView(view)
    localStorage.setItem('defaultDashboardView', view)
  }

  const handleHistoryViewChange = (view: 'list' | 'calendar') => {
    setDefaultHistoryView(view)
    localStorage.setItem('defaultHistoryView', view)
  }

  const activePlans = plans.filter(p => p.status === 'active')
  const archivedPlans = plans.filter(p => p.status === 'archived')
  
  // 将当前激活的计划和其他活动计划分开
  const otherActivePlans = activePlans.filter(p => p.id !== activePlan?.id)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">设置</h1>

      {/* 计划管理 */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">计划管理</h2>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
          >
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建新计划
            </span>
          </button>
        </div>

        {/* 当前激活的计划 - 突出显示 */}
        {activePlan && (
          <div className="mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
              {/* 装饰性背景 */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
              
              <div className="relative">
                {/* 标题和标签 */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 bg-white bg-opacity-20 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                        ⭐ 当前活动计划
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold">{activePlan.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingPlan(activePlan)
                        setEditInitialHours(formatHours(activePlan.initial_hours))
                        setEditCreatedAt(activePlan.created_at.split(' ')[0])
                        setEditDeadline(activePlan.deadline || '')
                      }}
                      className="px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-lg hover:bg-opacity-30 transition-all"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleArchivePlan(activePlan)}
                      className="px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm text-white rounded-lg hover:bg-opacity-30 transition-all"
                    >
                      归档
                    </button>
                  </div>
                </div>

                {/* 时间信息 */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xs text-blue-100 mb-1">初始时间</div>
                    <div className="text-xl font-bold">{formatHours(activePlan.initial_hours)}</div>
                  </div>
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xs text-blue-100 mb-1">剩余时间</div>
                    <div className="text-xl font-bold">{formatHours(activePlan.current_hours)}</div>
                  </div>
                  <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3">
                    <div className="text-xs text-blue-100 mb-1">使用进度</div>
                    <div className="text-xl font-bold">
                      {Math.round((1 - activePlan.current_hours / activePlan.initial_hours) * 100)}%
                    </div>
                  </div>
                </div>

                {/* 进度条 */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-blue-100 mb-2">
                    <span>已使用</span>
                    <span>{formatHours(activePlan.initial_hours - activePlan.current_hours)} / {formatHours(activePlan.initial_hours)}</span>
                  </div>
                  <div className="h-2 bg-white bg-opacity-20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white bg-opacity-80 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (1 - activePlan.current_hours / activePlan.initial_hours) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                {/* 创建时间 */}
                <div className="text-xs text-blue-100">
                  创建于 {new Date(activePlan.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 其他活动计划 - 默认显示3个，超出可折叠 */}
        {otherActivePlans.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
            <div className="p-4 space-y-2">
              {/* 前3个计划，始终显示 */}
              {otherActivePlans.slice(0, 3).map((plan) => (
                <div
                  key={plan.id}
                  className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{plan.name}</h4>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {formatHours(plan.current_hours)} / {formatHours(plan.initial_hours)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(plan.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleSwitchPlan(plan.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                    >
                      切换
                    </button>
                    <button
                      onClick={() => handleArchivePlan(plan)}
                      className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-white transition-colors"
                    >
                      归档
                    </button>
                  </div>
                </div>
              ))}

              {/* 展开/收起更多 */}
              {otherActivePlans.length > 3 && (
                <>
                  {showOtherPlans && otherActivePlans.slice(3).map((plan) => (
                    <div
                      key={plan.id}
                      className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">{plan.name}</h4>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {formatHours(plan.current_hours)} / {formatHours(plan.initial_hours)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(plan.created_at).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleSwitchPlan(plan.id)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                        >
                          切换
                        </button>
                        <button
                          onClick={() => handleArchivePlan(plan)}
                          className="px-3 py-1.5 border border-gray-300 text-gray-600 text-sm rounded-md hover:bg-white transition-colors"
                        >
                          归档
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => setShowOtherPlans(!showOtherPlans)}
                    className="w-full py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <span>{showOtherPlans ? '收起' : `展开更多 (${otherActivePlans.length - 3})`}</span>
                    <svg 
                      className={`w-4 h-4 transition-transform ${showOtherPlans ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* 无活动计划提示 */}
        {activePlans.length === 0 && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无活动计划</h3>
            <p className="text-gray-600 mb-4">创建你的第一个计划，开始记录森林时间</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              创建新计划
            </button>
          </div>
        )}

        {/* 归档计划 - 可折叠 */}
        {archivedPlans.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
            {/* 折叠标题栏 */}
            <button
              onClick={() => setShowArchivedPlans(!showArchivedPlans)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                <span className="text-sm font-medium text-gray-700">归档计划</span>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {archivedPlans.length}
                </span>
              </div>
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform ${showArchivedPlans ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 展开内容 */}
            {showArchivedPlans && (
              <div className="border-t border-gray-100">
                {/* 已完成的计划 */}
                {archivedPlans.filter(p => p.archive_reason === 'completed').length > 0 && (
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">✓ 已完成</span>
                    </div>
                    <div className="space-y-2">
                      {archivedPlans.filter(p => p.archive_reason === 'completed').map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{plan.name}</h4>
                            <div className="text-xs text-gray-600 mt-1">
                              {formatHours(plan.initial_hours)} → {formatHours(plan.current_hours)} · 
                              归档于 {plan.archived_at ? new Date(plan.archived_at).toLocaleDateString('zh-CN') : '未知'}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleRestorePlan(plan.id)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                            >
                              恢复
                            </button>
                            <button
                              onClick={() => handleDeletePlan(plan.id, plan.name)}
                              className="px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded-md hover:bg-red-50 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 已搁置的计划 */}
                {archivedPlans.filter(p => p.archive_reason === 'suspended').length > 0 && (
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-orange-700 bg-orange-50 px-2 py-1 rounded">⏸ 已搁置</span>
                    </div>
                    <div className="space-y-2">
                      {archivedPlans.filter(p => p.archive_reason === 'suspended').map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{plan.name}</h4>
                            <div className="text-xs text-gray-600 mt-1">
                              {formatHours(plan.initial_hours)} → {formatHours(plan.current_hours)} · 
                              归档于 {plan.archived_at ? new Date(plan.archived_at).toLocaleDateString('zh-CN') : '未知'}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleRestorePlan(plan.id)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                            >
                              恢复
                            </button>
                            <button
                              onClick={() => handleDeletePlan(plan.id, plan.name)}
                              className="px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded-md hover:bg-red-50 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 未分类的归档计划（旧数据兜底） */}
                {archivedPlans.filter(p => !p.archive_reason).length > 0 && (
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded">📦 其他归档</span>
                    </div>
                    <div className="space-y-2">
                      {archivedPlans.filter(p => !p.archive_reason).map((plan) => (
                        <div
                          key={plan.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">{plan.name}</h4>
                            <div className="text-xs text-gray-600 mt-1">
                              {formatHours(plan.initial_hours)} → {formatHours(plan.current_hours)} · 
                              归档于 {plan.archived_at ? new Date(plan.archived_at).toLocaleDateString('zh-CN') : '未知'}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleRestorePlan(plan.id)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                            >
                              恢复
                            </button>
                            <button
                              onClick={() => handleDeletePlan(plan.id, plan.name)}
                              className="px-3 py-1.5 border border-red-300 text-red-600 text-xs rounded-md hover:bg-red-50 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 界面设置 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">界面设置</h2>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="space-y-4">
            {/* 仪表盘默认视图 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                仪表盘默认视图
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleDashboardViewChange('stats')}
                  className={`px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${
                    defaultDashboardView === 'stats'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  📊 统计视图
                </button>
                <button
                  onClick={() => handleDashboardViewChange('heatmap')}
                  className={`px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${
                    defaultDashboardView === 'heatmap'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  🔥 热力图
                </button>
              </div>
            </div>

            {/* 历史界面默认视图 */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                历史界面默认视图
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleHistoryViewChange('list')}
                  className={`px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${
                    defaultHistoryView === 'list'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  📋 列表视图
                </button>
                <button
                  onClick={() => handleHistoryViewChange('calendar')}
                  className={`px-4 py-2.5 rounded-lg border transition-all text-sm font-medium ${
                    defaultHistoryView === 'calendar'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  📅 日历视图
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 开发工具 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">开发工具</h2>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-600 mb-4">
            创建测试计划用于测试和演示
          </p>
          <button
            onClick={async () => {
              try {
                const testPlan = await window.electronAPI.createTestData()
                alert(`✅ 测试数据创建成功！\n\n计划名称：${testPlan.name}\n初始时间：${testPlan.initial_hours} 小时\n截止日期：${testPlan.deadline}\n\n包含：\n• 5个测试任务\n• 30天历史记录\n\n请刷新页面查看`)
                loadPlans()
              } catch (error: any) {
                alert('❌ 创建测试数据失败：' + error.message)
              }
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <span>🧪</span>
            创建测试计划
          </button>
        </div>
      </section>

      {/* 数据导出 */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">数据导出</h2>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <p className="text-gray-600 mb-4">
            {activePlan ? `导出 "${activePlan.name}" 的数据` : '请先选择一个活动计划'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleExportMarkdown}
              disabled={!activePlan}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              导出为 Markdown
            </button>
            <button
              onClick={handleExportJSON}
              disabled={!activePlan}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              导出为 JSON
            </button>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-semibold text-gray-900 mb-2">导出说明</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Markdown 格式：适合阅读和打印，格式类似您的笔记</li>
              <li>• JSON 格式：完整的数据备份，可用于数据迁移</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 关于 */}
      <section>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">关于</h2>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">森记 v1.0.0</h3>
          <p className="text-gray-600 mb-4">
            一款简约高效的时间统计应用，帮助你完成森林时间挑战。
          </p>
          <div className="text-sm text-gray-500">
            <p>© 2025 森记. All rights reserved.</p>
          </div>
        </div>
      </section>

      {/* 创建计划对话框 */}
      {showCreateDialog && (
        <CreatePlanDialog
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false)
            loadPlans()
            onPlanChange()
          }}
        />
      )}

      {/* 归档选择对话框 */}
      {archivingPlan && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setArchivingPlan(null)}
        >
          <div 
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-2">归档计划</h2>
            <p className="text-sm text-gray-600 mb-6">
              请选择归档原因，这将帮助你更好地管理计划。
            </p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => confirmArchivePlan('completed')}
                className="w-full p-4 border-2 border-green-200 bg-green-50 rounded-lg hover:border-green-400 hover:bg-green-100 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center text-green-700 text-xl">
                    ✓
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">已完成</div>
                    <div className="text-xs text-gray-600">计划目标已达成，圆满完成</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => confirmArchivePlan('suspended')}
                className="w-full p-4 border-2 border-orange-200 bg-orange-50 rounded-lg hover:border-orange-400 hover:bg-orange-100 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center text-orange-700 text-xl">
                    ⏸
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">已搁置</div>
                    <div className="text-xs text-gray-600">暂时中止，可能将来恢复</div>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => setArchivingPlan(null)}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 编辑计划对话框 */}
      {editingPlan && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setEditingPlan(null)}
        >
          <div 
            className="bg-white rounded-xl p-6 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">编辑计划</h2>
            <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-lg">
              <div className="font-semibold mb-1">⚠️ 警告</div>
              <div>修改计划的初始时间和创建时间将影响所有历史记录的计算。请谨慎操作！</div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  初始时间
                </label>
                <TimeInput value={editInitialHours} onChange={setEditInitialHours} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  创建日期
                </label>
                <input
                  type="date"
                  value={editCreatedAt}
                  onChange={(e) => setEditCreatedAt(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  挑战截止日期
                  <span className="text-xs text-gray-500 font-normal">（可选）</span>
                </label>
                <input
                  type="date"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
                  <span className="text-purple-600">🐰</span>
                  设置后将启用配速员功能，帮助你按进度完成挑战
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (confirm('确定要修改计划的初始数据吗？这将影响所有历史记录的计算')) {
                    handleUpdatePlanDetails()
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                确认修改
              </button>
              <button
                onClick={() => setEditingPlan(null)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface CreatePlanDialogProps {
  onClose: () => void
  onSuccess: () => void
}

function CreatePlanDialog({ onClose, onSuccess }: CreatePlanDialogProps) {
  const [name, setName] = useState('')
  const [initialTime, setInitialTime] = useState('1000:00')
  const [deadline, setDeadline] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const initialHours = parseHours(initialTime)
    if (!name.trim() || initialHours <= 0) {
      alert('请填写计划名称和有效的初始时间')
      return
    }

    await window.electronAPI.createPlan(name, initialHours, deadline || null)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">创建新计划</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              计划名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="例如：森林一号计划"
              autoFocus
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              初始时间
            </label>
            <TimeInput
              value={initialTime}
              onChange={(value) => setInitialTime(value)}
              placeholder="1000:00"
            />
            <p className="text-sm text-gray-500 mt-3">
              设置计划的初始时间，例如 1000 小时
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              挑战截止日期
              <span className="text-xs text-gray-500 font-normal">（可选）</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="text-purple-600">🐰</span>
              设置后将启用配速员功能，帮助你按进度完成挑战
            </p>
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
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

