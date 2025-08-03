package com.privo.application.usecase

import com.privo.application.dto.ChatRoomResponse
import com.privo.application.dto.CreateChatRoomRequest
import com.privo.domain.model.ChatRoom
import com.privo.domain.model.ChatRoomMember
import com.privo.domain.model.MemberRole
import com.privo.domain.repository.ChatRoomRepository
import com.privo.domain.repository.ChatRoomMemberRepository
import com.privo.infrastructure.messaging.EventPublisher
import com.privo.infrastructure.messaging.UserEventPublisher
import com.privo.infrastructure.messaging.UserJoinedEvent
import com.privo.infrastructure.messaging.ChatRoomListUpdatedEvent
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class CreateChatRoomUseCase(
    private val chatRoomRepository: ChatRoomRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val eventPublisher: EventPublisher,
    private val userEventPublisher: UserEventPublisher,
    private val getChatRoomsUseCase: GetChatRoomsUseCase
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(CreateChatRoomUseCase::class.java)
    }
    
    fun execute(request: CreateChatRoomRequest, creatorHashedId: String): ChatRoomResponse {
        logger.info("Creating chat room '{}' by user: {}", request.name, creatorHashedId)
        
        val chatRoom = ChatRoom(
            name = request.name,
            isDirectMessage = request.isDirectMessage
        )
        
        val savedChatRoom = chatRoomRepository.save(chatRoom)
        
        val creatorMember = ChatRoomMember(
            chatRoomId = savedChatRoom.id,
            userId = creatorHashedId,
            role = MemberRole.OWNER
        )
        chatRoomMemberRepository.save(creatorMember)
        
        val allMemberIds = mutableSetOf(creatorHashedId)
        allMemberIds.addAll(request.memberUserIds)
        
        request.memberUserIds.forEach { memberHashedId ->
            val member = ChatRoomMember(
                chatRoomId = savedChatRoom.id,
                userId = memberHashedId,
                role = MemberRole.MEMBER
            )
            chatRoomMemberRepository.save(member)
            
            eventPublisher.publishChatEvent(
                UserJoinedEvent(
                    chatRoomId = savedChatRoom.id,
                    userId = memberHashedId
                )
            )
        }
        
        logger.info("Chat room created successfully: {}", savedChatRoom.id)
        
        // 모든 멤버에게 채팅방 목록 업데이트 알림
        allMemberIds.forEach { memberId ->
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
        
        return ChatRoomResponse(
            id = savedChatRoom.id,
            name = savedChatRoom.name,
            isDirectMessage = savedChatRoom.isDirectMessage,
            memberCount = allMemberIds.size,
            createdAt = savedChatRoom.createdAt.toString(),
            updatedAt = savedChatRoom.updatedAt.toString()
        )
    }
}