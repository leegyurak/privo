package com.privo.application.usecase

import com.privo.application.dto.ChatMessageResponse
import com.privo.application.dto.SendMessageRequest
import com.privo.domain.model.ChatMessage
import com.privo.domain.model.MessageType
import com.privo.domain.repository.ChatMessageRepository
import com.privo.domain.repository.ChatRoomMemberRepository
import com.privo.infrastructure.messaging.EventPublisher
import com.privo.infrastructure.messaging.MessageSentEvent
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class SendMessageUseCase(
    private val chatMessageRepository: ChatMessageRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val eventPublisher: EventPublisher
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(SendMessageUseCase::class.java)
    }
    
    fun execute(chatRoomId: String, request: SendMessageRequest, senderHashedId: String): ChatMessageResponse {
        logger.info("Sending message to chat room: {} by user: {}", chatRoomId, senderHashedId)
        
        val membership = chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, senderHashedId)
            ?: throw IllegalArgumentException("채팅방에 참여하지 않은 사용자입니다")
        
        if (!membership.isActive) {
            throw IllegalArgumentException("비활성 상태의 사용자는 메시지를 보낼 수 없습니다")
        }
        
        val messageType = try {
            MessageType.valueOf(request.messageType.uppercase())
        } catch (e: IllegalArgumentException) {
            MessageType.TEXT
        }
        
        val chatMessage = ChatMessage(
            chatRoomId = chatRoomId,
            senderHashedId = senderHashedId,
            encryptedContent = request.encryptedContent,
            contentIv = request.contentIv,
            messageType = messageType
        )
        
        val savedMessage = chatMessageRepository.save(chatMessage)
        
        eventPublisher.publishChatEvent(
            MessageSentEvent(
                chatRoomId = chatRoomId,
                messageId = savedMessage.id,
                senderHashedId = senderHashedId,
                encryptedContent = savedMessage.encryptedContent,
                contentIv = savedMessage.contentIv,
                messageType = savedMessage.messageType.name
            )
        )
        
        logger.info("Message sent successfully: {}", savedMessage.id)
        
        return ChatMessageResponse(
            id = savedMessage.id,
            chatRoomId = savedMessage.chatRoomId,
            senderHashedId = savedMessage.senderHashedId,
            encryptedContent = savedMessage.encryptedContent,
            contentIv = savedMessage.contentIv,
            messageType = savedMessage.messageType.name,
            timestamp = savedMessage.timestamp.toString(),
            isDeleted = savedMessage.isDeleted
        )
    }
}