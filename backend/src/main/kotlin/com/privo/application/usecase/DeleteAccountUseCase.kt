package com.privo.application.usecase

import com.privo.domain.repository.ChatRoomMemberRepository
import com.privo.domain.repository.UserBlockRepository
import com.privo.domain.repository.UserRepository
import com.privo.infrastructure.messaging.OfflineMessageStore
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class DeleteAccountUseCase(
    private val userRepository: UserRepository,
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val userBlockRepository: UserBlockRepository,
    private val offlineMessageStore: OfflineMessageStore
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(DeleteAccountUseCase::class.java)
    }
    
    fun execute(userId: String) {
        logger.info("User {} attempting to delete account", userId)
        
        // 사용자 존재 확인
        val user = userRepository.findById(userId)
            ?: throw IllegalArgumentException("사용자를 찾을 수 없습니다")
        
        try {
            // 1. 모든 채팅방에서 탈퇴 처리
            val userMemberships = chatRoomMemberRepository.findByUserId(userId)
            logger.info("Processing {} chat room memberships for user: {}", userMemberships.size, userId)
            
            userMemberships.forEach { membership ->
                if (membership.isActive) {
                    val updatedMembership = membership.deactivate()
                    chatRoomMemberRepository.save(updatedMembership)
                    logger.debug("Deactivated membership for room: {}", membership.chatRoomId)
                }
            }
            
            // 2. 사용자가 차단한 모든 사용자 차단 해제
            val userBlocks = userBlockRepository.findActiveByBlockerUserId(userId)
            logger.info("Processing {} user blocks for user: {}", userBlocks.size, userId)
            
            userBlocks.forEach { block ->
                val updatedBlock = block.unblock()
                userBlockRepository.save(updatedBlock)
                logger.debug("Unblocked user: {}", block.blockedUserId)
            }
            
            // 3. 다른 사용자가 이 사용자를 차단한 레코드도 해제
            val blocksOnUser = userBlockRepository.findActiveByBlockedUserId(userId)
            logger.info("Processing {} blocks on user: {}", blocksOnUser.size, userId)
            
            blocksOnUser.forEach { block ->
                val updatedBlock = block.unblock()
                userBlockRepository.save(updatedBlock)
                logger.debug("Removed block from user: {}", block.blockerUserId)
            }
            
            // 4. 오프라인 메시지 삭제
            try {
                offlineMessageStore.clearAllOfflineMessages(userId)
                logger.debug("Cleared offline messages for user: {}", userId)
            } catch (e: Exception) {
                logger.warn("Failed to clear offline messages for user: {}, error: {}", userId, e.message)
            }
            
            // 5. 사용자 삭제
            userRepository.deleteById(userId)
            logger.info("Successfully deleted account for user: {}", userId)
            
        } catch (e: Exception) {
            logger.error("Failed to delete account for user: {}", userId, e)
            throw RuntimeException("계정 삭제 중 오류가 발생했습니다: ${e.message}")
        }
    }
}