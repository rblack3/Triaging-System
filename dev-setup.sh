#!/bin/bash

# Triaging System - Development Setup Script
echo "🚀 Setting up Triaging System for development..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed. Please install Docker and try again."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is required but not installed. Please install Docker Compose and try again."  
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp env.example .env
fi

# Create data directory for backend
mkdir -p backend/data

echo "🐳 Starting services with Docker Compose..."
docker-compose up --build

echo "✅ Setup complete! The application should be running at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
