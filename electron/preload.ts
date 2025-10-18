import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 计划管理
  getAllPlans: () => ipcRenderer.invoke('get-all-plans'),
  getActivePlan: () => ipcRenderer.invoke('get-active-plan'),
  createPlan: (name: string, initialHours: number, deadline?: string | null) => 
    ipcRenderer.invoke('create-plan', name, initialHours, deadline),
  updatePlan: (id: number, updates: any) => 
    ipcRenderer.invoke('update-plan', id, updates),
  setActivePlan: (id: number) => 
    ipcRenderer.invoke('set-active-plan', id),
  archivePlan: (id: number, reason: 'completed' | 'suspended') => 
    ipcRenderer.invoke('archive-plan', id, reason),
  restorePlan: (id: number) => 
    ipcRenderer.invoke('restore-plan', id),
  deletePlan: (id: number) => 
    ipcRenderer.invoke('delete-plan', id),
  updatePlanDetails: (id: number, initialHours: number, createdAt: string) =>
    ipcRenderer.invoke('update-plan-details', id, initialHours, createdAt),
  recalculateAllRecords: (planId: number) =>
    ipcRenderer.invoke('recalculate-all-records', planId),
  
  // 测试数据
  createTestData: () =>
    ipcRenderer.invoke('create-test-data'),

  // 奖励任务
  getRewardTasks: (planId: number) => 
    ipcRenderer.invoke('get-reward-tasks', planId),
  getRewardTasksWithStatus: (planId: number) => 
    ipcRenderer.invoke('get-reward-tasks-with-status', planId),
  createRewardTask: (planId: number, name: string, rewardHours: number) =>
    ipcRenderer.invoke('create-reward-task', planId, name, rewardHours),
  updateRewardTask: (id: number, updates: any) =>
    ipcRenderer.invoke('update-reward-task', id, updates),
  deleteRewardTask: (id: number) =>
    ipcRenderer.invoke('delete-reward-task', id),
  completeRewardTask: (taskId: number, date: string) =>
    ipcRenderer.invoke('complete-reward-task', taskId, date),
  uncompleteRewardTask: (taskId: number, date: string) =>
    ipcRenderer.invoke('uncomplete-reward-task', taskId, date),

  // 每日记录
  getDailyRecords: (planId: number, limit?: number) =>
    ipcRenderer.invoke('get-daily-records', planId, limit),
  getDailyRecordByDate: (planId: number, date: string) =>
    ipcRenderer.invoke('get-daily-record-by-date', planId, date),
  createDailyRecord: (planId: number, date: string, focusHours: number, isConfirmed?: boolean) =>
    ipcRenderer.invoke('create-daily-record', planId, date, focusHours, isConfirmed),
  updateDailyRecord: (id: number, focusHours: number) =>
    ipcRenderer.invoke('update-daily-record', id, focusHours),
  getRecordsByDateRange: (planId: number, startDate: string, endDate: string) =>
    ipcRenderer.invoke('get-records-by-date-range', planId, startDate, endDate),

  // 导出功能
  exportToMarkdown: (planId: number) =>
    ipcRenderer.invoke('export-to-markdown', planId),
  exportToJSON: (planId: number) =>
    ipcRenderer.invoke('export-to-json', planId)
})

