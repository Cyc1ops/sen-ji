// 浏览器环境下的 Electron API Mock
// 用于在 Vite 开发服务器中调试

import { ElectronAPI, Plan, DailyRecord, RewardTask } from './types'

// 扩展Plan接口以支持is_current字段（仅用于mock）
interface MockPlan extends Plan {
  is_current?: boolean
}

// 模拟数据存储
const mockStorage = {
  plans: [] as MockPlan[],
  records: [] as DailyRecord[],
  tasks: [] as RewardTask[]
}

// 初始化一些示例数据
const initMockData = () => {
  const now = new Date()
  const planStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
  
  const mockPlan: MockPlan = {
    id: 1,
    name: '示例计划',
    initial_hours: 100,
    current_hours: 60,
    status: 'active',
    created_at: planStartDate.toISOString().split('T')[0],
    archived_at: null,
    is_current: true
  }
  
  mockStorage.plans = [mockPlan]
  
  // 创建一些示例记录
  for (let i = 0; i < 30; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    
    const focusHours = Math.random() * 8
    const rewardHours = Math.random() * 2
    const remaining = 100 - (i + 1) * 1.5
    
    mockStorage.records.push({
      id: i + 1,
      plan_id: 1,
      date: dateStr,
      focus_hours: focusHours,
      remaining_hours: remaining > 0 ? remaining : 0,
      created_at: dateStr,
      is_confirmed: focusHours > 0 ? 1 : 0,
      completed_tasks: [
        {
          id: i * 10 + 1,
          daily_record_id: i + 1,
          reward_task_id: 1,
          reward_task_name: '示例任务',
          reward_hours: rewardHours,
          completed_at: dateStr
        }
      ]
    })
  }
  
  // 创建一些示例任务
  mockStorage.tasks = [
    {
      id: 1,
      plan_id: 1,
      name: '完成项目文档',
      reward_hours: 0.5,
      is_active: 1,
      created_at: new Date().toISOString().split('T')[0]
    },
    {
      id: 2,
      plan_id: 1,
      name: '代码审查',
      reward_hours: 0.75,
      is_active: 1,
      created_at: new Date().toISOString().split('T')[0]
    },
    {
      id: 3,
      plan_id: 1,
      name: '修复bug',
      reward_hours: 1.0,
      is_active: 1,
      created_at: new Date().toISOString().split('T')[0]
    }
  ]
}

initMockData()

export const mockElectronAPI: ElectronAPI = {
  // Plans
  getActivePlan: async () => mockStorage.plans.find(p => p.is_current) || null,
  
  getAllPlans: async () => mockStorage.plans,
  
  createPlan: async (name: string, initialHours: number) => {
    const newPlan: MockPlan = {
      id: mockStorage.plans.length + 1,
      name,
      initial_hours: initialHours,
      current_hours: initialHours,
      status: 'active',
      created_at: new Date().toISOString().split('T')[0],
      archived_at: null,
      is_current: true
    }
    mockStorage.plans = mockStorage.plans.map(p => ({ ...p, is_current: false }))
    mockStorage.plans.push(newPlan)
    return newPlan
  },

  updatePlan: async (planId: number, updates: Partial<Plan>) => {
    const plan = mockStorage.plans.find(p => p.id === planId)
    if (!plan) return null as any
    
    const updatedPlan = { ...plan, ...updates }
    mockStorage.plans = mockStorage.plans.map(p => 
      p.id === planId ? updatedPlan : p
    )
    return updatedPlan
  },
  
  setActivePlan: async (planId: number) => {
    mockStorage.plans = mockStorage.plans.map(p => ({
      ...p,
      is_current: p.id === planId
    }))
    return mockStorage.plans.find(p => p.id === planId)!
  },
  
  archivePlan: async (planId: number, reason: 'completed' | 'suspended') => {
    mockStorage.plans = mockStorage.plans.map(p =>
      p.id === planId ? { ...p, status: 'archived' as const, archive_reason: reason, archived_at: new Date().toISOString(), is_current: false } : p
    )
    return mockStorage.plans.find(p => p.id === planId)!
  },
  
  restorePlan: async (planId: number) => {
    mockStorage.plans = mockStorage.plans.map(p =>
      p.id === planId ? { ...p, status: 'active' as const, archive_reason: undefined, archived_at: null } : p
    )
    return mockStorage.plans.find(p => p.id === planId)!
  },
  
  deletePlan: async (planId: number) => {
    mockStorage.plans = mockStorage.plans.filter(p => p.id !== planId)
    mockStorage.tasks = mockStorage.tasks.filter(t => t.plan_id !== planId)
    mockStorage.records = mockStorage.records.filter(r => r.plan_id !== planId)
  },
  
  updatePlanDetails: async (planId: number, initialHours: number, createdAt: string) => {
    mockStorage.plans = mockStorage.plans.map(p =>
      p.id === planId ? { ...p, initial_hours: initialHours, created_at: createdAt } : p
    )
    return mockStorage.plans.find(p => p.id === planId)!
  },
  
  // Daily Records
  getDailyRecords: async (planId: number, limit?: number) => {
    const records = mockStorage.records.filter(r => r.plan_id === planId)
    return limit ? records.slice(0, limit) : records
  },
  
  getDailyRecordByDate: async (planId: number, date: string) => {
    return mockStorage.records.find(r => r.plan_id === planId && r.date === date) || null
  },
  
  getRecordsByDateRange: async (planId: number, startDate: string, endDate: string) => {
    return mockStorage.records.filter(r => 
      r.plan_id === planId && r.date >= startDate && r.date <= endDate
    )
  },
  
  createDailyRecord: async (planId: number, date: string, focusHours: number, isConfirmed?: boolean) => {
    // 如果记录了专注时间（>0），自动标记为已确认
    const confirmed = focusHours > 0 ? 1 : (isConfirmed ? 1 : 0)
    
    const newRecord: DailyRecord = {
      id: mockStorage.records.length + 1,
      plan_id: planId,
      date,
      focus_hours: focusHours,
      remaining_hours: 0,
      created_at: date,
      is_confirmed: confirmed,
      completed_tasks: []
    }
    mockStorage.records.push(newRecord)
    return newRecord
  },
  
  updateDailyRecord: async (recordId: number, focusHours: number) => {
    mockStorage.records = mockStorage.records.map(r =>
      r.id === recordId ? { ...r, focus_hours: focusHours } : r
    )
    return mockStorage.records.find(r => r.id === recordId)!
  },
  
  // Reward Tasks
  getRewardTasks: async (planId: number) => {
    return mockStorage.tasks.filter(t => t.plan_id === planId)
  },
  
  getRewardTasksWithStatus: async (planId: number) => {
    return mockStorage.tasks.filter(t => t.plan_id === planId).map(t => ({
      ...t,
      last_completed_date: undefined
    }))
  },
  
  createRewardTask: async (planId: number, name: string, rewardHours: number) => {
    const newTask: RewardTask = {
      id: mockStorage.tasks.length + 1,
      plan_id: planId,
      name,
      reward_hours: rewardHours,
      is_active: 1,
      created_at: new Date().toISOString().split('T')[0]
    }
    mockStorage.tasks.push(newTask)
    return newTask
  },
  
  updateRewardTask: async (taskId: number, updates: Partial<RewardTask>) => {
    mockStorage.tasks = mockStorage.tasks.map(t =>
      t.id === taskId ? { ...t, ...updates } : t
    )
    return mockStorage.tasks.find(t => t.id === taskId)!
  },
  
  deleteRewardTask: async (taskId: number) => {
    mockStorage.tasks = mockStorage.tasks.filter(t => t.id !== taskId)
  },
  
  completeRewardTask: async (taskId: number, date: string) => {
    const task = mockStorage.tasks.find(t => t.id === taskId)
    if (!task) return null as any
    
    const completedTask = {
      id: Date.now(),
      daily_record_id: 0, // Mock中不需要真实的记录ID
      reward_task_id: taskId,
      reward_task_name: task.name,
      reward_hours: task.reward_hours,
      completed_at: date
    }
    
    return completedTask
  },
  
  uncompleteRewardTask: async (taskId: number, date: string) => {
    // Mock implementation
  },
  
  recalculateAllRecords: async (planId: number) => {
    // Mock implementation
  },

  // Export functions
  exportToMarkdown: async (planId: number) => {
    const plan = mockStorage.plans.find(p => p.id === planId)
    const records = mockStorage.records.filter(r => r.plan_id === planId)
    
    let markdown = `# ${plan?.name || '计划'}\n\n`
    markdown += `初始时间: ${plan?.initial_hours || 0} 小时\n`
    markdown += `剩余时间: ${plan?.current_hours || 0} 小时\n\n`
    markdown += `## 记录\n\n`
    
    records.forEach(record => {
      markdown += `### ${record.date}\n`
      markdown += `- 专注时间: ${record.focus_hours.toFixed(2)} 小时\n`
      markdown += `- 剩余时间: ${record.remaining_hours.toFixed(2)} 小时\n\n`
    })
    
    return markdown
  },

  exportToJSON: async (planId: number) => {
    const plan = mockStorage.plans.find(p => p.id === planId)
    const records = mockStorage.records.filter(r => r.plan_id === planId)
    const tasks = mockStorage.tasks.filter(t => t.plan_id === planId)
    
    const data = {
      plan,
      records,
      tasks
    }
    
    return JSON.stringify(data, null, 2)
  }
}

// 在浏览器环境中注入 mock API
if (typeof window !== 'undefined' && !window.electronAPI) {
  (window as any).electronAPI = mockElectronAPI
}

