-- V3__Replace_email_with_nickname.sql
-- Replace email field with nickname in users table

-- Add nickname column
ALTER TABLE users ADD COLUMN nickname VARCHAR(50) NOT NULL DEFAULT '';

-- Update existing users with temporary nicknames based on email local part
UPDATE users SET nickname = SUBSTRING_INDEX(email, '@', 1);

-- Drop email-related constraints and indexes
DROP INDEX uk_users_email ON users;
DROP INDEX idx_users_email ON users;
DROP INDEX idx_users_verification_token ON users;

-- Drop email-related columns
ALTER TABLE users 
    DROP COLUMN email,
    DROP COLUMN is_email_verified,
    DROP COLUMN email_verification_token,
    DROP COLUMN email_verification_expiry;

-- Add unique constraint for nickname
ALTER TABLE users ADD UNIQUE KEY uk_users_nickname (nickname);

-- Add index for nickname and other useful indexes
ALTER TABLE users ADD INDEX idx_users_nickname (nickname);
ALTER TABLE users ADD INDEX idx_users_nickname_created (nickname, created_at);

-- Add composite indexes for chat room queries
CREATE INDEX idx_chat_room_members_user_active ON chat_room_members (user_hashed_id, is_active, joined_at);
CREATE INDEX idx_chat_room_members_room_active ON chat_room_members (chat_room_id, is_active, role);

-- Add indexes for message pagination and filtering
CREATE INDEX idx_chat_messages_room_not_deleted_timestamp ON chat_messages (chat_room_id, is_deleted, timestamp DESC);
CREATE INDEX idx_chat_messages_sender_timestamp ON chat_messages (sender_hashed_id, timestamp DESC);

-- Add check constraints for data validation
ALTER TABLE users 
ADD CONSTRAINT chk_users_nickname_length 
CHECK (LENGTH(nickname) >= 2 AND LENGTH(nickname) <= 50);

ALTER TABLE users 
ADD CONSTRAINT chk_users_created_updated 
CHECK (updated_at >= created_at);

ALTER TABLE chat_room_members 
ADD CONSTRAINT chk_members_left_after_joined 
CHECK (left_at IS NULL OR left_at >= joined_at);

ALTER TABLE chat_room_members 
ADD CONSTRAINT chk_members_active_consistency 
CHECK ((is_active = TRUE AND left_at IS NULL) OR (is_active = FALSE AND left_at IS NOT NULL));