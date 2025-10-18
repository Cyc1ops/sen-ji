/**
 * 配速员工具函数
 * 用于计算配速进度、建议速度等
 */

import { Plan } from '../types'
import { SAFE_SPEED_LIMIT, CONSERVATIVE_SPEED_LIMIT, MIN_SPEED_DIFFERENCE } from '../constants'

/**
 * 配速员数据接口
 */
export interface PacemakerData {
  // 基础数据
  totalDays: number           // 计划总天数
  elapsedDays: number         // 已过天数
  remainingDays: number       // 剩余天数
  paceProgress: number        // 配速员进度百分比
  
  // 进度数据
  paceExpectedHours: number   // 配速员应完成的小时数
  actualSpentHours: number    // 实际已完成的小时数
  remainingHours: number      // 剩余需完成的小时数
  gapHours: number            // 与配速员的差距（正数=领先，负数=落后）
  
  // 状态
  isBehind: boolean           // 是否落后
  
  // 速度数据
  currentSpeed: number        // 当前速度（小时/天）
  paceSpeed: number           // 配速员速度（小时/天）
  minSpeedPerDay: number      // 最低所需速度（小时/天）
}

/**
 * 建议方案接口
 */
export interface SpeedSuggestion {
  speed: number               // 建议速度（小时/天）
  catchUpDays: number         // 追赶所需天数
  catchUpSpeed: number        // 追赶速度（比配速员快多少）
}

/**
 * 建议结果接口
 */
export interface PacemakerSuggestions {
  canShowSuggestions: boolean
  shouldShowConservative: boolean
  shouldShowAggressive: boolean
  conservative?: SpeedSuggestion
  aggressive?: SpeedSuggestion
}

/**
 * 计算配速员基础数据
 */
export function calculatePacemakerData(
  plan: Plan,
  totalSpent: number
): PacemakerData | null {
  if (!plan.deadline) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const deadlineDate = new Date(plan.deadline)
  deadlineDate.setHours(0, 0, 0, 0)
  
  // 检查是否已过截止日期
  if (today > deadlineDate) return null
  
  const planStartDate = new Date(plan.created_at.split(' ')[0])
  planStartDate.setHours(0, 0, 0, 0)
  
  // 计算天数
  const totalDays = Math.ceil((deadlineDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24))
  const elapsedDays = Math.ceil((today.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24))
  const remainingDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  // 计算进度
  const paceProgress = Math.min((elapsedDays / totalDays) * 100, 100)
  const paceExpectedHours = plan.initial_hours * (elapsedDays / totalDays)
  const actualSpentHours = totalSpent
  const gapHours = actualSpentHours - paceExpectedHours
  const remainingHours = plan.initial_hours - actualSpentHours
  
  // 计算速度
  const currentSpeed = actualSpentHours / elapsedDays
  const paceSpeed = plan.initial_hours / totalDays
  const minSpeedPerDay = remainingHours / remainingDays
  
  return {
    totalDays,
    elapsedDays,
    remainingDays,
    paceProgress,
    paceExpectedHours,
    actualSpentHours,
    remainingHours,
    gapHours,
    isBehind: gapHours < 0,
    currentSpeed,
    paceSpeed,
    minSpeedPerDay
  }
}

/**
 * 计算落后时的建议速度
 */
export function calculateBehindSuggestions(
  data: PacemakerData
): PacemakerSuggestions {
  const {
    gapHours,
    currentSpeed,
    paceSpeed,
    minSpeedPerDay,
    remainingDays
  } = data
  
  const behindHours = Math.abs(gapHours)
  const speedGap = paceSpeed - currentSpeed
  
  // 稳健方案：适度提速
  let conservativeSpeed = Math.min(
    currentSpeed + speedGap * 1.5,       // 缩小差距的1.5倍
    minSpeedPerDay * 1.1,                // 最低速度的1.1倍
    CONSERVATIVE_SPEED_LIMIT             // 稳健上限
  )
  conservativeSpeed = Math.max(conservativeSpeed, minSpeedPerDay)
  
  // 积极方案：显著提速
  let aggressiveSpeed = Math.min(
    currentSpeed + speedGap * 2.5,       // 缩小差距的2.5倍
    paceSpeed * 2.0,                     // 或配速员速度的2倍
    SAFE_SPEED_LIMIT                     // 但不超过安全上限
  )
  aggressiveSpeed = Math.max(aggressiveSpeed, minSpeedPerDay)
  
  // 计算追赶时间
  const conservativeCatchUpSpeed = conservativeSpeed - paceSpeed
  const conservativeDays = conservativeCatchUpSpeed > 0 
    ? behindHours / conservativeCatchUpSpeed 
    : Infinity
  
  const aggressiveCatchUpSpeed = aggressiveSpeed - paceSpeed
  const aggressiveDays = aggressiveCatchUpSpeed > 0 
    ? behindHours / aggressiveCatchUpSpeed 
    : Infinity
  
  // 判断是否显示建议
  const canShowSuggestions = minSpeedPerDay <= SAFE_SPEED_LIMIT
  const shouldShowConservative = canShowSuggestions && 
                                 conservativeCatchUpSpeed > 0 && 
                                 conservativeDays < remainingDays
  const shouldShowAggressive = canShowSuggestions && 
                               aggressiveCatchUpSpeed > 0 && 
                               aggressiveDays < remainingDays &&
                               aggressiveSpeed > conservativeSpeed + MIN_SPEED_DIFFERENCE
  
  return {
    canShowSuggestions,
    shouldShowConservative,
    shouldShowAggressive,
    conservative: shouldShowConservative ? {
      speed: conservativeSpeed,
      catchUpDays: conservativeDays,
      catchUpSpeed: conservativeCatchUpSpeed
    } : undefined,
    aggressive: shouldShowAggressive ? {
      speed: aggressiveSpeed,
      catchUpDays: aggressiveDays,
      catchUpSpeed: aggressiveCatchUpSpeed
    } : undefined
  }
}

/**
 * 计算领先时的数据
 */
export function calculateAheadData(data: PacemakerData) {
  const {
    gapHours,
    currentSpeed,
    remainingHours
  } = data
  
  const leadingHours = gapHours
  const canFinishEarlyDays = remainingHours / currentSpeed
  
  return {
    leadingHours,
    currentSpeed,
    canFinishEarlyDays
  }
}

/**
 * 格式化追赶时间
 */
export function formatCatchUpTime(days: number): string {
  const exactDays = Math.ceil(days)
  if (days <= 7) return `${exactDays} 天`
  if (days <= 21) return `${Math.ceil(days / 7)} 周`
  if (days <= 60) return `${Math.ceil(days / 30)} 个月`
  return `较长时间 (约 ${exactDays} 天)`
}

