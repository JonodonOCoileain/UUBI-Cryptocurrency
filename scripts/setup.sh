#!/bin/bash

# UBI Cryptocurrency Setup Script

echo "🚀 Setting up UBI Cryptocurrency..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v16 or higher."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p models
mkdir -p uploads
mkdir -p build/contracts

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "⚙️  Creating .env file..."
    cp env.example .env
    echo "📝 Please edit .env file with your configuration"
fi

# Download face detection models (if not present)
if [ ! -f "models/tiny_face_detector_model-weights_manifest.json" ]; then
    echo "🤖 Face detection models not found. Please download them manually:"
    echo "   1. Go to: https://github.com/justadudewhohacks/face-api.js/tree/master/weights"
    echo "   2. Download the following files to the models/ directory:"
    echo "      - tiny_face_detector_model-weights_manifest.json"
    echo "      - tiny_face_detector_model-shard1"
    echo "      - face_landmark_68_model-weights_manifest.json"
    echo "      - face_landmark_68_model-shard1"
    echo "      - face_recognition_model-weights_manifest.json"
    echo "      - face_recognition_model-shard1"
    echo "      - face_expression_model-weights_manifest.json"
    echo "      - face_expression_model-shard1"
    echo "      - age_gender_model-weights_manifest.json"
    echo "      - age_gender_model-shard1"
fi

# Compile smart contracts
echo "🔨 Compiling smart contracts..."
npm run compile

echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development server:"
echo "   npm run dev"
echo ""
echo "🌐 Then open http://localhost:3000 in your browser"
echo ""
echo "📚 For more information, see README.md"
