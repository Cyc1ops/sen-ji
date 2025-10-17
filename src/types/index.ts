export interface Plan {
  id: number
  name: string
  initial_hours: number
  current_hours: number
  status: 'active' | 'archived'
  archive_reason?: 'completed' | 'suspended'  // 归档原因：已完成 或 已搁置
  created_at: string
  archived_at: string | null
}

export interface RewardTask {
  id: number
  plan_id: number
  name: string
  reward_hours: number
  is_active: number
  created_at: string
}

export interface DailyRecord {
  id: number
  plan_id: number
  date: string
  focus_hours: number
  remaining_hours: number
  created_at: string
  is_confirmed: number  // 是否已确认（0=未确认，1=已确认）
  completed_tasks?: CompletedTask[]
}

export interface CompletedTask {
  id: number
  daily_record_id: number
  reward_task_id: number
  reward_task_name: string
  reward_hours: number
  completed_at: string
}

export interface ElectronAPI {
  // 计划管理
  getAllPlans: () => Promise<Plan[]>
  getActivePlan: () => Promise<Plan | null>
  createPlan: (name: string, initialHours: number) => Promise<Plan>
  updatePlan: (id: number, updates: Partial<Plan>) => Promise<Plan>
  setActivePlan: (id: number) => Promise<Plan>
  archivePlan: (id: number, reason: 'completed' | 'suspended') => Promise<Plan>
  restorePlan: (id: number) => Promise<Plan>
  deletePlan: (id: number) => Promise<void>
  updatePlanDetails: (id: number, initialHours: number, createdAt: string) => Promise<Plan>
  recalculateAllRecords: (planId: number) => Promise<void>

  // 奖励任务
  getRewardTasks: (planId: number) => Promise<RewardTask[]>
  getRewardTasksWithStatus: (planId: number) => Promise<Array<RewardTask & { last_completed_date?: string }>>
  createRewardTask: (planId: number, name: string, rewardHours: number) => Promise<RewardTask>
  updateRewardTask: (id: number, updates: Partial<RewardTask>) => Promise<RewardTask>
  deleteRewardTask: (id: number) => Promise<void>
  completeRewardTask: (taskId: number, date: string) => Promise<CompletedTask>
  uncompleteRewardTask: (taskId: number, date: string) => Promise<void>

  // 每日记录
  getDailyRecords: (planId: number, limit?: number) => Promise<DailyRecord[]>
  getDailyRecordByDate: (planId: number, date: string) => Promise<DailyRecord | null>
  createDailyRecord: (planId: number, date: string, focusHours: number, isConfirmed?: boolean) => Promise<DailyRecord>
  updateDailyRecord: (id: number, focusHours: number) => Promise<DailyRecord>
  getRecordsByDateRange: (planId: number, startDate: string, endDate: string) => Promise<DailyRecord[]>

  // 导出功能
  exportToMarkdown: (planId: number) => Promise<string>
  exportToJSON: (planId: number) => Promise<string>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

