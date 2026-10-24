-- Add verification_notes column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_notes TEXT;
