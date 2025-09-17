#!/bin/bash

# UUBI Production Setup Script
echo "🔧 Setting up UUBI for production deployment..."

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# UUBI Production Environment Variables
NODE_ENV=production
PORT=3000

# Email Configuration (Gmail SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# JWT Secret (Generate a strong secret for production)
JWT_SECRET=$(openssl rand -base64 32)

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Settings
CORS_ORIGIN=https://your-domain.com

# Database/Storage
DATA_DIR=/app/data

# Blockchain (Development mode for now)
BLOCKCHAIN_NETWORK=development
CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
EOF
    echo "✅ Created .env file with generated JWT secret"
else
    echo "ℹ️  .env file already exists"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p data uploads

# Set permissions
echo "🔐 Setting permissions..."
chmod 755 data uploads

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create production build if needed
if [ -f "package.json" ] && grep -q "build" package.json; then
    echo "🏗️  Building for production..."
    npm run build
fi

echo ""
echo "✅ Production setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env file with your production values:"
echo "   - Set EMAIL_USER to your Gmail address"
echo "   - Set EMAIL_PASS to your Gmail app password"
echo "   - Set CORS_ORIGIN to your production domain"
echo ""
echo "2. Deploy to your chosen platform:"
echo "   - Railway: railway up"
echo "   - Heroku: heroku create && git push heroku main"
echo "   - Vercel: vercel --prod"
echo "   - Docker: docker build -t uubi . && docker run -p 3000:3000 uubi"
echo ""
echo "3. Test your deployment:"
echo "   - Check health endpoint: curl https://your-domain.com/api/health"
echo "   - Test registration and login"
echo "   - Verify email functionality"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"
