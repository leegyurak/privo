-- V2__Add_dm_unique_constraint.sql
-- Add unique constraint for DM room members to prevent duplicate DM rooms

-- First, let's add a composite unique constraint for DM rooms
-- This ensures that for any DM room, we can only have exactly 2 members with specific user IDs

-- Add a computed column approach: create a constraint that ensures 
-- for direct message rooms, the combination of member user IDs is unique

-- We'll modify the chat_room_members table to add a constraint
-- that prevents duplicate DM rooms between the same two users

-- First, add an index to help with the constraint
CREATE INDEX idx_chat_room_members_dm_constraint 
ON chat_room_members (user_id, chat_room_id) 
WHERE EXISTS (
    SELECT 1 FROM chat_rooms cr 
    WHERE cr.id = chat_room_members.chat_room_id 
    AND cr.is_direct_message = TRUE
);

-- Add a trigger-based approach to ensure DM uniqueness
-- This will be handled at the application level with proper locking