#!/bin/bash

# 森记构建脚本

echo "🌲 开始构建森记应用..."

# 清理旧的构建文件
echo "📦 清理旧的构建文件..."
rm -rf dist dist-electron release

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
  echo "📥 安装依赖..."
  npm install
fi

# 构建前端
echo "🔨 构建前端应用..."
npm run build:app

# 构建 Electron
echo "⚡️ 构建 Electron 应用..."
npm run electron:build

echo "✅ 构建完成！"
echo "📁 构建产物位于 release/ 目录"

