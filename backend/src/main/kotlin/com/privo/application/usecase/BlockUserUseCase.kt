package com.privo.application.usecase

import com.privo.domain.model.UserBlock
import com.privo.domain.repository.UserBlockRepository
import com.privo.domain.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional
class BlockUserUseCase(
    private val userBlockRepository: UserBlockRepository,
    private val userRepository: UserRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(BlockUserUseCase::class.java)
    }
    
    fun execute(blockerUserId: String, targetUserId: String) {
        logger.info("User {} attempting to block user: {}", blockerUserId, targetUserId)
        
        // 자기 자신을 차단하는 것은 불가능
        if (blockerUserId == targetUserId) {
            throw IllegalArgumentException("자기 자신을 차단할 수 없습니다")
        }
        
        // 차단할 사용자 존재 확인
        val targetUser = userRepository.findById(targetUserId)
            ?: throw IllegalArgumentException("차단할 사용자를 찾을 수 없습니다")
        
        // 이미 차단되어 있는지 확인
        val existingBlock = userBlockRepository.findByBlockerUserIdAndBlockedUserId(blockerUserId, targetUserId)
        if (existingBlock != null && existingBlock.isActive) {
            throw IllegalArgumentException("이미 차단된 사용자입니다")
        }
        
        // 새로운 차단 레코드 생성 또는 기존 차단 재활성화
        val userBlock = if (existingBlock != null) {
            // 기존 차단이 비활성화되어 있다면 재활성화
            UserBlock(
                id = existingBlock.id,
                blockerUserId = blockerUserId,
                blockedUserId = targetUserId,
                blockedAt = existingBlock.blockedAt,
                isActive = true
            )
        } else {
            // 새로운 차단 생성
            UserBlock(
                blockerUserId = blockerUserId,
                blockedUserId = targetUserId
            )
        }
        
        userBlockRepository.save(userBlock)
        logger.info("User {} successfully blocked user: {}", blockerUserId, targetUserId)
    }
}