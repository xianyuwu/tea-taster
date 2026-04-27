from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func
from sqlalchemy import JSON
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(32), nullable=False, unique=True)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(10), nullable=False, default="user")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now())


class Tea(Base):
    __tablename__ = "teas"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    scores = Column(JSON, nullable=False, default=dict)
    note = Column(Text, nullable=False, default="")
    photo = Column(String(255), nullable=False, default="")
    extra_fields = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now())


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    content = Column(Text, nullable=False, default="")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    stale = Column(Boolean, nullable=False, default=False)


class Note(Base):
    __tablename__ = "notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False, default="")
    content = Column(Text, nullable=False)
    source = Column(String(20), nullable=False, default="manual")
    tags = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now())


class ConfigItem(Base):
    __tablename__ = "config"

    key = Column(String(100), primary_key=True)
    value = Column(Text, nullable=False, default="")
