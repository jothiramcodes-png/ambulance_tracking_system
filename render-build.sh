#!/usr/bin/env bash
# exit on error
set -o errexit

echo "📦 Installing root dependencies..."
npm install

echo "🎨 Building Frontend..."
cd client
npm install
npm run build

echo "⚙️ Installing Backend dependencies..."
cd ../server
npm install

echo "✅ Build Complete!"
