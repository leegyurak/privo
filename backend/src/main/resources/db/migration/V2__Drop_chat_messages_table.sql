-- V2__Drop_chat_messages_table.sql
-- Drop chat_messages table as we no longer store message history in DB
-- Messages are now handled via Redis for offline storage only

DROP TABLE IF EXISTS chat_messages;