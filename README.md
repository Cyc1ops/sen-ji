# 森记 - 森林时间统计应用

一款简约高效的时间统计应用，专为森林时间挑战设计。

## 功能特性

### 核心功能

- **计划管理**: 创建、切换和归档多个独立计划
- **奖励任务池**: 管理任务及奖励时间，一键完成并自动记录
- **每日记录**: 记录专注时间，支持补记功能
- **历史查询**: 列表和日历双视图，查看详细记录
- **数据导出**: 导出为 Markdown 或 JSON 格式

### 界面设计

- 简约干净的设计风格
- 直观的操作流程
- 响应式布局
- 流畅的交互体验

## 技术栈

- **前端框架**: React + TypeScript
- **桌面框架**: Electron
- **构建工具**: Vite
- **样式**: TailwindCSS
- **数据库**: SQLite (better-sqlite3)
- **路由**: React Router

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装和运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发模式
npm run electron:dev

# 3. 构建 macOS 应用（可选）
npm run build:mac
```

### 开发模式

开发模式会同时启动：
- Vite 开发服务器（热更新）
- Electron 应用窗口
- 自动监听文件变化

### 浏览器调试

如果需要在浏览器中调试 UI，可以单独运行：

```bash
npm run dev
```

然后访问 `http://localhost:5173`

注意：浏览器模式会使用 mock 数据，不会实际操作数据库。

### 构建和打包

```bash
# 构建 macOS 应用
npm run build:mac

# 构建后的文件位于 release/ 目录
```

## 项目结构

```
森记/
├── electron/              # Electron 主进程
│   ├── main.ts           # 主进程入口
│   ├── preload.ts        # 预加载脚本（IPC 通信桥接）
│   └── database.ts       # 数据库操作（SQLite）
├── src/                  # React 应用
│   ├── pages/            # 页面组件
│   │   ├── Dashboard.tsx # 仪表盘
│   │   ├── TaskPool.tsx  # 任务池
│   │   ├── Records.tsx   # 记录
│   │   ├── History.tsx   # 历史
│   │   └── Settings.tsx  # 设置
│   ├── components/       # 共享组件
│   │   └── TimeInput.tsx # 时间输入组件
│   ├── types/            # TypeScript 类型定义
│   ├── utils/            # 工具函数
│   ├── mockElectronAPI.ts # 浏览器模式 mock 数据
│   ├── App.tsx           # 主应用组件
│   ├── main.tsx          # React 入口文件
│   └── index.css         # 全局样式
├── docs/                 # 文档
│   └── USER_GUIDE.md    # 用户指南
├── package.json
├── vite.config.ts
├── tsconfig.json
└── tailwind.config.js
```

## 数据库设计

### plans (计划表)
- id: 计划ID
- name: 计划名称
- initial_hours: 初始小时数
- current_hours: 当前剩余小时数
- status: 状态 (active/archived)
- created_at: 创建时间
- archived_at: 归档时间

### reward_tasks (奖励任务表)
- id: 任务ID
- plan_id: 所属计划
- name: 任务名称
- reward_hours: 奖励时间
- is_active: 是否活跃
- created_at: 创建时间

### daily_records (每日记录表)
- id: 记录ID
- plan_id: 所属计划
- date: 日期
- focus_hours: 专注时间
- remaining_hours: 剩余时间
- is_confirmed: 是否已确认（0=未确认，1=已确认）
- created_at: 创建时间

### completed_tasks (完成任务记录表)
- id: 记录ID
- daily_record_id: 所属每日记录
- reward_task_id: 奖励任务ID
- reward_task_name: 任务名称
- reward_hours: 奖励时间
- completed_at: 完成时间

## 使用指南

### 1. 创建计划

首次使用时，在"设置"页面创建一个新计划，设置计划名称和初始时间。

### 2. 添加奖励任务

在"任务池"页面添加奖励任务，设置任务名称和对应的奖励时间。

### 3. 完成任务

当完成某个任务时，在"任务池"页面点击"完成"按钮，系统会自动记录到当天。

### 4. 记录专注时间

每天在"记录"页面输入昨天的专注时间，系统会自动计算剩余时间。

### 5. 查看历史

在"历史"页面查看过往记录，支持列表视图和日历视图。

### 6. 导出数据

在"设置"页面可以导出计划数据为 Markdown 或 JSON 格式。

## 时间格式

所有时间输入使用 `HH:MM` 格式：

- `7:41` = 7小时41分钟
- `1000:00` = 1000小时
- `5:30` = 5小时30分钟

## 补记功能

如果某天忘记记录，可以在"记录"页面使用"自定义日期"功能进行补记。

## License

MIT

---

© 2025 森记. 专注于时间，成就于坚持。

