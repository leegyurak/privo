package com.privo.application.usecase

import com.privo.domain.repository.UserBlockRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class UnblockUserUseCase(
    private val userBlockRepository: UserBlockRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(UnblockUserUseCase::class.java)
    }
    
    fun execute(blockerUserId: String, targetUserId: String) {
        logger.info("User {} attempting to unblock user: {}", blockerUserId, targetUserId)
        
        // 차단 레코드 찾기
        val userBlock = userBlockRepository.findByBlockerUserIdAndBlockedUserId(blockerUserId, targetUserId)
            ?: throw IllegalArgumentException("차단된 사용자를 찾을 수 없습니다")
        
        if (!userBlock.isActive) {
            throw IllegalArgumentException("이미 차단 해제된 사용자입니다")
        }
        
        // 차단 해제
        val updatedBlock = userBlock.unblock()
        userBlockRepository.save(updatedBlock)
        
        logger.info("User {} successfully unblocked user: {}", blockerUserId, targetUserId)
    }
}