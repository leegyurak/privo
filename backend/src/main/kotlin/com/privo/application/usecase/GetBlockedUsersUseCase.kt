package com.privo.application.usecase

import com.privo.application.dto.UserResponse
import com.privo.domain.repository.UserBlockRepository
import com.privo.domain.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class GetBlockedUsersUseCase(
    private val userBlockRepository: UserBlockRepository,
    private val userRepository: UserRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(GetBlockedUsersUseCase::class.java)
    }
    
    data class BlockedUserResponse(
        val id: String,
        val nickname: String,
        val blockedAt: String
    )
    
    fun execute(userId: String): List<BlockedUserResponse> {
        logger.info("Getting blocked users for user: {}", userId)
        
        val activeBlocks = userBlockRepository.findActiveByBlockerUserId(userId)
        
        return activeBlocks.mapNotNull { block ->
            val blockedUser = userRepository.findById(block.blockedUserId)
            if (blockedUser != null) {
                BlockedUserResponse(
                    id = blockedUser.id,
                    nickname = blockedUser.nickname,
                    blockedAt = block.blockedAt.toString()
                )
            } else {
                logger.warn("Blocked user not found: {}", block.blockedUserId)
                null
            }
        }
    }
}