// 简单的 Electron 构建脚本
const esbuild = require('esbuild')
const path = require('path')

async function build() {
  // 构建主进程
  await esbuild.build({
    entryPoints: ['electron/main.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist-electron/main.js',
    external: ['electron', 'better-sqlite3'],
    format: 'cjs',
    mainFields: ['main', 'module'],
    conditions: ['node']
  })

  // 构建预加载脚本
  await esbuild.build({
    entryPoints: ['electron/preload.ts'],
    bundle: true,
    platform: 'node',
    target: 'node18',
    outfile: 'dist-electron/preload.js',
    external: ['electron'],
    format: 'cjs'
  })

  console.log('✅ Electron files built successfully!')
}

build().catch(err => {
  console.error('❌ Build failed:', err)
  process.exit(1)
})

