package com.privo.application.usecase

import com.privo.application.dto.SendMessageRequest
import com.privo.domain.model.ChatMessage
import com.privo.domain.model.ChatRoomMember
import com.privo.domain.model.MemberRole
import com.privo.domain.model.MessageType
import com.privo.domain.repository.ChatMessageRepository
import com.privo.domain.repository.ChatRoomMemberRepository
import com.privo.infrastructure.messaging.EventPublisher
import com.privo.infrastructure.messaging.MessageSentEvent
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull

class SendMessageUseCaseTest {
    
    private val chatMessageRepository = mockk<ChatMessageRepository>()
    private val chatRoomMemberRepository = mockk<ChatRoomMemberRepository>()
    private val eventPublisher = mockk<EventPublisher>()
    
    private val sendMessageUseCase = SendMessageUseCase(
        chatMessageRepository = chatMessageRepository,
        chatRoomMemberRepository = chatRoomMemberRepository,
        eventPublisher = eventPublisher
    )
    
    @Test
    fun `should send message successfully`() {
        // Given
        val chatRoomId = "room-123"
        val senderHashedId = "sender-456"
        val request = SendMessageRequest(
            encryptedContent = "encrypted-content",
            contentIv = "iv-string",
            messageType = "TEXT"
        )
        
        val membership = ChatRoomMember(
            id = "member-123",
            chatRoomId = chatRoomId,
            userHashedId = senderHashedId,
            role = MemberRole.MEMBER,
            isActive = true
        )
        
        val messageSlot = slot<ChatMessage>()
        val eventSlot = slot<MessageSentEvent>()
        val savedMessage = ChatMessage(
            id = "msg-123",
            chatRoomId = chatRoomId,
            senderHashedId = senderHashedId,
            encryptedContent = request.encryptedContent,
            contentIv = request.contentIv,
            messageType = MessageType.TEXT
        )
        
        every { chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId) } returns membership
        every { chatMessageRepository.save(capture(messageSlot)) } returns savedMessage
        every { eventPublisher.publishChatEvent(capture(eventSlot)) } returns Unit
        
        // When
        val response = sendMessageUseCase.execute(chatRoomId, request, senderHashedId)
        
        // Then
        assertNotNull(response)
        assertEquals(savedMessage.id, response.id)
        assertEquals(chatRoomId, response.chatRoomId)
        assertEquals(senderHashedId, response.senderHashedId)
        assertEquals(request.encryptedContent, response.encryptedContent)
        assertEquals(request.contentIv, response.contentIv)
        assertEquals("TEXT", response.messageType)
        assertFalse(response.isDeleted)
        
        val capturedMessage = messageSlot.captured
        assertEquals(chatRoomId, capturedMessage.chatRoomId)
        assertEquals(senderHashedId, capturedMessage.senderHashedId)
        assertEquals(request.encryptedContent, capturedMessage.encryptedContent)
        assertEquals(request.contentIv, capturedMessage.contentIv)
        assertEquals(MessageType.TEXT, capturedMessage.messageType)
        
        val capturedEvent = eventSlot.captured
        assertEquals(chatRoomId, capturedEvent.chatRoomId)
        assertEquals(savedMessage.id, capturedEvent.messageId)
        assertEquals(senderHashedId, capturedEvent.senderHashedId)
        assertEquals(request.encryptedContent, capturedEvent.encryptedContent)
        assertEquals(request.contentIv, capturedEvent.contentIv)
        assertEquals("TEXT", capturedEvent.messageType)
        
        verify { chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId) }
        verify { chatMessageRepository.save(any()) }
        verify { eventPublisher.publishChatEvent(any()) }
    }
    
    @Test
    fun `should handle different message types correctly`() {
        // Given
        val chatRoomId = "room-123"
        val senderHashedId = "sender-456"
        val request = SendMessageRequest(
            encryptedContent = "encrypted-image-data",
            contentIv = "iv-string",
            messageType = "image" // lowercase
        )
        
        val membership = ChatRoomMember(
            id = "member-123",
            chatRoomId = chatRoomId,
            userHashedId = senderHashedId,
            role = MemberRole.MEMBER,
            isActive = true
        )
        
        val messageSlot = slot<ChatMessage>()
        val savedMessage = ChatMessage(
            id = "msg-123",
            chatRoomId = chatRoomId,
            senderHashedId = senderHashedId,
            encryptedContent = request.encryptedContent,
            contentIv = request.contentIv,
            messageType = MessageType.IMAGE
        )
        
        every { chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId) } returns membership
        every { chatMessageRepository.save(capture(messageSlot)) } returns savedMessage
        every { eventPublisher.publishChatEvent(any()) } returns Unit
        
        // When
        val response = sendMessageUseCase.execute(chatRoomId, request, senderHashedId)
        
        // Then
        assertEquals("IMAGE", response.messageType)
        assertEquals(MessageType.IMAGE, messageSlot.captured.messageType)
    }
    
    @Test
    fun `should default to TEXT for invalid message type`() {
        // Given
        val chatRoomId = "room-123"
        val senderHashedId = "sender-456"
        val request = SendMessageRequest(
            encryptedContent = "encrypted-content",
            contentIv = "iv-string",
            messageType = "INVALID_TYPE"
        )
        
        val membership = ChatRoomMember(
            id = "member-123",
            chatRoomId = chatRoomId,
            userHashedId = senderHashedId,
            role = MemberRole.MEMBER,
            isActive = true
        )
        
        val messageSlot = slot<ChatMessage>()
        val savedMessage = ChatMessage(
            id = "msg-123",
            chatRoomId = chatRoomId,
            senderHashedId = senderHashedId,
            encryptedContent = request.encryptedContent,
            contentIv = request.contentIv,
            messageType = MessageType.TEXT
        )
        
        every { chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId) } returns membership
        every { chatMessageRepository.save(capture(messageSlot)) } returns savedMessage
        every { eventPublisher.publishChatEvent(any()) } returns Unit
        
        // When
        val response = sendMessageUseCase.execute(chatRoomId, request, senderHashedId)
        
        // Then
        assertEquals("TEXT", response.messageType)
        assertEquals(MessageType.TEXT, messageSlot.captured.messageType)
    }
    
    @Test
    fun `should throw exception when user is not member of chat room`() {
        // Given
        val chatRoomId = "room-123"
        val senderHashedId = "sender-456"
        val request = SendMessageRequest(
            encryptedContent = "encrypted-content",
            contentIv = "iv-string"
        )
        
        every { chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId) } returns null
        
        // When & Then
        val exception = assertThrows<IllegalArgumentException> {
            sendMessageUseCase.execute(chatRoomId, request, senderHashedId)
        }
        
        assertEquals("채팅방에 참여하지 않은 사용자입니다", exception.message)
        
        verify { chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId) }
        verify(exactly = 0) { chatMessageRepository.save(any()) }
        verify(exactly = 0) { eventPublisher.publishChatEvent(any()) }
    }
    
    @Test
    fun `should throw exception when user membership is inactive`() {
        // Given
        val chatRoomId = "room-123"
        val senderHashedId = "sender-456"
        val request = SendMessageRequest(
            encryptedContent = "encrypted-content",
            contentIv = "iv-string"
        )
        
        val inactiveMembership = ChatRoomMember(
            id = "member-123",
            chatRoomId = chatRoomId,
            userHashedId = senderHashedId,
            role = MemberRole.MEMBER,
            isActive = false
        )
        
        every { chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId) } returns inactiveMembership
        
        // When & Then
        val exception = assertThrows<IllegalArgumentException> {
            sendMessageUseCase.execute(chatRoomId, request, senderHashedId)
        }
        
        assertEquals("비활성 상태의 사용자는 메시지를 보낼 수 없습니다", exception.message)
        
        verify { chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId) }
        verify(exactly = 0) { chatMessageRepository.save(any()) }
        verify(exactly = 0) { eventPublisher.publishChatEvent(any()) }
    }
}