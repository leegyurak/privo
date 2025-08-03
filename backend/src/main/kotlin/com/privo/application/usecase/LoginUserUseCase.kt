package com.privo.application.usecase

import com.privo.application.dto.AuthResponse
import com.privo.application.dto.LoginRequest
import com.privo.domain.repository.UserRepository
import com.privo.infrastructure.security.JwtTokenProvider
import com.privo.infrastructure.security.PasswordUtil
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
@Transactional(readOnly = true)
class LoginUserUseCase(
    private val userRepository: UserRepository,
    private val passwordUtil: PasswordUtil,
    private val jwtTokenProvider: JwtTokenProvider
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(LoginUserUseCase::class.java)
    }
    
    fun execute(request: LoginRequest): AuthResponse {
        logger.info("Attempting login for nickname: {}", request.nickname)
        
        val user = userRepository.findByNickname(request.nickname)
            ?: throw IllegalArgumentException("잘못된 닉네임 또는 비밀번호입니다")
        
        if (!passwordUtil.verifyPassword(request.password, user.passwordHash)) {
            throw IllegalArgumentException("잘못된 닉네임 또는 비밀번호입니다")
        }
        
        // The user.id is already hashed, so use it directly
        val accessToken = jwtTokenProvider.generateToken(user.id)
        val expiresIn = jwtTokenProvider.getExpirationTime()
        
        logger.info("User logged in successfully: {}", user.id)
        
        return AuthResponse(
            accessToken = accessToken,
            expiresIn = expiresIn,
            userId = user.id
        )
    }
}