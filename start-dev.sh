#!/bin/bash

# Simple Development Start Script (No Docker)
# Runs everything locally for faster development

set -e

echo "🚀 Starting USDC Payroll Platform in development mode..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Create environment files if they don't exist
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please update backend/.env with your Circle API keys"
fi

if [ ! -f frontend/.env.local ]; then
    echo "📝 Creating frontend/.env.local from template..."
    cp frontend/.env.example frontend/.env.local
fi

# Install dependencies if node_modules don't exist
if [ ! -d "shared/node_modules" ]; then
    echo "📦 Installing shared dependencies..."
    cd shared && npm install && cd ..
fi

if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Setup SQLite database for development
echo "🗄️  Setting up development database..."
cd backend

# Use SQLite for local development
export DATABASE_URL="file:./dev.db"
echo "DATABASE_URL=\"file:./dev.db\"" >> .env

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev --name init

cd ..

echo "✅ Setup complete!"
echo ""
echo "🚀 Starting development servers..."
echo "   Backend will start on: http://localhost:3001"
echo "   Frontend will start on: http://localhost:3000"
echo ""
echo "📝 Open two terminals and run:"
echo "   Terminal 1: cd backend && npm run dev"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
echo "🌐 Then visit: http://localhost:3000"
