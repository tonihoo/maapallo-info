-- Analytics Tables Migration
-- Creates tables for privacy-focused analytics tracking

-- Drop existing analytics tables if they exist
DROP TABLE IF EXISTS page_view CASCADE;
DROP TABLE IF EXISTS custom_event CASCADE;
DROP TABLE IF EXISTS analytics_session CASCADE;

-- Create analytics_session table
CREATE TABLE analytics_session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_hash VARCHAR(64) NOT NULL UNIQUE,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent_hash VARCHAR(64),
    country VARCHAR(2),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    page_views INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create page_view table
CREATE TABLE page_view (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES analytics_session(id) ON DELETE CASCADE,
    page_path VARCHAR(500) NOT NULL,
    page_title VARCHAR(500),
    referrer VARCHAR(500),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create custom_event table
CREATE TABLE custom_event (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES analytics_session(id) ON DELETE CASCADE,
    event_name VARCHAR(255) NOT NULL,
    event_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_analytics_session_session_hash ON analytics_session(session_hash);
CREATE INDEX idx_analytics_session_created_at ON analytics_session(created_at);
CREATE INDEX idx_page_view_session_id ON page_view(session_id);
CREATE INDEX idx_page_view_timestamp ON page_view(timestamp);
CREATE INDEX idx_page_view_page_path ON page_view(page_path);
CREATE INDEX idx_custom_event_session_id ON custom_event(session_id);
CREATE INDEX idx_custom_event_timestamp ON custom_event(timestamp);
CREATE INDEX idx_custom_event_name ON custom_event(event_name);
