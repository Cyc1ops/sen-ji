#!/bin/bash

# 森记开发脚本

echo "🌲 启动森记开发环境..."

# 检查依赖
if [ ! -d "node_modules" ]; then
  echo "📥 安装依赖..."
  npm install
fi

# 启动开发服务器
echo "🚀 启动开发服务器..."
npm run electron:dev

