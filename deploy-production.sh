#!/bin/bash

echo "🚀 Deploying Triaging System to Production..."

# Check if required tools are installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Install with: npm install -g @railway/cli"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install with: npm install -g vercel"  
    exit 1
fi

# Deploy backend to Railway
echo "📡 Deploying backend to Railway..."
cd backend
railway login
railway up

# Get Railway URL
RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url')
echo "✅ Backend deployed to: $RAILWAY_URL"

# Deploy frontend to Vercel
echo "🌐 Deploying frontend to Vercel..."
cd ../
vercel --prod

echo ""
echo "🎉 Deployment Complete!"
echo "📋 Next steps:"
echo "1. Update Vercel environment variables with Railway URL: $RAILWAY_URL"
echo "2. Update Railway CORS settings with your Vercel URL"
echo "3. Test the production deployment"
echo ""
echo "🔗 Access your app at: https://triaging-system.vercel.app"
echo "📖 API docs at: $RAILWAY_URL/docs"
