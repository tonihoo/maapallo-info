import hashlib

from database import Base
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship


class AnalyticsSession(Base):
    """Track analytics sessions in EU-compliant way"""

    __tablename__ = "analytics_session"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="gen_random_uuid()",
    )
    session_hash = Column(String(64), nullable=False, unique=True)
    ip_hash = Column(String(64), nullable=False)
    user_agent_hash = Column(String(64))
    country = Column(String(2))
    first_seen = Column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP"
    )
    last_seen = Column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP"
    )
    page_views = Column(Integer, default=0)
    created_at = Column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP"
    )
    updated_at = Column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP"
    )

    # Relationships
    pageviews = relationship(
        "PageView", back_populates="session", cascade="all, delete-orphan"
    )
    events = relationship(
        "CustomEvent", back_populates="session", cascade="all, delete-orphan"
    )

    @classmethod
    def hash_ip(cls, ip: str) -> str:
        """Hash IP address for privacy compliance"""
        salt = "maapallo_analytics_salt_2025"
        return hashlib.sha256(f"{ip}{salt}".encode()).hexdigest()

    @classmethod
    def hash_user_agent(cls, user_agent: str) -> str:
        """Hash user agent for privacy compliance"""
        salt = "maapallo_ua_salt_2025"
        return hashlib.sha256(f"{user_agent}{salt}".encode()).hexdigest()

    @classmethod
    def generate_session_hash(cls, ip: str, user_agent: str) -> str:
        """Generate session hash from IP and user agent"""
        combined = f"{ip}|{user_agent}"
        salt = "maapallo_session_salt_2025"
        return hashlib.sha256(f"{combined}{salt}".encode()).hexdigest()


class PageView(Base):
    """Track page views linked to sessions"""

    __tablename__ = "page_view"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="gen_random_uuid()",
    )
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analytics_session.id", ondelete="CASCADE"),
    )
    page_path = Column(String(500), nullable=False)
    page_title = Column(String(500))
    referrer = Column(String(500))
    timestamp = Column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP"
    )
    created_at = Column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP"
    )

    # Relationship
    session = relationship("AnalyticsSession", back_populates="pageviews")


class CustomEvent(Base):
    """Track custom events (map interactions, feature selections, etc.)"""

    __tablename__ = "custom_event"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default="gen_random_uuid()",
    )
    session_id = Column(
        UUID(as_uuid=True),
        ForeignKey("analytics_session.id", ondelete="CASCADE"),
    )
    event_name = Column(String(255), nullable=False)
    event_data = Column(JSONB)
    timestamp = Column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP"
    )
    created_at = Column(
        DateTime(timezone=True), server_default="CURRENT_TIMESTAMP"
    )

    # Relationship
    session = relationship("AnalyticsSession", back_populates="events")
