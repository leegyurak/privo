-- V1__Initial_schema.sql
-- Initial database schema for Privo E2E encrypted chat application

-- Users table
CREATE TABLE users (
    id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    public_key_hash VARCHAR(255) NOT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_expiry DATETIME(6),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    INDEX idx_users_email (email),
    INDEX idx_users_verification_token (email_verification_token),
    INDEX idx_users_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat rooms table
CREATE TABLE chat_rooms (
    id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_direct_message BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    PRIMARY KEY (id),
    INDEX idx_chat_rooms_created_at (created_at),
    INDEX idx_chat_rooms_updated_at (updated_at),
    INDEX idx_chat_rooms_is_direct_message (is_direct_message)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat room members table
CREATE TABLE chat_room_members (
    id VARCHAR(36) NOT NULL,
    chat_room_id VARCHAR(36) NOT NULL,
    user_hashed_id VARCHAR(255) NOT NULL,
    role ENUM('OWNER', 'ADMIN', 'MEMBER') NOT NULL DEFAULT 'MEMBER',
    joined_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    left_at DATETIME(6),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    PRIMARY KEY (id),
    INDEX idx_chat_room_members_room (chat_room_id),
    INDEX idx_chat_room_members_user (user_hashed_id),
    INDEX idx_chat_room_members_active (is_active),
    INDEX idx_chat_room_members_joined_at (joined_at),
    UNIQUE KEY uk_chat_room_members (chat_room_id, user_hashed_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat messages table
CREATE TABLE chat_messages (
    id VARCHAR(36) NOT NULL,
    chat_room_id VARCHAR(36) NOT NULL,
    sender_hashed_id VARCHAR(255) NOT NULL,
    encrypted_content TEXT NOT NULL,
    content_iv VARCHAR(255) NOT NULL,
    message_type ENUM('TEXT', 'IMAGE', 'FILE', 'SYSTEM') NOT NULL DEFAULT 'TEXT',
    timestamp DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    PRIMARY KEY (id),
    INDEX idx_chat_messages_room_timestamp (chat_room_id, timestamp),
    INDEX idx_chat_messages_sender (sender_hashed_id),
    INDEX idx_chat_messages_timestamp (timestamp),
    INDEX idx_chat_messages_room_type (chat_room_id, message_type),
    INDEX idx_chat_messages_not_deleted (chat_room_id, is_deleted, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;