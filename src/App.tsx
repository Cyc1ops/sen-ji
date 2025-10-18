import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import TaskPool from './pages/TaskPool'
import Records from './pages/Records'
import History from './pages/History'
import Settings from './pages/Settings'
import { Plan } from './types'
import { formatHours } from './utils/helpers'

function App() {
  const [activePlan, setActivePlan] = useState<Plan | null>(null)

  useEffect(() => {
    loadActivePlan()
  }, [])

  const loadActivePlan = async () => {
    const plan = await window.electronAPI.getActivePlan()
    setActivePlan(plan)
  }

  const handlePlanChange = () => {
    loadActivePlan()
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50">
        {/* 侧边栏 */}
        <nav className="w-56 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">森记</h1>
            {activePlan && (
              <div className="mt-3 text-sm text-gray-600">
                <div className="font-medium text-gray-900">{activePlan.name}</div>
                <div className="mt-1">
                  剩余 {formatHours(activePlan.current_hours)}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 py-4">
            <NavItem to="/" icon="📊" label="仪表盘" />
            <NavItem to="/tasks" icon="🎯" label="任务池" />
            <NavItem to="/records" icon="✍️" label="记录" />
            <NavItem to="/history" icon="📅" label="历史" />
            <NavItem to="/settings" icon="⚙️" label="设置" />
          </div>

          {!activePlan && (
            <div className="p-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 text-center">
                请先创建一个计划
              </p>
            </div>
          )}
        </nav>

        {/* 主内容区 */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard activePlan={activePlan} />} />
            <Route path="/tasks" element={<TaskPool activePlan={activePlan} />} />
            <Route path="/records" element={<Records activePlan={activePlan} />} />
            <Route path="/history" element={<History activePlan={activePlan} />} />
            <Route path="/settings" element={<Settings onPlanChange={handlePlanChange} />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function NavItem({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center px-6 py-3 text-sm font-medium transition-colors ${
          isActive
            ? 'text-blue-600 bg-blue-50 border-r-2 border-blue-600'
            : 'text-gray-700 hover:bg-gray-50'
        }`
      }
    >
      <span className="mr-3 text-lg">{icon}</span>
      {label}
    </NavLink>
  )
}

export default App

