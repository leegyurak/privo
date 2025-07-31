package com.privo.application.usecase

import com.privo.application.dto.SendDirectMessageRequest
import com.privo.application.dto.ChatMessageResponse
import com.privo.domain.model.*
import com.privo.domain.repository.ChatRoomRepository
import com.privo.domain.repository.ChatRoomMemberRepository
import com.privo.domain.repository.ChatMessageRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.format.DateTimeFormatter

@Service
@Transactional
class SendDirectMessageUseCase(
    private val chatRoomRepository: ChatRoomRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val chatMessageRepository: ChatMessageRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(SendDirectMessageUseCase::class.java)
    }
    
    fun execute(request: SendDirectMessageRequest, senderHashedId: String): ChatMessageResponse {
        logger.info("Sending DM from {} to {}", senderHashedId, request.recipientHashedId)
        
        // 1. 기존 DM 채팅방이 있는지 확인
        val existingChatRoom = findExistingDirectMessageRoom(senderHashedId, request.recipientHashedId)
        logger.info("Existing DM chat room found: {}", existingChatRoom?.id)
        
        val chatRoom = existingChatRoom ?: run {
            // 2. DM 채팅방이 없으면 새로 생성
            logger.info("Creating new DM chat room between {} and {}", senderHashedId, request.recipientHashedId)
            createDirectMessageRoom(senderHashedId, request.recipientHashedId)
        }
        
        // 3. 메시지 전송
        val messageType = when (request.messageType.uppercase()) {
            "TEXT" -> MessageType.TEXT
            "IMAGE" -> MessageType.IMAGE
            "FILE" -> MessageType.FILE
            "SYSTEM" -> MessageType.SYSTEM
            else -> MessageType.TEXT
        }
        
        val message = ChatMessage(
            chatRoomId = chatRoom.id,
            senderHashedId = senderHashedId,
            encryptedContent = request.encryptedContent,
            contentIv = request.contentIv,
            messageType = messageType
        )
        
        val savedMessage = chatMessageRepository.save(message)
        
        return ChatMessageResponse(
            id = savedMessage.id,
            chatRoomId = savedMessage.chatRoomId,
            senderHashedId = savedMessage.senderHashedId,
            encryptedContent = savedMessage.encryptedContent,
            contentIv = savedMessage.contentIv,
            messageType = savedMessage.messageType.name,
            timestamp = savedMessage.timestamp.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            isDeleted = savedMessage.isDeleted
        )
    }
    
    private fun findExistingDirectMessageRoom(user1HashedId: String, user2HashedId: String): ChatRoom? {
        // 두 사용자 간의 DM 채팅방 찾기
        val user1Rooms = chatRoomMemberRepository.findActiveChatRoomsByUserHashedId(user1HashedId)
        val user2Rooms = chatRoomMemberRepository.findActiveChatRoomsByUserHashedId(user2HashedId)
        
        logger.debug("User1 {} has {} active rooms", user1HashedId, user1Rooms.size)
        logger.debug("User2 {} has {} active rooms", user2HashedId, user2Rooms.size)
        
        val commonRoomIds = user1Rooms.map { it.chatRoomId }.intersect(user2Rooms.map { it.chatRoomId }.toSet())
        logger.debug("Common room IDs: {}", commonRoomIds)
        
        val existingRoom = commonRoomIds.mapNotNull { roomId ->
            chatRoomRepository.findById(roomId)
        }.find { room ->
            val activeMemberCount = chatRoomMemberRepository.countActiveMembersByRoomId(room.id)
            logger.debug("Room {}: isDirectMessage={}, activeMemberCount={}", 
                room.id, room.isDirectMessage, activeMemberCount)
            room.isDirectMessage && activeMemberCount == 2
        }
        
        logger.info("Found existing DM room: {}", existingRoom?.id)
        return existingRoom
    }
    
    private fun createDirectMessageRoom(senderHashedId: String, recipientHashedId: String): ChatRoom {
        // DM 채팅방 생성
        val chatRoom = ChatRoom(
            name = "Direct Message",
            isDirectMessage = true
        )
        val savedChatRoom = chatRoomRepository.save(chatRoom)
        logger.info("Created DM chat room: {}", savedChatRoom.id)
        
        // 두 사용자를 멤버로 추가
        val senderMember = ChatRoomMember(
            chatRoomId = savedChatRoom.id,
            userHashedId = senderHashedId,
            role = MemberRole.MEMBER
        )
        
        val recipientMember = ChatRoomMember(
            chatRoomId = savedChatRoom.id,
            userHashedId = recipientHashedId,
            role = MemberRole.MEMBER
        )
        
        val savedSenderMember = chatRoomMemberRepository.save(senderMember)
        val savedRecipientMember = chatRoomMemberRepository.save(recipientMember)
        
        logger.info("Added sender member: {} (active: {})", savedSenderMember.userHashedId, savedSenderMember.isActive)
        logger.info("Added recipient member: {} (active: {})", savedRecipientMember.userHashedId, savedRecipientMember.isActive)
        
        return savedChatRoom
    }
}