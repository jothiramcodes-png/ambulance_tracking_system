#!/usr/bin/env bash
# exit on error
set -o errexit

echo "📦 Installing root dependencies..."
npm install --include=dev

echo "🎨 Building Frontend..."
cd client
npm install --include=dev
npm run build

echo "⚙️ Installing Backend dependencies..."
cd ../server
npm install

echo "✅ Build Complete!"
