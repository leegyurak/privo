package com.privo.application.usecase

import com.privo.application.dto.ChatMessageResponse
import com.privo.application.dto.GetMessagesRequest
import com.privo.domain.repository.ChatMessageRepository
import com.privo.domain.repository.ChatRoomMemberRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Transactional(readOnly = true)
class GetMessagesUseCase(
    private val chatMessageRepository: ChatMessageRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(GetMessagesUseCase::class.java)
    }
    
    fun execute(chatRoomId: String, request: GetMessagesRequest, userHashedId: String): List<ChatMessageResponse> {
        logger.info("Getting messages for chat room: {} by user: {}", chatRoomId, userHashedId)
        
        val membership = chatRoomMemberRepository.findByChatRoomIdAndUserHashedId(chatRoomId, userHashedId)
            ?: throw IllegalArgumentException("채팅방에 참여하지 않은 사용자입니다")
        
        val messages = if (request.after != null) {
            try {
                val afterTimestamp = LocalDateTime.parse(request.after)
                chatMessageRepository.findByChatRoomIdAfter(chatRoomId, afterTimestamp)
            } catch (e: Exception) {
                logger.warn("Invalid timestamp format: {}", request.after)
                chatMessageRepository.findByChatRoomId(chatRoomId, request.limit, request.offset)
            }
        } else {
            chatMessageRepository.findByChatRoomId(chatRoomId, request.limit, request.offset)
        }
        
        return messages
            .filter { !it.isDeleted }
            .map { message ->
                ChatMessageResponse(
                    id = message.id,
                    chatRoomId = message.chatRoomId,
                    senderHashedId = message.senderHashedId,
                    encryptedContent = message.encryptedContent,
                    contentIv = message.contentIv,
                    messageType = message.messageType.name,
                    timestamp = message.timestamp.toString(),
                    isDeleted = message.isDeleted
                )
            }
    }
}