-- PostgreSQL Lab Artifact: Seat Reservation Lifecycle & Concurrency Verification
-- Path: tools/labs/verify_lab.sql

-- 1. CLEANUP & TYPE DEFINITIONS
DROP TABLE IF EXISTS transactional_outbox CASCADE;
DROP TABLE IF EXISTS hold_items CASCADE;
DROP TABLE IF EXISTS seat_holds CASCADE;
DROP TYPE IF EXISTS hold_status_enum CASCADE;

-- Consistent State Vocabulary across Domain and Database (FG-FND-004)
CREATE TYPE hold_status_enum AS ENUM ('HELD', 'CONFIRMED', 'EXPIRED', 'CANCELLED');

-- 2. SCHEMAS
CREATE TABLE seat_holds (
    hold_id UUID PRIMARY KEY,
    showtime_id VARCHAR(64) NOT NULL,
    customer_id VARCHAR(64) NOT NULL,
    status hold_status_enum NOT NULL DEFAULT 'HELD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT chk_expires_after_created CHECK (expires_at > created_at)
);

CREATE TABLE hold_items (
    item_id BIGSERIAL PRIMARY KEY,
    hold_id UUID NOT NULL REFERENCES seat_holds(hold_id) ON DELETE CASCADE,
    showtime_id VARCHAR(64) NOT NULL,
    seat_id VARCHAR(32) NOT NULL,
    status hold_status_enum NOT NULL DEFAULT 'HELD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactional_outbox (
    event_id UUID PRIMARY KEY,
    aggregate_type VARCHAR(64) NOT NULL,
    aggregate_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. LIFECYCLE GUARD: Partial Unique Index
-- CRITICAL FIX (FG-FND-001): Index ONLY active holds ('HELD') and confirmed bookings ('CONFIRMED').
-- When status becomes 'EXPIRED' or 'CANCELLED', the row is excluded from this index predicate,
-- allowing safe seat reuse.
CREATE UNIQUE INDEX idx_uniq_active_seat_hold 
ON hold_items (showtime_id, seat_id) 
WHERE (status IN ('HELD', 'CONFIRMED'));
