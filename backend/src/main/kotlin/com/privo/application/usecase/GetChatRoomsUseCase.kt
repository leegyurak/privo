package com.privo.application.usecase

import com.privo.application.dto.ChatRoomResponse
import com.privo.domain.repository.ChatRoomRepository
import com.privo.domain.repository.ChatRoomMemberRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class GetChatRoomsUseCase(
    private val chatRoomRepository: ChatRoomRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(GetChatRoomsUseCase::class.java)
    }
    
    fun execute(userId: String): List<ChatRoomResponse> {
        logger.info("Getting chat rooms for user: {}", userId)
        
        val chatRooms = chatRoomRepository.findByUserId(userId)
        logger.info("Found {} chat rooms for user {}", chatRooms.size, userId)
        
        return chatRooms.map { chatRoom ->
            val members = chatRoomMemberRepository.findByChatRoomId(chatRoom.id)
            val activeMemberCount = members.count { it.isActive }
            
            logger.debug("Chat room {}: {} members, {} active, isDirectMessage: {}", 
                chatRoom.id, members.size, activeMemberCount, chatRoom.isDirectMessage)
            
            ChatRoomResponse(
                id = chatRoom.id,
                name = chatRoom.name,
                isDirectMessage = chatRoom.isDirectMessage,
                memberCount = activeMemberCount,
                createdAt = chatRoom.createdAt.toString(),
                updatedAt = chatRoom.updatedAt.toString()
            )
        }
    }
}