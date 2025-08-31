from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(enum.Enum):
    CUSTOMER = "customer"
    BUSINESS = "business" 
    VENDOR = "vendor"

class TicketStatus(enum.Enum):
    OPEN = "open"                    # Customer created ticket
    BUSINESS_ASSIGNED = "business_assigned"  # Business received ticket
    VENDOR_CONTACTED = "vendor_contacted"    # Business contacted vendor
    VENDOR_RESPONDED = "vendor_responded"    # Vendor provided response
    RESOLVED = "resolved"            # Business responded to customer
    CLOSED = "closed"               # Ticket closed

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Ticket(Base):
    __tablename__ = "tickets"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(TicketStatus), default=TicketStatus.OPEN)
    customer_id = Column(Integer, ForeignKey("users.id"))
    business_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    vendor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    customer = relationship("User", foreign_keys=[customer_id])
    business = relationship("User", foreign_keys=[business_id])
    vendor = relationship("User", foreign_keys=[vendor_id])
    messages = relationship("Message", back_populates="ticket")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="general")  # general, vendor_request, vendor_response, resolution
    created_at = Column(DateTime, default=datetime.utcnow)
    
    ticket = relationship("Ticket", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    recipient = relationship("User", foreign_keys=[recipient_id])
