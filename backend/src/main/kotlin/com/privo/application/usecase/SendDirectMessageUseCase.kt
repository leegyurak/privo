package com.privo.application.usecase

import com.privo.application.dto.ChatRoomResponse
import com.privo.domain.model.*
import com.privo.domain.repository.ChatRoomRepository
import com.privo.domain.repository.ChatRoomMemberRepository
import com.privo.infrastructure.messaging.UserEventPublisher
import com.privo.infrastructure.messaging.ChatRoomListUpdatedEvent
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Isolation
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(isolation = Isolation.READ_COMMITTED)
class SendDirectMessageUseCase(
    private val chatRoomRepository: ChatRoomRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val userEventPublisher: UserEventPublisher,
    private val getChatRoomsUseCase: GetChatRoomsUseCase
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(SendDirectMessageUseCase::class.java)
    }
    
    fun createDirectMessageRoom(recipientHashedId: String, senderId: String, roomName: String): ChatRoomResponse {
        logger.info("Creating DM room between {} and {} with name: {}", senderId, recipientHashedId, roomName)
        
        // 1. DB 락을 사용하여 기존 DM 채팅방이 있는지 확인 (동시성 제어)
        val existingChatRoom = chatRoomRepository.findDirectMessageRoomBetweenUsersForUpdate(senderId, recipientHashedId)
        
        val chatRoom = existingChatRoom ?: run {
            // 2. DM 채팅방이 없으면 새로 생성
            logger.info("Creating new DM chat room between {} and {} with name: {}", senderId, recipientHashedId, roomName)
            createDirectMessageRoomInternal(senderId, recipientHashedId, roomName)
        }
        
        logger.info("DM room ready: {}", chatRoom.id)
        
        // DM 방이 새로 생성된 경우에만 사용자들에게 채팅방 목록 업데이트 알림
        if (existingChatRoom == null) {
            val memberIds = listOf(senderId, recipientHashedId)
            memberIds.forEach { memberId ->
                try {
                    val updatedChatRooms = getChatRoomsUseCase.execute(memberId)
                    userEventPublisher.publishToUser(
                        memberId,
                        ChatRoomListUpdatedEvent(
                            userId = memberId,
                            chatRooms = updatedChatRooms
                        )
                    )
                } catch (e: Exception) {
                    logger.warn("Failed to send chat room list update to user {}: {}", memberId, e.message)
                }
            }
        }
        
        return ChatRoomResponse(
            id = chatRoom.id,
            name = chatRoom.name,
            isDirectMessage = chatRoom.isDirectMessage,
            memberCount = 2,
            createdAt = chatRoom.createdAt.toString(),
            updatedAt = chatRoom.updatedAt.toString()
        )
    }
    
    
    private fun createDirectMessageRoomInternal(senderId: String, recipientHashedId: String, roomName: String): ChatRoom {
        // DM 채팅방 생성 - 클라이언트에서 받은 이름 사용
        val chatRoom = ChatRoom(
            name = roomName,
            isDirectMessage = true
        )
        val savedChatRoom = chatRoomRepository.save(chatRoom)
        logger.info("Created DM chat room: {} with name: {}", savedChatRoom.id, roomName)
        
        // 두 사용자를 멤버로 추가
        val senderMember = ChatRoomMember(
            chatRoomId = savedChatRoom.id,
            userId = senderId,
            role = MemberRole.MEMBER
        )
        
        val recipientMember = ChatRoomMember(
            chatRoomId = savedChatRoom.id,
            userId = recipientHashedId,
            role = MemberRole.MEMBER
        )
        
        val savedSenderMember = chatRoomMemberRepository.save(senderMember)
        val savedRecipientMember = chatRoomMemberRepository.save(recipientMember)
        
        logger.info("Added sender member: {} (active: {})", savedSenderMember.userId, savedSenderMember.isActive)
        logger.info("Added recipient member: {} (active: {})", savedRecipientMember.userId, savedRecipientMember.isActive)
        
        return savedChatRoom
    }
}
