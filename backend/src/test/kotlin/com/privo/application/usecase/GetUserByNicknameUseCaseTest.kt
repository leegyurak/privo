package com.privo.application.usecase

import com.privo.domain.model.User
import com.privo.domain.repository.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import java.time.LocalDateTime

class GetUserByNicknameUseCaseTest {
    
    private lateinit var userRepository: UserRepository
    private lateinit var getUserByNicknameUseCase: GetUserByNicknameUseCase
    
    @BeforeEach
    fun setUp() {
        userRepository = mockk()
        getUserByNicknameUseCase = GetUserByNicknameUseCase(userRepository)
    }
    
    @Test
    fun `should return user profile when user exists`() {
        // Given
        val nickname = "testuser"
        val user = User(
            id = "user-123",
            nickname = nickname,
            passwordHash = "hashedPassword",
            publicKeyHash = "hashedPublicKey",
            createdAt = LocalDateTime.of(2023, 1, 1, 12, 0, 0)
        )
        
        every { userRepository.findByNickname(nickname) } returns user
        
        // When
        val result = getUserByNicknameUseCase.execute(nickname)
        
        // Then
        assertNotNull(result)
        assertEquals("user-123", result.userId)
        assertEquals(nickname, result.nickname)
        assertEquals("2023-01-01 12:00:00", result.createdAt)
        
        verify { userRepository.findByNickname(nickname) }
    }
    
    @Test
    fun `should throw exception when user does not exist`() {
        // Given
        val nickname = "nonexistentuser"
        every { userRepository.findByNickname(nickname) } returns null
        
        // When & Then
        val exception = assertThrows<IllegalArgumentException> {
            getUserByNicknameUseCase.execute(nickname)
        }
        
        assertEquals("해당 닉네임의 사용자를 찾을 수 없습니다", exception.message)
        verify { userRepository.findByNickname(nickname) }
    }
    
    @Test
    fun `should handle special characters in nickname`() {
        // Given
        val nickname = "test-user_123"
        val user = User(
            id = "user-456",
            nickname = nickname,
            passwordHash = "hashedPassword",
            publicKeyHash = "hashedPublicKey"
        )
        
        every { userRepository.findByNickname(nickname) } returns user
        
        // When
        val result = getUserByNicknameUseCase.execute(nickname)
        
        // Then
        assertNotNull(result)
        assertEquals(nickname, result.nickname)
        
        verify { userRepository.findByNickname(nickname) }
    }
}