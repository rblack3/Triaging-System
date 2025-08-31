# Triaging System - Simplified Architecture

A streamlined triaging system that facilitates communication between customers, businesses, and vendors.

## Project Structure

```
triaging-system/
├── README.md                    # Complete documentation
├── docker-compose.yml           # Local development setup
├── .env.example                 # Environment variables template
├── railway.toml                 # Backend deployment config
├── vercel.json                  # Frontend deployment config
│
├── backend/                     # Python FastAPI backend
│   ├── app/
│   │   ├── main.py             # FastAPI app with WebSocket support
│   │   ├── database.py         # SQLite/PostgreSQL setup
│   │   ├── models.py           # SQLAlchemy models (User, Ticket, Message)
│   │   └── websocket_manager.py # Real-time WebSocket handlers
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile              # Backend container
│
└── frontend/                   # Next.js React frontend
    ├── src/
    │   └── app/
    │       ├── layout.tsx      # Root layout
    │       ├── page.tsx        # Landing page with role selection
    │       ├── customer/       # Customer interface
    │       │   └── page.tsx    # Submit tickets, view responses
    │       ├── business/       # Business interface  
    │       │   └── page.tsx    # Manage tickets, contact vendors
    │       └── vendor/         # Vendor interface
    │           └── page.tsx    # Respond to business requests
    ├── package.json
    └── Dockerfile
```

## Key Features

- **Simple Role-Based System**: Switch between Customer, Business, and Vendor views
- **Real-Time Updates**: WebSocket connections for instant messaging
- **Async Vendor Handling**: Vendors can respond hours later, system handles gracefully
- **Single Database**: SQLite for local development, PostgreSQL for production
- **Easy Local Setup**: One `docker-compose up` command
- **Deployed Demo**: Hosted version for interaction testing

## Technology Stack

- **Backend**: Python FastAPI + SQLAlchemy + WebSockets
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Database**: SQLite (local) / PostgreSQL (production)
- **Deployment**: Vercel (frontend) + Railway (backend)
- **Real-time**: Native WebSocket connections

## Core Workflow

1. **Customer** creates a support ticket
2. **Business** receives ticket and forwards request to vendor
3. **Vendor** responds asynchronously (could be minutes/hours later)
4. **Business** formulates final response to customer
5. **Customer** receives resolution

## Quick Start

```bash
# Clone and start everything
git clone <repo>
cd triaging-system
cp env.example .env
chmod +x dev-setup.sh
./dev-setup.sh

# Or manually:
docker-compose up --build

# Access the application
open http://localhost:3000
```

## Live Demo

- **Frontend**: https://triaging-system.vercel.app
- **API**: https://triaging-system.railway.app
- **API Docs**: https://your-project.railway.app/docs

## Demo Instructions

1. Visit the live demo
2. Start as a **Customer** - create a support ticket
3. Switch to **Business** view - see the ticket and forward to vendor
4. Switch to **Vendor** view - respond to the business request
5. Back to **Business** - formulate final customer response
6. Back to **Customer** - see the resolution

## API Documentation

### Base URLs
- **Local**: `http://localhost:8000`
- **Production**: `https://triaging-system-production.up.railway.app`

### Core Endpoints
```
GET /health                              # Health check
GET /users                              # Get all demo users
GET /tickets/{user_id}                  # Get tickets for a user
POST /tickets                          # Create new ticket (customer)
POST /tickets/{ticket_id}/assign       # Business assigns to themselves
POST /tickets/{ticket_id}/contact-vendor # Business contacts vendor
POST /tickets/{ticket_id}/send-message  # Send message between business/vendor
POST /tickets/{ticket_id}/resolve      # Business resolves ticket
GET /tickets/{ticket_id}/messages      # Get all messages for a ticket
WS /ws/{user_id}                       # Real-time updates via WebSocket
```

### Message Types
- `general` - Regular message
- `vendor_request` - Business request to vendor
- `vendor_response` - Vendor response to business
- `resolution` - Final business response to customer

### Ticket Status Flow
1. `open` → Customer created ticket
2. `business_assigned` → Business took ownership
3. `vendor_contacted` → Business contacted vendor
4. `vendor_responded` → Vendor provided response
5. `resolved` → Business sent final response to customer

## Production Deployment

### Environment Variables

#### Railway (Backend)
Set in Railway dashboard → Variables:
```env
DATABASE_URL=sqlite:///./triaging.db
PORT=8000
CORS_ORIGINS=https://triaging-system.vercel.app
```

#### Vercel (Frontend)  
Set in Vercel dashboard → Settings → Environment Variables:
```env
NEXT_PUBLIC_API_URL=https://triaging-system-production.up.railway.app
NEXT_PUBLIC_WS_URL=wss://triaging-system-production.up.railway.app
```

### Database Migration (Production)
For production with PostgreSQL:
1. Railway → Add Plugin → PostgreSQL
2. Copy connection string to DATABASE_URL
3. Run database migrations on first deploy

### SSL & Security
- ✅ HTTPS enabled by default (Railway + Vercel)
- ✅ WebSocket over TLS (WSS)
- ✅ CORS configured for production domains
- ✅ Environment variables secured