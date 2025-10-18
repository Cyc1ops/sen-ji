/**
 * 应用常量定义
 */

// ============ 配速员相关常量 ============

/**
 * 安全速度上限（小时/天）
 * 超过此值被认为不可持续
 */
export const SAFE_SPEED_LIMIT = 12.0

/**
 * 稳健方案速度上限（小时/天）
 * 用于计算保守的追赶建议
 */
export const CONSERVATIVE_SPEED_LIMIT = 8.0

/**
 * 速度差异阈值（小时/天）
 * 当两种建议方案的速度差异大于此值时，才同时显示两种方案
 */
export const MIN_SPEED_DIFFERENCE = 0.5

// ============ 数据展示相关常量 ============

/**
 * 热力图默认显示天数
 */
export const DEFAULT_HEATMAP_DAYS = 90

/**
 * 最近记录默认显示条数
 */
export const DEFAULT_RECENT_RECORDS_LIMIT = 5

/**
 * 日历视图显示的总天数（6周）
 */
export const CALENDAR_TOTAL_DAYS = 42

// ============ UI相关常量 ============

/**
 * 默认任务显示数量
 */
export const DEFAULT_TASKS_DISPLAY_LIMIT = 3

/**
 * 默认完成任务显示数量
 */
export const DEFAULT_COMPLETED_TASKS_DISPLAY_LIMIT = 3

// ============ 本地存储键名常量 ============

/**
 * 仪表盘视图模式存储键
 */
export const STORAGE_KEY_DASHBOARD_VIEW = 'dashboardViewMode'

/**
 * 历史视图模式存储键
 */
export const STORAGE_KEY_HISTORY_VIEW = 'historyViewMode'

/**
 * 默认仪表盘视图存储键
 */
export const STORAGE_KEY_DEFAULT_DASHBOARD_VIEW = 'defaultDashboardView'

/**
 * 默认历史视图存储键
 */
export const STORAGE_KEY_DEFAULT_HISTORY_VIEW = 'defaultHistoryView'

