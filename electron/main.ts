const electron = require('electron')
const { app, BrowserWindow, ipcMain } = electron
const path = require('path')
const Database = require('better-sqlite3')
import { 
  initDatabase, 
  getAllPlans, 
  createPlan, 
  updatePlan,
  getActivePlan,
  setActivePlan,
  archivePlan,
  restorePlan,
  deletePlan,
  updatePlanDetails,
  getAllRewardTasks,
  getAllRewardTasksWithCompletionStatus,
  createRewardTask,
  updateRewardTask,
  deleteRewardTask,
  completeRewardTask,
  uncompleteRewardTask,
  getDailyRecords,
  createDailyRecord,
  updateDailyRecord,
  getRecordsByDateRange,
  exportToMarkdown,
  exportToJSON,
  getDailyRecordByDate,
  recalculateAllRecords,
  createTestData
} from './database'

// __dirname is available in CommonJS, no need to derive it

let mainWindow: BrowserWindow | null = null
let db: Database.Database | null = null

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: '森记',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  // 开发模式加载 Vite 服务器
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  // 初始化数据库
  const dbPath = path.join(app.getPath('userData'), 'forest-timer.db')
  db = new Database(dbPath)
  initDatabase(db)

  // 注册 IPC 处理器
  registerIpcHandlers()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (db) {
    db.close()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function registerIpcHandlers() {
  // 计划管理
  ipcMain.handle('get-all-plans', () => getAllPlans(db!))
  ipcMain.handle('get-active-plan', () => getActivePlan(db!))
  ipcMain.handle('create-plan', (_, name: string, initialHours: number, deadline?: string | null) => 
    createPlan(db!, name, initialHours, deadline))
  ipcMain.handle('update-plan', (_, id: number, updates: any) => 
    updatePlan(db!, id, updates))
  ipcMain.handle('set-active-plan', (_, id: number) => 
    setActivePlan(db!, id))
  ipcMain.handle('archive-plan', (_, id: number, reason: 'completed' | 'suspended') => 
    archivePlan(db!, id, reason))
  ipcMain.handle('restore-plan', (_, id: number) => 
    restorePlan(db!, id))
  ipcMain.handle('delete-plan', (_, id: number) => 
    deletePlan(db!, id))
  ipcMain.handle('update-plan-details', (_, id: number, initialHours: number, createdAt: string) =>
    updatePlanDetails(db!, id, initialHours, createdAt))
  ipcMain.handle('recalculate-all-records', (_, planId: number) => {
    recalculateAllRecords(db!, planId)
  })

  // 创建测试数据
  ipcMain.handle('create-test-data', () =>
    createTestData(db!))

  // 奖励任务
  ipcMain.handle('get-reward-tasks', (_, planId: number) => 
    getAllRewardTasks(db!, planId))
  ipcMain.handle('get-reward-tasks-with-status', (_, planId: number) => 
    getAllRewardTasksWithCompletionStatus(db!, planId))
  ipcMain.handle('create-reward-task', (_, planId: number, name: string, rewardHours: number) =>
    createRewardTask(db!, planId, name, rewardHours))
  ipcMain.handle('update-reward-task', (_, id: number, updates: any) =>
    updateRewardTask(db!, id, updates))
  ipcMain.handle('delete-reward-task', (_, id: number) =>
    deleteRewardTask(db!, id))
  ipcMain.handle('complete-reward-task', (_, taskId: number, date: string) =>
    completeRewardTask(db!, taskId, date))
  ipcMain.handle('uncomplete-reward-task', (_, taskId: number, date: string) =>
    uncompleteRewardTask(db!, taskId, date))

  // 每日记录
  ipcMain.handle('get-daily-records', (_, planId: number, limit?: number) =>
    getDailyRecords(db!, planId, limit))
  ipcMain.handle('get-daily-record-by-date', (_, planId: number, date: string) =>
    getDailyRecordByDate(db!, planId, date))
  ipcMain.handle('create-daily-record', (_, planId: number, date: string, focusHours: number, isConfirmed?: boolean) =>
    createDailyRecord(db!, planId, date, focusHours, isConfirmed))
  ipcMain.handle('update-daily-record', (_, id: number, focusHours: number) =>
    updateDailyRecord(db!, id, focusHours))
  ipcMain.handle('get-records-by-date-range', (_, planId: number, startDate: string, endDate: string) =>
    getRecordsByDateRange(db!, planId, startDate, endDate))

  // 导出功能
  ipcMain.handle('export-to-markdown', (_, planId: number) =>
    exportToMarkdown(db!, planId))
  ipcMain.handle('export-to-json', (_, planId: number) =>
    exportToJSON(db!, planId))
}

