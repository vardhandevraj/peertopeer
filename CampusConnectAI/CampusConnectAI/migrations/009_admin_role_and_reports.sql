-- Admin roles + report verification workflow.
--   - adds users.role (USER | ADMIN), backfilled from the existing is_admin flag
--   - migrates reports onto the PENDING / UNDER_REVIEW / RESOLVED / DISMISSED
--     verification workflow
--   - adds reports.admin_notes so a moderator can record the outcome of a review
-- Run this file ONCE in the Supabase SQL Editor against databases created
-- before this feature. Fresh installs get the schema from supabase_schema.sql.

-- 1. Role column on users, backfilled from the legacy admin flag.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER';
UPDATE users SET role = 'ADMIN' WHERE is_admin = TRUE;

-- 2. Reports: drop the old status constraint, migrate existing rows, then
-- reinstate it around the new workflow values.
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
UPDATE reports SET status = 'PENDING'    WHERE status = 'open';
UPDATE reports SET status = 'RESOLVED'   WHERE status = 'resolved';
UPDATE reports SET status = 'DISMISSED'  WHERE status = 'dismissed';
ALTER TABLE reports ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE reports
    ADD CONSTRAINT reports_status_check
    CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'));

-- 3. Moderator notes captured while a report is being reviewed.
ALTER TABLE reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;