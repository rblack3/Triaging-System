from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Dict
import json
from datetime import datetime

from app.database import get_db, create_tables, init_demo_users
from app.models import User, Ticket, Message, UserRole, TicketStatus
from app.websocket_manager import ConnectionManager

app = FastAPI(title="Triaging System API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://triaging-system.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = ConnectionManager()

@app.on_event("startup")
async def startup():
    create_tables()
    init_demo_users()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

@app.get("/users")
async def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": user.id, "username": user.username, "role": user.role.value} for user in users]

@app.get("/tickets/{user_id}")
async def get_user_tickets(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.role == UserRole.CUSTOMER:
        tickets = db.query(Ticket).filter(Ticket.customer_id == user_id).all()
    elif user.role == UserRole.BUSINESS:
        # business sees all tickets
        tickets = db.query(Ticket).all()
    else:
        tickets = db.query(Ticket).filter(Ticket.vendor_id == user_id).all()
    
    return [
        {
            "id": ticket.id,
            "title": ticket.title,
            "description": ticket.description,
            "status": ticket.status.value,
            "created_at": ticket.created_at,
            "customer": {"id": ticket.customer.id, "username": ticket.customer.username},
            "business": {"id": ticket.business.id, "username": ticket.business.username} if ticket.business else None,
            "vendor": {"id": ticket.vendor.id, "username": ticket.vendor.username} if ticket.vendor else None,
        }
        for ticket in tickets
    ]

# Create new ticket (customer)
@app.post("/tickets")
async def create_ticket(
    title: str = Form(),
    description: str = Form(),
    customer_id: int = Form(),
    db: Session = Depends(get_db)
):
    customer = db.query(User).filter(User.id == customer_id).first()
    if not customer or customer.role != UserRole.CUSTOMER:
        raise HTTPException(status_code=400, detail="Invalid customer")
    
    ticket = Ticket(
        title=title,
        description=description,
        customer_id=customer_id,
        status=TicketStatus.OPEN
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    
    await manager.broadcast(json.dumps({
        "type": "new_ticket",
        "ticket_id": ticket.id,
        "title": title,
        "customer": customer.username
    }))
    
    return {"id": ticket.id, "message": "Ticket created successfully"}
@app.post("/tickets/{ticket_id}/assign")
async def assign_business(
    ticket_id: int,
    business_id: int = Form(),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    business = db.query(User).filter(User.id == business_id).first()
    
    if not ticket or not business or business.role != UserRole.BUSINESS:
        raise HTTPException(status_code=400, detail="Invalid ticket or business user")
    
    ticket.business_id = business_id
    ticket.status = TicketStatus.BUSINESS_ASSIGNED
    db.commit()
    
    await manager.broadcast(json.dumps({
        "type": "ticket_assigned",
        "ticket_id": ticket_id,
        "business": business.username
    }))
    
    return {"message": "Ticket assigned successfully"}
@app.post("/tickets/{ticket_id}/contact-vendor")
async def contact_vendor(
    ticket_id: int,
    vendor_id: int = Form(),
    message: str = Form(),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    vendor = db.query(User).filter(User.id == vendor_id).first()
    
    if not ticket or not vendor or vendor.role != UserRole.VENDOR:
        raise HTTPException(status_code=400, detail="Invalid ticket or vendor")
    
    ticket.vendor_id = vendor_id
    ticket.status = TicketStatus.VENDOR_CONTACTED
    
    vendor_message = Message(
        ticket_id=ticket_id,
        sender_id=ticket.business_id,
        recipient_id=vendor_id,
        content=message,
        message_type="vendor_request"
    )
    
    db.add(vendor_message)
    db.commit()
    
    await manager.broadcast(json.dumps({
        "type": "vendor_contacted",
        "ticket_id": ticket_id,
        "vendor": vendor.username,
        "message": message
    }))
    
    return {"message": "Vendor contacted successfully"}
@app.post("/tickets/{ticket_id}/send-message")
async def send_message(
    ticket_id: int,
    sender_id: int = Form(),
    content: str = Form(),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    sender = db.query(User).filter(User.id == sender_id).first()
    
    if not ticket or not sender:
        raise HTTPException(status_code=400, detail="Invalid ticket or sender")
    
    if sender.role == UserRole.BUSINESS:
        recipient_id = ticket.vendor_id
        message_type = "business_to_vendor"
    elif sender.role == UserRole.VENDOR:
        recipient_id = ticket.business_id
        message_type = "vendor_to_business"
        if ticket.status == TicketStatus.VENDOR_CONTACTED:
            ticket.status = TicketStatus.VENDOR_RESPONDED
    else:
        raise HTTPException(status_code=400, detail="Only business and vendor can send messages")
    
    message = Message(
        ticket_id=ticket_id,
        sender_id=sender_id,
        recipient_id=recipient_id,
        content=content,
        message_type=message_type
    )
    
    db.add(message)
    db.commit()
    
    await manager.broadcast(json.dumps({
        "type": "new_message",
        "ticket_id": ticket_id,
        "sender": sender.username,
        "content": content
    }))
    
    return {"message": "Message sent successfully"}
@app.post("/tickets/{ticket_id}/resolve")
async def resolve_ticket(
    ticket_id: int,
    business_id: int = Form(),
    resolution: str = Form(),
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket or ticket.business_id != business_id:
        raise HTTPException(status_code=400, detail="Invalid ticket or business user")
    
    ticket.status = TicketStatus.RESOLVED
    
    resolution_message = Message(
        ticket_id=ticket_id,
        sender_id=business_id,
        recipient_id=ticket.customer_id,
        content=resolution,
        message_type="resolution"
    )
    
    db.add(resolution_message)
    db.commit()
    
    await manager.broadcast(json.dumps({
        "type": "ticket_resolved",
        "ticket_id": ticket_id,
        "resolution": resolution
    }))
    
    return {"message": "Ticket resolved successfully"}
@app.get("/tickets/{ticket_id}/messages")
async def get_ticket_messages(ticket_id: int, user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    messages = db.query(Message).filter(Message.ticket_id == ticket_id).all()
    
    if user.role == UserRole.CUSTOMER:
        filtered_messages = [msg for msg in messages if msg.message_type == "resolution"]
    else:
        filtered_messages = messages
    
    return [
        {
            "id": message.id,
            "content": message.content,
            "message_type": message.message_type,
            "created_at": message.created_at,
            "sender": {"id": message.sender.id, "username": message.sender.username, "role": message.sender.role.value},
            "recipient": {"id": message.recipient.id, "username": message.recipient.username, "role": message.recipient.role.value} if message.recipient else None,
        }
        for message in filtered_messages
    ]
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
