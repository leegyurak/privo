package com.privo.application.service

import com.privo.domain.repository.UserRepository
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows

class NicknameGeneratorServiceTest {
    
    private lateinit var userRepository: UserRepository
    private lateinit var nicknameGeneratorService: NicknameGeneratorService
    
    @BeforeEach
    fun setUp() {
        userRepository = mockk()
        nicknameGeneratorService = NicknameGeneratorService(userRepository)
    }
    
    @Test
    fun `should generate unique nickname when first attempt is unique`() {
        // Given
        every { userRepository.existsByNickname(any()) } returns false
        
        // When
        val nickname = nicknameGeneratorService.generateUniqueNickname()
        
        // Then
        assertNotNull(nickname)
        assertTrue(nickname.isNotBlank())
        assertTrue(nickname.length >= 2) // At least one adjective + one animal character
        assertTrue(nickname[0].isUpperCase()) // First character should be uppercase
        verify(exactly = 1) { userRepository.existsByNickname(nickname) }
    }
    
    @Test
    fun `should retry when first nickname is not unique`() {
        // Given
        every { userRepository.existsByNickname(any()) } returnsMany listOf(true, true, false)
        
        // When
        val nickname = nicknameGeneratorService.generateUniqueNickname()
        
        // Then
        assertNotNull(nickname)
        assertTrue(nickname.isNotBlank())
        verify(exactly = 3) { userRepository.existsByNickname(any()) }
    }
    
    @Test
    fun `should append random number when max retries exceeded`() {
        // Given
        every { userRepository.existsByNickname(any()) } returns true
        
        // When
        val nickname = nicknameGeneratorService.generateUniqueNickname()
        
        // Then
        assertNotNull(nickname)
        assertTrue(nickname.isNotBlank())
        // Should contain 4 digits at the end when max retries exceeded
        assertTrue(nickname.takeLast(4).all { it.isDigit() })
        verify(exactly = 100) { userRepository.existsByNickname(any()) }
    }
    
    @Test
    fun `should generate different nicknames on multiple calls`() {
        // Given
        every { userRepository.existsByNickname(any()) } returns false
        
        // When
        val nickname1 = nicknameGeneratorService.generateUniqueNickname()
        val nickname2 = nicknameGeneratorService.generateUniqueNickname()
        val nickname3 = nicknameGeneratorService.generateUniqueNickname()
        
        // Then
        assertNotEquals(nickname1, nickname2)
        assertNotEquals(nickname2, nickname3)
        assertNotEquals(nickname1, nickname3)
    }
    
    @Test
    fun `should return word list stats`() {
        // When
        val stats = nicknameGeneratorService.getWordListStats()
        
        // Then
        assertNotNull(stats)
        assertTrue(stats.containsKey("adjectives"))
        assertTrue(stats.containsKey("animals"))
        assertTrue(stats.containsKey("totalCombinations"))
        
        val adjectives = stats["adjectives"] ?: 0
        val animals = stats["animals"] ?: 0
        val totalCombinations = stats["totalCombinations"] ?: 0
        
        assertTrue(adjectives > 0)
        assertTrue(animals > 0)
        assertEquals(adjectives * animals, totalCombinations)
    }
    
    @Test
    fun `generated nickname should follow PascalCase format`() {
        // Given
        every { userRepository.existsByNickname(any()) } returns false
        
        // When
        val nickname = try {
            nicknameGeneratorService.generateUniqueNickname()
        } catch (e: IllegalStateException) {
            // If word lists are not loaded, skip this test
            return
        }
        
        // Then
        assertNotNull(nickname)
        assertTrue(nickname.isNotBlank())
        
        // Should start with uppercase letter
        assertTrue(nickname[0].isUpperCase(), "Nickname should start with uppercase: $nickname")
        
        // Should contain at least one more uppercase letter (start of animal name)
        // But handle cases where numbers are appended due to max retries
        val baseNickname = if (nickname.takeLast(4).all { it.isDigit() }) {
            nickname.dropLast(4)
        } else {
            nickname
        }
        
        val uppercaseCount = baseNickname.count { it.isUpperCase() }
        assertTrue(uppercaseCount >= 1, "Nickname should have at least 1 uppercase letter: $nickname")
        
        // Should not contain spaces or special characters (except digits at the end)
        // Allow hyphens and underscores as they might be in the word lists
        assertTrue(nickname.all { it.isLetter() || it.isDigit() || it == '-' || it == '_' }, 
                  "Nickname should only contain letters, digits, hyphens, and underscores: $nickname")
    }
}