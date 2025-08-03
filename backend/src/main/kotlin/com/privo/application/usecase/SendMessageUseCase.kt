package com.privo.application.usecase

import com.privo.application.dto.ChatMessageResponse
import com.privo.application.dto.SendMessageRequest
import com.privo.domain.model.MessageType
import com.privo.domain.repository.ChatRoomMemberRepository
import com.privo.infrastructure.messaging.EventPublisher
import com.privo.infrastructure.messaging.MessageSentEvent
import com.privo.infrastructure.messaging.OfflineMessage
import com.privo.infrastructure.messaging.OfflineMessageStore
import com.privo.infrastructure.messaging.RedisDistributedLock
import com.privo.infrastructure.websocket.WebSocketSessionManager
import java.time.LocalDateTime
import java.util.*
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class SendMessageUseCase(
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val eventPublisher: EventPublisher,
    private val offlineMessageStore: OfflineMessageStore,
    private val webSocketSessionManager: WebSocketSessionManager,
    private val distributedLock: RedisDistributedLock
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(SendMessageUseCase::class.java)
        private const val CHAT_ROOM_MESSAGE_LOCK_PREFIX = "chat_room_msg_lock:"
    }
    
    fun execute(chatRoomId: String, request: SendMessageRequest, senderId: String): ChatMessageResponse {
        val lockKey = "${CHAT_ROOM_MESSAGE_LOCK_PREFIX}${chatRoomId}"
        logger.debug("Attempting to acquire message lock for chat room: {}", chatRoomId)
        
        return distributedLock.withLock(lockKey, timeoutSeconds = 10L, acquireTimeoutMillis = 5000L) {
            executeWithLock(chatRoomId, request, senderId)
        } ?: throw RuntimeException("메시지 전송 처리 중 락 획득에 실패했습니다. 잠시 후 다시 시도해주세요.")
    }
    
    private fun executeWithLock(chatRoomId: String, request: SendMessageRequest, senderId: String): ChatMessageResponse {
        logger.info("Processing message with lock for chat room: {} by user: {} (encrypted length: {})", 
            chatRoomId, senderId, request.encryptedContent.length)
        
        // 입력 검증
        if (request.encryptedContent.trim().isEmpty()) {
            throw IllegalArgumentException("메시지 내용이 비어있습니다")
        }
        
        if (request.contentIv.trim().isEmpty()) {
            throw IllegalArgumentException("초기화 벡터가 비어있습니다")
        }
        
        // 채팅방 멤버십 검증
        val membership = chatRoomMemberRepository.findByChatRoomIdAndUserId(chatRoomId, senderId)
            ?: throw IllegalArgumentException("채팅방에 참여하지 않은 사용자입니다")
        
        if (!membership.isActive) {
            throw IllegalArgumentException("비활성 상태의 사용자는 메시지를 보낼 수 없습니다")
        }
        
        // 메시지 타입 검증
        val messageType = try {
            MessageType.valueOf(request.messageType.uppercase())
        } catch (e: IllegalArgumentException) {
            logger.warn("Invalid message type: {}, defaulting to TEXT", request.messageType)
            MessageType.TEXT
        }
        
        // 메시지 길이 제한
        if (request.encryptedContent.length > 10000) {
            throw IllegalArgumentException("메시지가 너무 깁니다 (최대 10,000자)")
        }
        
        val messageId = UUID.randomUUID().toString()
        val timestamp = LocalDateTime.now()
        
        // 채팅방의 모든 활성 멤버 조회
        val activeMembers = chatRoomMemberRepository.findByChatRoomId(chatRoomId)
            .filter { it.isActive }
        
        logger.debug("Found {} active members in room {}", activeMembers.size, chatRoomId)
        
        // 각 멤버에게 메시지 전송 또는 오프라인 저장 (순차 처리)
        activeMembers.forEach { member ->
            if (member.userId != senderId) { // 발신자는 제외
                val isOnline = webSocketSessionManager.isUserOnline(member.userId)
                
                if (isOnline) {
                    logger.debug("User {} is online, will send via WebSocket", member.userId)
                } else {
                    // 오프라인 사용자의 경우 Redis에 저장
                    val offlineMessage = OfflineMessage(
                        id = messageId,
                        chatRoomId = chatRoomId,
                        senderId = senderId,
                        encryptedContent = request.encryptedContent,
                        contentIv = request.contentIv,
                        messageType = messageType.name,
                        messageNumber = null,
                        chainLength = null,
                        timestamp = timestamp,
                        isDeleted = false
                    )
                    
                    offlineMessageStore.storeOfflineMessage(member.userId, offlineMessage)
                    logger.info("Stored offline message for user: {}", member.userId)
                }
            }
        }
        
        // 온라인 사용자들에게 실시간 전송을 위한 이벤트 발행 (동기적으로 처리)
        eventPublisher.publishChatEvent(
            MessageSentEvent(
                chatRoomId = chatRoomId,
                messageId = messageId,
                senderId = senderId,
                encryptedContent = request.encryptedContent,
                contentIv = request.contentIv,
                messageType = messageType.name
            )
        )
        
        logger.info("Message sent successfully with lock: {} in room: {}", messageId, chatRoomId)
        
        return ChatMessageResponse(
            id = messageId,
            chatRoomId = chatRoomId,
            senderId = senderId,
            encryptedContent = request.encryptedContent,
            contentIv = request.contentIv,
            messageType = messageType.name,
            timestamp = timestamp.toString(),
            isDeleted = false
        )
    }
}