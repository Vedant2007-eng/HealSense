from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# For the hackathon demo, we use SQLite (zero setup).
# To switch to PostgreSQL later, just change this line:
#   SQLALCHEMY_DATABASE_URL = "postgresql://postgres:yourpassword@localhost:5432/healsense"
SQLALCHEMY_DATABASE_URL = "sqlite:///./healsense.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite only
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency that gives each request a DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
