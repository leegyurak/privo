package com.privo.application.usecase

import com.privo.application.dto.LoginRequest
import com.privo.domain.model.User
import com.privo.domain.repository.UserRepository
import com.privo.infrastructure.security.JwtTokenProvider
import com.privo.infrastructure.security.PasswordUtil
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

class LoginUserUseCaseTest {
    
    private val userRepository = mockk<UserRepository>()
    private val passwordUtil = mockk<PasswordUtil>()
    private val jwtTokenProvider = mockk<JwtTokenProvider>()
    
    private val loginUserUseCase = LoginUserUseCase(
        userRepository = userRepository,
        passwordUtil = passwordUtil,
        jwtTokenProvider = jwtTokenProvider
    )
    
    @Test
    fun `should login successfully with valid credentials`() {
        // Given
        val request = LoginRequest(
            nickname = "testuser",
            password = "password123"
        )
        
        val user = User(
            id = "user-123",
            nickname = request.nickname,
            passwordHash = "hashedPassword",
            publicKeyHash = "hashedPublicKey"
        )
        
        every { userRepository.findByNickname(request.nickname) } returns user
        every { passwordUtil.verifyPassword(request.password, user.passwordHash) } returns true
        every { passwordUtil.generateUserSpecificSalt(user.id) } returns "userSpecificSalt"
        every { passwordUtil.hashWithSalt(user.id, "userSpecificSalt") } returns "hashedUserId"
        every { jwtTokenProvider.generateToken("hashedUserId") } returns "jwt-token"
        every { jwtTokenProvider.getExpirationTime() } returns 86400000L
        
        // When
        val authResponse = loginUserUseCase.execute(request)
        
        // Then
        assertNotNull(authResponse)
        assertEquals("jwt-token", authResponse.accessToken)
        assertEquals("Bearer", authResponse.tokenType)
        assertEquals(86400000L, authResponse.expiresIn)
        assertEquals("hashedUserId", authResponse.userHashedId)
        
        verify { userRepository.findByNickname(request.nickname) }
        verify { passwordUtil.verifyPassword(request.password, user.passwordHash) }
        verify { passwordUtil.generateUserSpecificSalt(user.id) }
        verify { passwordUtil.hashWithSalt(user.id, "userSpecificSalt") }
        verify { jwtTokenProvider.generateToken("hashedUserId") }
        verify { jwtTokenProvider.getExpirationTime() }
    }
    
    @Test
    fun `should throw exception when user not found`() {
        // Given
        val request = LoginRequest(
            nickname = "nonexistentuser",
            password = "password123"
        )
        
        every { userRepository.findByNickname(request.nickname) } returns null
        
        // When & Then
        val exception = assertThrows<IllegalArgumentException> {
            loginUserUseCase.execute(request)
        }
        
        assertEquals("잘못된 닉네임 또는 비밀번호입니다", exception.message)
        
        verify { userRepository.findByNickname(request.nickname) }
        verify(exactly = 0) { passwordUtil.verifyPassword(any(), any()) }
    }
    
    @Test
    fun `should throw exception when password is incorrect`() {
        // Given
        val request = LoginRequest(
            nickname = "testuser",
            password = "wrongPassword"
        )
        
        val user = User(
            id = "user-123",
            nickname = request.nickname,
            passwordHash = "hashedPassword",
            publicKeyHash = "hashedPublicKey"
        )
        
        every { userRepository.findByNickname(request.nickname) } returns user
        every { passwordUtil.verifyPassword(request.password, user.passwordHash) } returns false
        
        // When & Then
        val exception = assertThrows<IllegalArgumentException> {
            loginUserUseCase.execute(request)
        }
        
        assertEquals("잘못된 닉네임 또는 비밀번호입니다", exception.message)
        
        verify { userRepository.findByNickname(request.nickname) }
        verify { passwordUtil.verifyPassword(request.password, user.passwordHash) }
        verify(exactly = 0) { jwtTokenProvider.generateToken(any()) }
    }
}