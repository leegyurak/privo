package com.privo.application.usecase

import com.privo.application.dto.SendMessageRequest
import com.privo.domain.model.ChatMessage
import com.privo.domain.model.ChatRoomMember
import com.privo.domain.model.MemberRole
import com.privo.domain.model.MessageType
import com.privo.domain.repository.ChatMessageRepository
import com.privo.domain.repository.ChatRoomMemberRepository
import com.privo.infrastructure.messaging.EventPublisher
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class SendMessageUseCaseFixedTest {
    
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
        
        val senderMembership = ChatRoomMember(
            id = "member-123",
            chatRoomId = chatRoomId,
            userHashedId = senderHashedId,
            role = MemberRole.MEMBER,
            isActive = true
        )
        
        
        every { chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId) } returns senderMembership
        every { chatMessageRepository.save(any()) } returns ChatMessage(
            id = "msg-123",
            chatRoomId = chatRoomId,
            senderHashedId = senderHashedId,
            encryptedContent = "encrypted-content",
            contentIv = "iv-string",
            messageType = MessageType.TEXT
        )
        every { eventPublisher.publishChatEvent(any()) } returns Unit
        
        // When
        val response = sendMessageUseCase.execute(chatRoomId, request, senderHashedId)
        
        // Then
        assertNotNull(response)
        assertNotNull(response.id)
        assertEquals(chatRoomId, response.chatRoomId)
        assertEquals(senderHashedId, response.senderHashedId)
        assertEquals(request.encryptedContent, response.encryptedContent)
        assertEquals(request.contentIv, response.contentIv)
        assertEquals("TEXT", response.messageType)
        
        // Verify interactions
        verify { chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId) }
        verify { chatMessageRepository.save(any()) }
        verify { eventPublisher.publishChatEvent(any()) }
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
}