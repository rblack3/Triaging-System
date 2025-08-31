import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, User, UserRole

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./triaging.db")

if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_demo_users():
    db = SessionLocal()
    
    if db.query(User).count() > 0:
        db.close()
        return
    
    demo_users = [
        User(username="Customer", role=UserRole.CUSTOMER),
        User(username="Business", role=UserRole.BUSINESS),
        User(username="Vendor", role=UserRole.VENDOR),
    ]
    
    for user in demo_users:
        db.add(user)
    
    db.commit()
    db.close()
