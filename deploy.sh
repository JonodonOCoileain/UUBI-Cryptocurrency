#!/bin/bash

# UUBI Production Deployment Script
echo "🚀 Starting UUBI Production Deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating from example..."
    if [ -f "env.example" ]; then
        cp env.example .env
        echo "✅ Created .env file from example. Please update with your production values."
    else
        echo "❌ Error: No .env file and no env.example found."
        exit 1
    fi
fi

# Create data directory if it doesn't exist
if [ ! -d "data" ]; then
    echo "📁 Creating data directory..."
    mkdir -p data
fi

# Create uploads directory if it doesn't exist
if [ ! -d "uploads" ]; then
    echo "📁 Creating uploads directory..."
    mkdir -p uploads
fi

# Set proper permissions
echo "🔐 Setting permissions..."
chmod 755 data
chmod 755 uploads

# Check if Railway CLI is installed
if command -v railway &> /dev/null; then
    echo "✅ Railway CLI found. You can deploy with: railway up"
else
    echo "ℹ️  Railway CLI not found. Install with: npm install -g @railway/cli"
fi

# Check if Heroku CLI is installed
if command -v heroku &> /dev/null; then
    echo "✅ Heroku CLI found. You can deploy with: heroku create && git push heroku main"
else
    echo "ℹ️  Heroku CLI not found. Install from: https://devcenter.heroku.com/articles/heroku-cli"
fi

# Check if Vercel CLI is installed
if command -v vercel &> /dev/null; then
    echo "✅ Vercel CLI found. You can deploy with: vercel --prod"
else
    echo "ℹ️  Vercel CLI not found. Install with: npm install -g vercel"
fi

echo ""
echo "🎉 Deployment preparation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your production values"
echo "2. Choose a deployment platform:"
echo "   - Railway: railway up"
echo "   - Heroku: heroku create && git push heroku main"
echo "   - Vercel: vercel --prod"
echo "   - DigitalOcean: Connect GitHub repo in dashboard"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
echo ""
echo "🔧 Production checklist:"
echo "   - [ ] Set NODE_ENV=production"
echo "   - [ ] Set JWT_SECRET to a secure value"
echo "   - [ ] Configure email settings"
echo "   - [ ] Set CORS_ORIGIN to your domain"
echo "   - [ ] Test all functionality"
echo "   - [ ] Set up monitoring"
echo ""
