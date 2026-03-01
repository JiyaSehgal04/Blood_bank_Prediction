from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import DATABASE_URL

# pool_pre_ping not used with SQLite; SQLite needs check_same_thread=False
kwargs = (
    {"pool_pre_ping": True}
    if "sqlite" not in DATABASE_URL
    else {"connect_args": {"check_same_thread": False}}
)
engine = create_engine(DATABASE_URL, **kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()