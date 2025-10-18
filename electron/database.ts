import Database from 'better-sqlite3'
import type { Plan, RewardTask, DailyRecord, CompletedTask } from '../src/types'

// 重新导出类型供其他electron模块使用
export type { Plan, RewardTask, DailyRecord, CompletedTask }

export function initDatabase(db: Database.Database) {
  // 创建计划表
  db.exec(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      initial_hours REAL NOT NULL,
      current_hours REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      is_current INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      archived_at TEXT
    )
  `)

  // 数据库迁移：为现有表添加 is_current 字段
  try {
    db.exec(`ALTER TABLE plans ADD COLUMN is_current INTEGER NOT NULL DEFAULT 0`)
  } catch (error) {
    // 字段已存在，忽略错误
  }

  // 数据库迁移：为 plans 表添加 archive_reason 字段
  try {
    db.exec(`ALTER TABLE plans ADD COLUMN archive_reason TEXT`)
  } catch (error) {
    // 字段已存在，忽略错误
  }

  // 数据库迁移：为 plans 表添加 deadline 字段
  try {
    db.exec(`ALTER TABLE plans ADD COLUMN deadline TEXT`)
  } catch (error) {
    // 字段已存在，忽略错误
  }

  // 创建奖励任务表
  db.exec(`
    CREATE TABLE IF NOT EXISTS reward_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      reward_hours REAL NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    )
  `)

  // 创建每日记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      focus_hours REAL NOT NULL,
      remaining_hours REAL NOT NULL,
      is_confirmed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      UNIQUE(plan_id, date),
      FOREIGN KEY (plan_id) REFERENCES plans(id)
    )
  `)

  // 数据库迁移：为现有表添加 is_confirmed 字段
  try {
    db.exec(`ALTER TABLE daily_records ADD COLUMN is_confirmed INTEGER NOT NULL DEFAULT 0`)
  } catch (error) {
    // 字段已存在，忽略错误
  }
  
  // 无论字段是新添加还是已存在，都执行数据修复
  try {
    const fixStmt = db.prepare(`UPDATE daily_records SET is_confirmed = 1 WHERE focus_hours > 0 AND is_confirmed = 0`)
    fixStmt.run()
  } catch (error) {
    // 数据修复失败，静默处理
  }

  // 创建完成任务记录表
  db.exec(`
    CREATE TABLE IF NOT EXISTS completed_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      daily_record_id INTEGER NOT NULL,
      reward_task_id INTEGER NOT NULL,
      reward_task_name TEXT NOT NULL,
      reward_hours REAL NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (daily_record_id) REFERENCES daily_records(id),
      FOREIGN KEY (reward_task_id) REFERENCES reward_tasks(id)
    )
  `)
}

// ==================== 计划管理 ====================

export function getAllPlans(db: Database.Database): Plan[] {
  const stmt = db.prepare('SELECT * FROM plans ORDER BY created_at DESC')
  return stmt.all() as Plan[]
}

export function getActivePlan(db: Database.Database): Plan | null {
  // 先尝试获取标记为当前的计划
  let stmt = db.prepare('SELECT * FROM plans WHERE status = ? AND is_current = 1 LIMIT 1')
  let plan = stmt.get('active') as Plan | null
  
  // 如果没有标记为当前的计划，返回最新的活动计划
  if (!plan) {
    stmt = db.prepare('SELECT * FROM plans WHERE status = ? ORDER BY created_at DESC LIMIT 1')
    plan = stmt.get('active') as Plan | null
    
    // 如果找到计划，自动设置为当前计划
    if (plan) {
      setActivePlan(db, plan.id)
    }
  }
  
  return plan
}

export function createPlan(db: Database.Database, name: string, initialHours: number, deadline?: string | null): Plan {
  const stmt = db.prepare(`
    INSERT INTO plans (name, initial_hours, current_hours, status, is_current, deadline)
    VALUES (?, ?, ?, 'active', 1, ?)
  `)
  const result = stmt.run(name, initialHours, initialHours, deadline || null)
  
  // 将其他所有计划的 is_current 设为 0
  db.prepare('UPDATE plans SET is_current = 0 WHERE id != ?').run(result.lastInsertRowid)
  
  const getStmt = db.prepare('SELECT * FROM plans WHERE id = ?')
  return getStmt.get(result.lastInsertRowid) as Plan
}

export function updatePlan(db: Database.Database, id: number, updates: Partial<Plan>): Plan {
  const fields: string[] = []
  const values: any[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.current_hours !== undefined) {
    fields.push('current_hours = ?')
    values.push(updates.current_hours)
  }
  if (updates.status !== undefined) {
    fields.push('status = ?')
    values.push(updates.status)
  }
  if (updates.deadline !== undefined) {
    fields.push('deadline = ?')
    values.push(updates.deadline)
  }

  values.push(id)
  
  const stmt = db.prepare(`UPDATE plans SET ${fields.join(', ')} WHERE id = ?`)
  stmt.run(...values)

  const getStmt = db.prepare('SELECT * FROM plans WHERE id = ?')
  return getStmt.get(id) as Plan
}

export function archivePlan(db: Database.Database, id: number, reason: 'completed' | 'suspended' = 'suspended'): Plan {
  const stmt = db.prepare(`
    UPDATE plans 
    SET status = 'archived', archive_reason = ?, archived_at = datetime('now', 'localtime'), is_current = 0
    WHERE id = ?
  `)
  stmt.run(reason, id)

  const getStmt = db.prepare('SELECT * FROM plans WHERE id = ?')
  return getStmt.get(id) as Plan
}

export function restorePlan(db: Database.Database, id: number): Plan {
  const stmt = db.prepare(`
    UPDATE plans 
    SET status = 'active', archive_reason = NULL, archived_at = NULL
    WHERE id = ?
  `)
  stmt.run(id)

  const getStmt = db.prepare('SELECT * FROM plans WHERE id = ?')
  return getStmt.get(id) as Plan
}

export function deletePlan(db: Database.Database, id: number): void {
  // 删除计划相关的所有数据
  db.prepare('DELETE FROM completed_tasks WHERE daily_record_id IN (SELECT id FROM daily_records WHERE plan_id = ?)').run(id)
  db.prepare('DELETE FROM daily_records WHERE plan_id = ?').run(id)
  db.prepare('DELETE FROM reward_tasks WHERE plan_id = ?').run(id)
  db.prepare('DELETE FROM plans WHERE id = ?').run(id)
}

export function updatePlanDetails(
  db: Database.Database,
  id: number,
  initialHours: number,
  createdAt: string
): Plan {
  const stmt = db.prepare(`
    UPDATE plans 
    SET initial_hours = ?, created_at = ?
    WHERE id = ?
  `)
  stmt.run(initialHours, createdAt, id)
  
  const getStmt = db.prepare('SELECT * FROM plans WHERE id = ?')
  return getStmt.get(id) as Plan
}

export function setActivePlan(db: Database.Database, id: number): Plan {
  // 将所有计划的 is_current 设为 0
  db.prepare('UPDATE plans SET is_current = 0').run()
  
  // 将指定计划的 is_current 设为 1
  db.prepare('UPDATE plans SET is_current = 1 WHERE id = ?').run(id)
  
  const getStmt = db.prepare('SELECT * FROM plans WHERE id = ?')
  return getStmt.get(id) as Plan
}

// ==================== 奖励任务管理 ====================

export function getAllRewardTasks(db: Database.Database, planId: number): RewardTask[] {
  // 只返回未完成的任务（没有完成记录的任务）
  const stmt = db.prepare(`
    SELECT rt.* FROM reward_tasks rt
    WHERE rt.plan_id = ? 
      AND rt.is_active = 1
      AND rt.id NOT IN (
        SELECT DISTINCT ct.reward_task_id 
        FROM completed_tasks ct
        INNER JOIN daily_records dr ON ct.daily_record_id = dr.id
        WHERE dr.plan_id = ?
      )
    ORDER BY rt.created_at DESC
  `)
  return stmt.all(planId, planId) as RewardTask[]
}

// 获取所有任务（包括已完成的任务及其最后完成时间）
export function getAllRewardTasksWithCompletionStatus(
  db: Database.Database, 
  planId: number
): Array<RewardTask & { last_completed_date?: string }> {
  const stmt = db.prepare(`
    SELECT 
      rt.*,
      (
        SELECT dr.date 
        FROM completed_tasks ct
        INNER JOIN daily_records dr ON ct.daily_record_id = dr.id
        WHERE ct.reward_task_id = rt.id AND dr.plan_id = ?
        ORDER BY dr.date DESC
        LIMIT 1
      ) as last_completed_date
    FROM reward_tasks rt
    WHERE rt.plan_id = ? AND rt.is_active = 1
    ORDER BY rt.created_at DESC
  `)
  return stmt.all(planId, planId) as Array<RewardTask & { last_completed_date?: string }>
}

export function createRewardTask(
  db: Database.Database,
  planId: number,
  name: string,
  rewardHours: number
): RewardTask {
  const stmt = db.prepare(`
    INSERT INTO reward_tasks (plan_id, name, reward_hours, is_active)
    VALUES (?, ?, ?, 1)
  `)
  const result = stmt.run(planId, name, rewardHours)

  const getStmt = db.prepare('SELECT * FROM reward_tasks WHERE id = ?')
  return getStmt.get(result.lastInsertRowid) as RewardTask
}

export function updateRewardTask(
  db: Database.Database,
  id: number,
  updates: Partial<RewardTask>
): RewardTask {
  const fields: string[] = []
  const values: any[] = []

  if (updates.name !== undefined) {
    fields.push('name = ?')
    values.push(updates.name)
  }
  if (updates.reward_hours !== undefined) {
    fields.push('reward_hours = ?')
    values.push(updates.reward_hours)
  }
  if (updates.is_active !== undefined) {
    fields.push('is_active = ?')
    values.push(updates.is_active)
  }

  values.push(id)

  const stmt = db.prepare(`UPDATE reward_tasks SET ${fields.join(', ')} WHERE id = ?`)
  stmt.run(...values)

  const getStmt = db.prepare('SELECT * FROM reward_tasks WHERE id = ?')
  return getStmt.get(id) as RewardTask
}

export function deleteRewardTask(db: Database.Database, id: number): void {
  const stmt = db.prepare('UPDATE reward_tasks SET is_active = 0 WHERE id = ?')
  stmt.run(id)
}

export function completeRewardTask(
  db: Database.Database,
  taskId: number,
  date: string
): CompletedTask {
  // 获取任务信息
  const taskStmt = db.prepare('SELECT * FROM reward_tasks WHERE id = ?')
  const task = taskStmt.get(taskId) as RewardTask

  // 获取或创建当日记录
  let record = getDailyRecordByDate(db, task.plan_id, date)
  if (!record) {
    // 创建临时记录（专注时间为0，等待后续填写）
    record = createDailyRecord(db, task.plan_id, date, 0)
  }

  // 添加完成任务记录
  const insertStmt = db.prepare(`
    INSERT INTO completed_tasks (daily_record_id, reward_task_id, reward_task_name, reward_hours)
    VALUES (?, ?, ?, ?)
  `)
  const result = insertStmt.run(record.id, taskId, task.name, task.reward_hours)

  // 更新记录的剩余时间
  updateDailyRecordRemainingHours(db, record.id)

  const getStmt = db.prepare('SELECT * FROM completed_tasks WHERE id = ?')
  return getStmt.get(result.lastInsertRowid) as CompletedTask
}

export function uncompleteRewardTask(db: Database.Database, taskId: number, date: string): void {
  // 获取当日记录
  const recordStmt = db.prepare('SELECT * FROM daily_records WHERE plan_id = (SELECT plan_id FROM reward_tasks WHERE id = ?) AND date = ?')
  const record = recordStmt.get(taskId, date) as DailyRecord | null
  
  if (!record) {
    throw new Error('未找到该日期的记录')
  }

  // 删除完成任务记录
  const deleteStmt = db.prepare(`
    DELETE FROM completed_tasks 
    WHERE daily_record_id = ? AND reward_task_id = ?
  `)
  deleteStmt.run(record.id, taskId)

  // 更新记录的剩余时间
  updateDailyRecordRemainingHours(db, record.id)
}

// ==================== 每日记录管理 ====================

export function getDailyRecords(db: Database.Database, planId: number, limit = 30): DailyRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM daily_records 
    WHERE plan_id = ? 
    ORDER BY date DESC 
    LIMIT ?
  `)
  const records = stmt.all(planId, limit) as DailyRecord[]

  // 获取每条记录的完成任务
  for (const record of records) {
    record.completed_tasks = getCompletedTasks(db, record.id)
  }

  return records
}

export function getDailyRecordByDate(
  db: Database.Database,
  planId: number,
  date: string
): DailyRecord | null {
  const stmt = db.prepare('SELECT * FROM daily_records WHERE plan_id = ? AND date = ?')
  const record = stmt.get(planId, date) as DailyRecord | null

  if (record) {
    record.completed_tasks = getCompletedTasks(db, record.id)
  }

  return record
}

// 重新计算指定日期之后的所有记录的剩余时间
function recalculateSubsequentRecords(db: Database.Database, planId: number, afterDate: string) {
  // 获取该日期之后的所有记录，按日期升序
  const stmt = db.prepare(`
    SELECT * FROM daily_records 
    WHERE plan_id = ? AND date > ? 
    ORDER BY date ASC
  `)
  const records = stmt.all(planId, afterDate) as DailyRecord[]

  for (const record of records) {
    // 获取前一天的剩余时间
    const prevStmt = db.prepare(`
      SELECT remaining_hours FROM daily_records 
      WHERE plan_id = ? AND date < ? 
      ORDER BY date DESC 
      LIMIT 1
    `)
    const prevRecord = prevStmt.get(planId, record.date) as { remaining_hours: number } | null
    
    if (!prevRecord) continue // 理论上不应该发生

    // 获取当天完成任务的总奖励时间
    const tasksStmt = db.prepare('SELECT SUM(reward_hours) as total FROM completed_tasks WHERE daily_record_id = ?')
    const result = tasksStmt.get(record.id) as { total: number | null }
    const completedTasksHours = result.total || 0

    // 重新计算剩余时间
    const newRemainingHours = prevRecord.remaining_hours - record.focus_hours - completedTasksHours

    // 更新记录
    const updateStmt = db.prepare('UPDATE daily_records SET remaining_hours = ? WHERE id = ?')
    updateStmt.run(newRemainingHours, record.id)
  }
}

export function createDailyRecord(
  db: Database.Database,
  planId: number,
  date: string,
  focusHours: number,
  isConfirmed: boolean = false
): DailyRecord {
  // 获取计划信息
  const planStmt = db.prepare('SELECT * FROM plans WHERE id = ?')
  const plan = planStmt.get(planId) as Plan

  // 获取前一天的剩余时间
  const prevStmt = db.prepare(`
    SELECT remaining_hours FROM daily_records 
    WHERE plan_id = ? AND date < ? 
    ORDER BY date DESC 
    LIMIT 1
  `)
  const prevRecord = prevStmt.get(planId, date) as { remaining_hours: number } | null
  const previousRemaining = prevRecord ? prevRecord.remaining_hours : plan.initial_hours

  // 获取当天已完成的任务总奖励时间
  const tempRecordStmt = db.prepare('SELECT id FROM daily_records WHERE plan_id = ? AND date = ?')
  const tempRecord = tempRecordStmt.get(planId, date) as { id: number } | null
  
  let completedTasksHours = 0
  if (tempRecord) {
    const tasksStmt = db.prepare('SELECT SUM(reward_hours) as total FROM completed_tasks WHERE daily_record_id = ?')
    const result = tasksStmt.get(tempRecord.id) as { total: number | null }
    completedTasksHours = result.total || 0
  }

  const remainingHours = previousRemaining - focusHours - completedTasksHours
  
  // 如果记录了专注时间（>0），自动标记为已确认
  const confirmed = focusHours > 0 ? 1 : (isConfirmed ? 1 : 0)

  // 插入或更新记录
  const stmt = db.prepare(`
    INSERT INTO daily_records (plan_id, date, focus_hours, remaining_hours, is_confirmed)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(plan_id, date) 
    DO UPDATE SET focus_hours = ?, remaining_hours = ?, is_confirmed = ?
  `)
  stmt.run(planId, date, focusHours, remainingHours, confirmed, focusHours, remainingHours, confirmed)

  // 级联更新后续所有记录的剩余时间
  recalculateSubsequentRecords(db, planId, date)

  // 更新计划的当前剩余时间为最新一天的剩余时间
  const latestStmt = db.prepare(`
    SELECT remaining_hours FROM daily_records 
    WHERE plan_id = ? 
    ORDER BY date DESC 
    LIMIT 1
  `)
  const latestRecord = latestStmt.get(planId) as { remaining_hours: number } | null
  if (latestRecord) {
    const updatePlanStmt = db.prepare('UPDATE plans SET current_hours = ? WHERE id = ?')
    updatePlanStmt.run(latestRecord.remaining_hours, planId)
  }

  const record = getDailyRecordByDate(db, planId, date)
  return record!
}

export function updateDailyRecord(
  db: Database.Database,
  id: number,
  focusHours: number
): DailyRecord {
  const getStmt = db.prepare('SELECT * FROM daily_records WHERE id = ?')
  const record = getStmt.get(id) as DailyRecord

  // 重新计算剩余时间
  const prevStmt = db.prepare(`
    SELECT remaining_hours FROM daily_records 
    WHERE plan_id = ? AND date < ? 
    ORDER BY date DESC 
    LIMIT 1
  `)
  const prevRecord = prevStmt.get(record.plan_id, record.date) as { remaining_hours: number } | null

  // 如果没有前一天记录，使用计划的初始时间
  let previousRemaining = 0
  if (prevRecord) {
    previousRemaining = prevRecord.remaining_hours
  } else {
    const planStmt = db.prepare('SELECT initial_hours FROM plans WHERE id = ?')
    const plan = planStmt.get(record.plan_id) as { initial_hours: number }
    previousRemaining = plan.initial_hours
  }

  // 获取当天完成任务的总奖励时间
  const tasksStmt = db.prepare('SELECT SUM(reward_hours) as total FROM completed_tasks WHERE daily_record_id = ?')
  const result = tasksStmt.get(id) as { total: number | null }
  const completedTasksHours = result.total || 0

  const remainingHours = previousRemaining - focusHours - completedTasksHours
  
  // 如果记录了专注时间（>0），自动标记为已确认
  const confirmed = focusHours > 0 ? 1 : record.is_confirmed

  const updateStmt = db.prepare('UPDATE daily_records SET focus_hours = ?, remaining_hours = ?, is_confirmed = ? WHERE id = ?')
  updateStmt.run(focusHours, remainingHours, confirmed, id)

  // 级联更新后续所有记录的剩余时间
  recalculateSubsequentRecords(db, record.plan_id, record.date)

  // 更新计划的当前剩余时间为最新一天的剩余时间
  const latestStmt = db.prepare(`
    SELECT remaining_hours FROM daily_records 
    WHERE plan_id = ? 
    ORDER BY date DESC 
    LIMIT 1
  `)
  const latestRecord = latestStmt.get(record.plan_id) as { remaining_hours: number } | null
  if (latestRecord) {
    const updatePlanStmt = db.prepare('UPDATE plans SET current_hours = ? WHERE id = ?')
    updatePlanStmt.run(latestRecord.remaining_hours, record.plan_id)
  }

  return getDailyRecordByDate(db, record.plan_id, record.date)!
}

// 重新计算整个计划的所有记录（用于修复历史数据）
export function recalculateAllRecords(db: Database.Database, planId: number) {
  console.log('[DB] 开始重新计算计划', planId, '的所有记录')
  
  // 获取计划的初始时间
  const planStmt = db.prepare('SELECT initial_hours FROM plans WHERE id = ?')
  const plan = planStmt.get(planId) as { initial_hours: number } | null
  if (!plan) {
    console.error('[DB] 计划不存在:', planId)
    return
  }

  // 获取所有记录，按日期升序
  const stmt = db.prepare(`
    SELECT * FROM daily_records 
    WHERE plan_id = ? 
    ORDER BY date ASC
  `)
  const records = stmt.all(planId) as DailyRecord[]

  let previousRemaining = plan.initial_hours

  for (const record of records) {
    // 获取当天完成任务的总奖励时间
    const tasksStmt = db.prepare('SELECT SUM(reward_hours) as total FROM completed_tasks WHERE daily_record_id = ?')
    const result = tasksStmt.get(record.id) as { total: number | null }
    const completedTasksHours = result.total || 0

    // 重新计算剩余时间
    const newRemainingHours = previousRemaining - record.focus_hours - completedTasksHours

    console.log(`[DB] ${record.date}: ${previousRemaining} - ${record.focus_hours} - ${completedTasksHours} = ${newRemainingHours}`)

    // 更新记录
    const updateStmt = db.prepare('UPDATE daily_records SET remaining_hours = ? WHERE id = ?')
    updateStmt.run(newRemainingHours, record.id)

    // 更新为下一天的基准
    previousRemaining = newRemainingHours
  }

  // 更新计划的当前剩余时间
  if (records.length > 0) {
    const updatePlanStmt = db.prepare('UPDATE plans SET current_hours = ? WHERE id = ?')
    updatePlanStmt.run(previousRemaining, planId)
    console.log('[DB] 更新计划当前剩余时间为:', previousRemaining)
  }
  
  console.log('[DB] 重新计算完成')
}

function updateDailyRecordRemainingHours(db: Database.Database, recordId: number) {
  const getStmt = db.prepare('SELECT * FROM daily_records WHERE id = ?')
  const record = getStmt.get(recordId) as DailyRecord

  updateDailyRecord(db, recordId, record.focus_hours)
}

function getCompletedTasks(db: Database.Database, dailyRecordId: number): CompletedTask[] {
  const stmt = db.prepare('SELECT * FROM completed_tasks WHERE daily_record_id = ? ORDER BY completed_at DESC')
  return stmt.all(dailyRecordId) as CompletedTask[]
}

export function getRecordsByDateRange(
  db: Database.Database,
  planId: number,
  startDate: string,
  endDate: string
): DailyRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM daily_records 
    WHERE plan_id = ? AND date >= ? AND date <= ?
    ORDER BY date DESC
  `)
  const records = stmt.all(planId, startDate, endDate) as DailyRecord[]

  for (const record of records) {
    record.completed_tasks = getCompletedTasks(db, record.id)
  }

  return records
}

// ==================== 导出功能 ====================

export function exportToMarkdown(db: Database.Database, planId: number): string {
  const planStmt = db.prepare('SELECT * FROM plans WHERE id = ?')
  const plan = planStmt.get(planId) as Plan

  const recordsStmt = db.prepare(`
    SELECT * FROM daily_records 
    WHERE plan_id = ? 
    ORDER BY date ASC
  `)
  const records = recordsStmt.all(planId) as DailyRecord[]

  let markdown = `# ${plan.name}\n\n`
  markdown += `初始时间: ${formatHours(plan.initial_hours)}\n`
  markdown += `当前剩余: ${formatHours(plan.current_hours)}\n\n`
  markdown += `---\n\n`

  for (const record of records) {
    const tasks = getCompletedTasks(db, record.id)
    markdown += `## ${record.date}\n\n`
    
    // 计算前一天剩余时间
    const prevStmt = db.prepare(`
      SELECT remaining_hours FROM daily_records 
      WHERE plan_id = ? AND date < ? 
      ORDER BY date DESC 
      LIMIT 1
    `)
    const prevRecord = prevStmt.get(planId, record.date) as { remaining_hours: number } | null
    const previousRemaining = prevRecord ? prevRecord.remaining_hours : plan.initial_hours

    markdown += `${formatHours(previousRemaining)}`
    
    if (record.focus_hours > 0) {
      markdown += ` - ${formatHours(record.focus_hours)}`
    }
    
    for (const task of tasks) {
      markdown += ` - ${formatHours(task.reward_hours)}`
    }
    
    markdown += ` = ${formatHours(record.remaining_hours)}\n\n`
    
    if (tasks.length > 0) {
      markdown += `完成任务:\n`
      for (const task of tasks) {
        markdown += `- ${task.reward_task_name} (-${formatHours(task.reward_hours)})\n`
      }
      markdown += '\n'
    }
  }

  return markdown
}

export function exportToJSON(db: Database.Database, planId: number): string {
  const planStmt = db.prepare('SELECT * FROM plans WHERE id = ?')
  const plan = planStmt.get(planId) as Plan

  const records = getDailyRecords(db, planId, 1000)
  const tasks = getAllRewardTasks(db, planId)

  const data = {
    plan,
    records,
    tasks
  }

  return JSON.stringify(data, null, 2)
}

function formatHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h}:${m.toString().padStart(2, '0')}`
}

// 创建测试数据
export function createTestData(db: Database.Database): Plan {
  // 检查是否已有测试计划
  const existingPlan = db.prepare('SELECT * FROM plans WHERE name = ?').get('测试计划 Alpha')
  
  if (existingPlan) {
    return existingPlan as Plan
  }

  // 创建新的测试计划（30天前创建，一年后截止）
  const oneYearLater = new Date()
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1)
  const deadline = oneYearLater.toISOString().split('T')[0]
  
  const stmt = db.prepare(`
    INSERT INTO plans (name, initial_hours, current_hours, status, is_current, deadline, created_at)
    VALUES (?, ?, ?, 'active', 0, ?, datetime('now', '-30 days', 'localtime'))
  `)
  
  const result = stmt.run('测试计划 Alpha', 1000, 1000, deadline)
  const planId = result.lastInsertRowid as number
  
  // 创建测试任务
  const tasks = [
    { name: '深度学习基础', reward_hours: 10 },
    { name: '项目实战练习', reward_hours: 15 },
    { name: '代码重构', reward_hours: 8 },
    { name: '技术文档编写', reward_hours: 5 },
    { name: '算法训练', reward_hours: 12 }
  ]
  
  const taskStmt = db.prepare(`
    INSERT INTO reward_tasks (plan_id, name, reward_hours, is_active, created_at)
    VALUES (?, ?, ?, 1, datetime('now', 'localtime'))
  `)
  
  tasks.forEach(task => {
    taskStmt.run(planId, task.name, task.reward_hours)
  })
  
  // 创建过去30天的历史记录
  const recordStmt = db.prepare(`
    INSERT INTO daily_records (plan_id, date, focus_hours, remaining_hours, is_confirmed, created_at)
    VALUES (?, ?, ?, ?, 1, datetime('now', 'localtime'))
  `)
  
  const today = new Date()
  let remainingHours = 1000 // 从初始1000小时开始
  
  for (let i = 30; i > 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    // 随机生成专注时间 (0-10小时)
    const focusHours = Math.random() * 10
    remainingHours -= focusHours // 递减剩余时间
    
    recordStmt.run(planId, dateStr, focusHours, remainingHours)
  }
  
  // 更新计划的剩余时间
  db.prepare('UPDATE plans SET current_hours = ? WHERE id = ?').run(remainingHours, planId)
  
  // 返回创建的计划
  const plan = db.prepare('SELECT * FROM plans WHERE id = ?').get(planId) as Plan
  return plan
}

