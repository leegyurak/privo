package com.privo.domain.model

import org.junit.jupiter.api.Test
import java.time.LocalDateTime
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ChatMessageTest {
    
    @Test
    fun `should create chat message with default values`() {
        val message = ChatMessage(
            chatRoomId = "room123",
            senderHashedId = "sender456",
            encryptedContent = "encrypted-content",
            contentIv = "iv-string"
        )
        
        assertTrue(message.id.isNotBlank())
        assertEquals("room123", message.chatRoomId)
        assertEquals("sender456", message.senderHashedId)
        assertEquals("encrypted-content", message.encryptedContent)
        assertEquals("iv-string", message.contentIv)
        assertEquals(MessageType.TEXT, message.messageType)
        assertTrue(message.timestamp.isBefore(LocalDateTime.now().plusSeconds(1)))
        assertFalse(message.isDeleted)
    }
    
    @Test
    fun `should create chat message with custom message type`() {
        val message = ChatMessage(
            chatRoomId = "room123",
            senderHashedId = "sender456",
            encryptedContent = "encrypted-image-data",
            contentIv = "iv-string",
            messageType = MessageType.IMAGE
        )
        
        assertEquals(MessageType.IMAGE, message.messageType)
    }
    
    @Test
    fun `should mark message as deleted`() {
        val originalMessage = ChatMessage(
            chatRoomId = "room123",
            senderHashedId = "sender456",
            encryptedContent = "encrypted-content",
            contentIv = "iv-string"
        )
        
        val deletedMessage = originalMessage.markAsDeleted()
        
        assertEquals(originalMessage.id, deletedMessage.id)
        assertEquals(originalMessage.chatRoomId, deletedMessage.chatRoomId)
        assertEquals(originalMessage.senderHashedId, deletedMessage.senderHashedId)
        assertEquals(originalMessage.encryptedContent, deletedMessage.encryptedContent)
        assertEquals(originalMessage.contentIv, deletedMessage.contentIv)
        assertEquals(originalMessage.messageType, deletedMessage.messageType)
        assertEquals(originalMessage.timestamp, deletedMessage.timestamp)
        assertTrue(deletedMessage.isDeleted)
        assertFalse(originalMessage.isDeleted) // Original should be unchanged
    }
    
    @Test
    fun `should implement equals and hashCode correctly`() {
        val message1 = ChatMessage(
            id = "same-id",
            chatRoomId = "room1",
            senderHashedId = "sender1",
            encryptedContent = "content1",
            contentIv = "iv1"
        )
        
        val message2 = ChatMessage(
            id = "same-id",
            chatRoomId = "room2",
            senderHashedId = "sender2",
            encryptedContent = "content2",
            contentIv = "iv2"
        )
        
        val message3 = ChatMessage(
            id = "different-id",
            chatRoomId = "room1",
            senderHashedId = "sender1",
            encryptedContent = "content1",
            contentIv = "iv1"
        )
        
        assertEquals(message1, message2) // Same ID
        assertFalse(message1.equals(message3)) // Different ID
        assertEquals(message1.hashCode(), message2.hashCode())
    }
    
    @Test
    fun `should have meaningful toString`() {
        val message = ChatMessage(
            id = "msg-123",
            chatRoomId = "room-456",
            senderHashedId = "sender-789",
            encryptedContent = "secret-content",
            contentIv = "iv-abc",
            messageType = MessageType.TEXT
        )
        
        val toString = message.toString()
        
        assertTrue(toString.contains("msg-123"))
        assertTrue(toString.contains("room-456"))
        assertTrue(toString.contains("TEXT"))
        assertFalse(toString.contains("secret-content")) // Should not expose encrypted content
        assertFalse(toString.contains("sender-789")) // Should not expose sender info
    }
}

class MessageTypeTest {
    
    @Test
    fun `should have all expected message types`() {
        val types = MessageType.values()
        
        assertTrue(types.contains(MessageType.TEXT))
        assertTrue(types.contains(MessageType.IMAGE))
        assertTrue(types.contains(MessageType.FILE))
        assertTrue(types.contains(MessageType.SYSTEM))
        assertEquals(4, types.size)
    }
}