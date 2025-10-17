import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 在浏览器环境中加载 mock Electron API
if (!window.electronAPI) {
  import('./mockElectronAPI')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

