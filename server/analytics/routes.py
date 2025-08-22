import os
from datetime import datetime, timedelta
from typing import Any, Dict

import geoip2.database
from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from .models import AnalyticsSession, CustomEvent, PageView

router = APIRouter(tags=["analytics"])


def get_country_from_ip(ip: str) -> str:
    """Get country code from IP address using GeoIP2 (optional)"""
    try:
        # You can download GeoLite2-Country.mmdb from MaxMind for free
        geoip_path = os.getenv("GEOIP_DATABASE_PATH")
        if geoip_path and os.path.exists(geoip_path):
            with geoip2.database.Reader(geoip_path) as reader:
                response = reader.country(ip)
                return response.country.iso_code or "FI"
    except Exception:
        # Default to Finland if GeoIP fails
        pass
    return "FI"


def get_client_ip(request: Request) -> str:
    """Extract client IP from request"""
    # Check for forwarded headers (for proxy/load balancer)
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip

    # Fallback to direct connection
    if hasattr(request.client, "host"):
        return request.client.host

    return "127.0.0.1"


def check_consent(request: Request) -> bool:
    """Check if user has given consent for analytics tracking"""
    # Check for consent cookie or header
    consent_cookie = request.cookies.get("analytics_consent")
    consent_header = request.headers.get("x-analytics-consent")

    return consent_cookie == "true" or consent_header == "true"


async def get_or_create_session(
    db: AsyncSession, ip: str, user_agent: str, country: str
) -> AnalyticsSession:
    """Get existing session or create new one"""
    session_hash = AnalyticsSession.generate_session_hash(ip, user_agent)

    # Try to find existing session
    stmt = select(AnalyticsSession).where(
        AnalyticsSession.session_hash == session_hash
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if session:
        # Update last seen and page views
        session.last_seen = datetime.utcnow()
        session.page_views += 1
    else:
        # Create new session
        session = AnalyticsSession(
            session_hash=session_hash,
            ip_hash=AnalyticsSession.hash_ip(ip),
            user_agent_hash=AnalyticsSession.hash_user_agent(user_agent),
            country=country,
        )
        db.add(session)

    await db.commit()
    await db.refresh(session)
    return session


@router.post("/pageview")
async def track_pageview(
    request: Request,
    page_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
):
    """Track a page view"""
    # Check consent first
    if not check_consent(request):
        return {"status": "consent_required"}

    try:
        ip = get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        country = get_country_from_ip(ip)

        # Get or create session
        session = await get_or_create_session(db, ip, user_agent, country)

        # Create page view record
        page_view = PageView(
            session_id=session.id,
            page_path=page_data.get("path", "/"),
            page_title=page_data.get("title"),
            referrer=page_data.get("referrer"),
        )

        db.add(page_view)
        await db.commit()

        return {"status": "tracked", "session_id": str(session.id)}

    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}


@router.post("/event")
async def track_event(
    request: Request,
    event_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
):
    """Track a custom event"""
    # Check consent first
    if not check_consent(request):
        return {"status": "consent_required"}

    try:
        ip = get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        country = get_country_from_ip(ip)

        # Get or create session
        session = await get_or_create_session(db, ip, user_agent, country)

        # Create custom event record
        event = CustomEvent(
            session_id=session.id,
            event_name=event_data.get("name", "unknown"),
            event_data=event_data.get("data", {}),
        )

        db.add(event)
        await db.commit()

        return {"status": "tracked", "session_id": str(session.id)}

    except Exception as e:
        await db.rollback()
        return {"status": "error", "message": str(e)}


@router.get("/stats")
async def get_basic_stats(
    days: int = 30, db: AsyncSession = Depends(get_db)
):
    """Get basic analytics statistics (public endpoint)"""

    since_date = datetime.utcnow() - timedelta(days=days)

    # Total page views
    stmt = select(func.count(PageView.id)).where(
        PageView.timestamp >= since_date
    )
    result = await db.execute(stmt)
    total_pageviews = result.scalar()

    # Unique visitors (unique sessions)
    stmt = select(func.count(func.distinct(PageView.session_id))).where(
        PageView.timestamp >= since_date
    )
    result = await db.execute(stmt)
    unique_visitors = result.scalar()

    # Top pages
    stmt = (
        select(PageView.page_path, func.count(PageView.id).label("views"))
        .where(PageView.timestamp >= since_date)
        .group_by(PageView.page_path)
        .order_by(func.count(PageView.id).desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    top_pages = [
        {"path": row.page_path, "views": row.views} for row in result.all()
    ]

    # Countries (aggregate data only)
    stmt = (
        select(
            AnalyticsSession.country,
            func.count(AnalyticsSession.id).label("sessions"),
        )
        .where(AnalyticsSession.created_at >= since_date)
        .group_by(AnalyticsSession.country)
        .order_by(func.count(AnalyticsSession.id).desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    countries = [
        {"country": row.country, "sessions": row.sessions}
        for row in result.all()
    ]

    return {
        "period_days": days,
        "total_pageviews": total_pageviews or 0,
        "unique_visitors": unique_visitors or 0,
        "top_pages": top_pages,
        "top_countries": countries,
        "privacy_note": "All data is anonymized and GDPR compliant",
    }
