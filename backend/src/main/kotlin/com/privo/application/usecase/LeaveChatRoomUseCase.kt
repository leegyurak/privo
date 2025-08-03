package com.privo.application.usecase

import com.privo.domain.repository.ChatRoomMemberRepository
import com.privo.domain.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class LeaveChatRoomUseCase(
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val userRepository: UserRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(LeaveChatRoomUseCase::class.java)
    }
    
    fun execute(chatRoomId: String, userId: String) {
        logger.info("User {} attempting to leave chat room: {}", userId, chatRoomId)
        
        // 사용자 존재 확인
        val user = userRepository.findById(userId)
            ?: throw IllegalArgumentException("사용자를 찾을 수 없습니다")
        
        // 채팅방 멤버십 확인
        val membership = chatRoomMemberRepository.findByChatRoomIdAndUserId(chatRoomId, userId)
            ?: throw IllegalArgumentException("해당 채팅방의 멤버가 아닙니다")
        
        if (!membership.isActive) {
            logger.warn("User {} is already inactive in chat room: {}", userId, chatRoomId)
            throw IllegalArgumentException("이미 나간 채팅방입니다")
        }
        
        // 멤버십을 비활성화로 변경
        val updatedMembership = membership.deactivate()
        chatRoomMemberRepository.save(updatedMembership)
        
        logger.info("User {} successfully left chat room: {}", userId, chatRoomId)
    }
}