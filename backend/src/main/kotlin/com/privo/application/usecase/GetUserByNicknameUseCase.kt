package com.privo.application.usecase

import com.privo.application.dto.UserProfileResponse
import com.privo.domain.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.format.DateTimeFormatter

@Service
@Transactional(readOnly = true)
class GetUserByNicknameUseCase(
    private val userRepository: UserRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(GetUserByNicknameUseCase::class.java)
        private val DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")
    }
    
    fun execute(nickname: String): UserProfileResponse {
        logger.info("Getting user profile for nickname: {}", nickname)
        
        val user = userRepository.findByNickname(nickname)
            ?: throw IllegalArgumentException("해당 닉네임의 사용자를 찾을 수 없습니다")
        
        logger.info("User profile retrieved successfully for nickname: {}", nickname)
        
        return UserProfileResponse(
            userId = user.id, // In a real app, you might want to hash this
            nickname = user.nickname,
            createdAt = user.createdAt.format(DATE_FORMATTER)
        )
    }
}