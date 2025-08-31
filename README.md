# Triaging System

A streamlined communication platform connecting customers, businesses, and vendors through an intelligent ticketing workflow.

## Live Demo

**https://triaging-system.vercel.app**

Try the complete workflow by switching between Customer, Business, and Vendor roles.

## Installation

```bash
# Clone and run with Docker
git clone https://github.com/rblack3/Triaging-System.git
cd triaging-system
docker-compose up --build

# Access at http://localhost:3000
```

## How to Use

1. **Customer**: Click "Customer" button and create a support ticket
2. **Business**: Switch to "Business" view, assign ticket, and contact vendor  
3. **Vendor**: Switch to "Vendor" view and respond to business request
4. **Business**: Return to formulate final customer response
5. **Customer**: Check back to see the resolution

## Features

- **Role-Based Interface**: Separate views for each user type
- **Real-Time Updates**: WebSocket messaging between all parties
- **Async Workflow**: Vendors can respond hours later without breaking flow
- **Single Database**: SQLite for dev, PostgreSQL for production
- **One-Command Setup**: Docker Compose handles everything

## Tech Stack

- **Backend**: FastAPI + SQLAlchemy + WebSockets
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Database**: SQLite/PostgreSQL
- **Deployment**: Vercel + Railway

## API Reference

**Base URL**: https://triaging-system-production.up.railway.app  
**Documentation**: https://triaging-system-production.up.railway.app/docs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | Get demo users |
| GET | `/tickets/{user_id}` | Get user's tickets |
| POST | `/tickets` | Create new ticket |
| POST | `/tickets/{id}/assign` | Assign to business |
| POST | `/tickets/{id}/contact-vendor` | Contact vendor |
| POST | `/tickets/{id}/resolve` | Resolve ticket |
| WS | `/ws/{user_id}` | Real-time updates |

**Ticket Flow**: `open → business_assigned → vendor_contacted → vendor_responded → resolved`

## Local Development

```bash
# Backend only
cd backend && uvicorn app.main:app --reload

# Frontend only  
cd frontend && npm run dev
```

## Project Structure

```
triaging-system/
├── docker-compose.yml           # Local development setup
├── railway.toml                 # Backend deployment config
├── backend/                     # FastAPI backend
│   ├── app/
│   │   ├── main.py             # FastAPI app + WebSockets
│   │   ├── database.py         # SQLite/PostgreSQL setup
│   │   ├── models.py           # Database models
│   │   └── websocket_manager.py # Real-time messaging
│   └── requirements.txt        # Python dependencies
└── frontend/                   # Next.js frontend
    ├── src/app/
    │   ├── page.tsx            # Landing page
    │   ├── customer/page.tsx   # Customer interface
    │   ├── business/page.tsx   # Business interface
    │   └── vendor/page.tsx     # Vendor interface
    └── package.json
```