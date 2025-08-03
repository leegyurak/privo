package com.privo.application.usecase

import com.privo.application.dto.RegisterRequest
import com.privo.domain.model.User
import com.privo.domain.repository.UserRepository
import com.privo.infrastructure.security.EncryptionUtil
import com.privo.infrastructure.security.PasswordUtil
import io.mockk.every
import io.mockk.mockk
import io.mockk.slot
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals

class RegisterUserUseCaseTest {
    
    private val userRepository = mockk<UserRepository>()
    private val passwordUtil = mockk<PasswordUtil>()
    private val encryptionUtil = mockk<EncryptionUtil>()
    
    private val registerUserUseCase = RegisterUserUseCase(
        userRepository = userRepository,
        passwordUtil = passwordUtil,
        encryptionUtil = encryptionUtil
    )
    
    @Test
    fun `should register user successfully`() {
        // Given
        val request = RegisterRequest(
            nickname = "testuser",
            password = "password123",
            publicKey = "publicKeyData"
        )
        
        val userSlot = slot<User>()
        val savedUser = User(
            id = "user-123",
            nickname = request.nickname,
            passwordHash = "hashedPassword",
            publicKeyHash = "hashedPublicKey"
        )
        
        every { userRepository.existsByNickname(request.nickname) } returns false
        every { passwordUtil.hashPassword(request.password) } returns "hashedPassword"
        every { passwordUtil.generateSalt() } returns "randomSalt"
        every { passwordUtil.hashWithSalt(request.publicKey, "randomSalt") } returns "hashedPublicKey"
        every { passwordUtil.generateUserSpecificSalt(any()) } returns "userSpecificSalt"
        every { passwordUtil.hashWithSalt(any(), "userSpecificSalt") } returns "hashedUserId"
        every { userRepository.save(capture(userSlot)) } returns savedUser
        
        // When
        val result = registerUserUseCase.execute(request)
        
        // Then
        assertEquals(savedUser, result)
        
        val capturedUser = userSlot.captured
        assertEquals(request.nickname, capturedUser.nickname)
        assertEquals("hashedPassword", capturedUser.passwordHash)
        assertEquals("hashedPublicKey", capturedUser.publicKeyHash)
        
        verify { userRepository.existsByNickname(request.nickname) }
        verify { passwordUtil.hashPassword(request.password) }
        verify { passwordUtil.generateSalt() }
        verify { passwordUtil.hashWithSalt(request.publicKey, "randomSalt") }
        verify { passwordUtil.generateUserSpecificSalt(any()) }
        verify { passwordUtil.hashWithSalt(any(), "userSpecificSalt") }
        verify { userRepository.save(any()) }
    }
    
    @Test
    fun `should throw exception when nickname already exists`() {
        // Given
        val request = RegisterRequest(
            nickname = "existinguser",
            password = "password123",
            publicKey = "publicKeyData"
        )
        
        every { userRepository.existsByNickname(request.nickname) } returns true
        
        // When & Then
        val exception = assertThrows<IllegalArgumentException> {
            registerUserUseCase.execute(request)
        }
        
        assertEquals("이미 사용 중인 닉네임입니다", exception.message)
        
        verify { userRepository.existsByNickname(request.nickname) }
        verify(exactly = 0) { userRepository.save(any()) }
    }
}