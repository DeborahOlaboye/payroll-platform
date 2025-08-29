#!/bin/bash

# USDC Gig Payroll Platform Deployment Script
# This script sets up the development environment and deploys the application

set -e

echo "🚀 Starting USDC Gig Payroll Platform deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment files if they don't exist
echo "📝 Setting up environment files..."

if [ ! -f backend/.env ]; then
    echo "Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    echo "⚠️  Please update backend/.env with your Circle API keys and other configuration"
fi

if [ ! -f frontend/.env.local ]; then
    echo "Creating frontend/.env.local from template..."
    cp frontend/.env.example frontend/.env.local
fi

# Install dependencies
echo "📦 Installing dependencies..."

# Install shared package dependencies first
echo "Installing shared package..."
cd shared && npm install && cd ..

# Install backend dependencies (includes shared as local dependency)
echo "Installing backend dependencies..."
cd backend && npm install && cd ..

# Install frontend dependencies (includes shared as local dependency)
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Generate Prisma client
echo "🗄️  Setting up database..."
cd backend && npx prisma generate && cd ..

# Start services with Docker Compose
echo "🐳 Starting services with Docker Compose..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Run database migrations
echo "🔄 Running database migrations..."
cd backend && npx prisma migrate dev --name init && cd ..

# Start the application services
echo "🌟 Starting application services..."
docker-compose up -d

echo "✅ Deployment complete!"
echo ""
echo "🌐 Application URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Admin:    http://localhost:3000/admin"
echo "   Worker:   http://localhost:3000/worker"
echo ""
echo "📊 Database:"
echo "   PostgreSQL: localhost:5432"
echo "   Database:   usdc_payroll"
echo "   Username:   postgres"
echo "   Password:   postgres"
echo ""
echo "⚙️  Next steps:"
echo "1. Update backend/.env with your Circle API keys"
echo "2. Visit http://localhost:3000 to access the application"
echo "3. Use the admin dashboard to create payroll runs"
echo "4. Use the worker portal to view balances and make transfers"
echo ""
echo "🛠️  Development commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo ""
echo "Happy coding! 🎉"
