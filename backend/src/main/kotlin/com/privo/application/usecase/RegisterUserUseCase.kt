package com.privo.application.usecase

import com.privo.application.dto.RegisterRequest
import com.privo.domain.model.User
import com.privo.domain.repository.UserRepository
import com.privo.infrastructure.security.EncryptionUtil
import com.privo.infrastructure.security.PasswordUtil
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime

@Service
@Transactional
class RegisterUserUseCase(
    private val userRepository: UserRepository,
    private val passwordUtil: PasswordUtil,
    private val encryptionUtil: EncryptionUtil
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(RegisterUserUseCase::class.java)
    }
    
    fun execute(request: RegisterRequest): User {
        logger.info("Registering new user with nickname: {}", request.nickname)
        
        if (userRepository.existsByNickname(request.nickname)) {
            throw IllegalArgumentException("이미 사용 중인 닉네임입니다")
        }
        
        val passwordHash = passwordUtil.hashPassword(request.password)
        val publicKeyHash = passwordUtil.hashWithSalt(request.publicKey, passwordUtil.generateSalt())
        
        // Generate consistent hashed user ID from the start
        val tempUuid = java.util.UUID.randomUUID().toString()
        val userSpecificSalt = passwordUtil.generateUserSpecificSalt(tempUuid)
        val hashedUserId = passwordUtil.hashWithSalt(tempUuid, userSpecificSalt)
        
        val user = User(
            id = hashedUserId,
            nickname = request.nickname,
            passwordHash = passwordHash,
            publicKeyHash = publicKeyHash
        )
        
        val savedUser = userRepository.save(user)
        logger.info("User registered successfully with ID: {}", savedUser.id)
        
        return savedUser
    }
}