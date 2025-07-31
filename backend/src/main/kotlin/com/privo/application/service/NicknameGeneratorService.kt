package com.privo.application.service

import com.privo.domain.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Service
import java.io.BufferedReader
import java.io.InputStreamReader
import kotlin.random.Random

@Service
class NicknameGeneratorService(
    private val userRepository: UserRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(NicknameGeneratorService::class.java)
        private const val MAX_RETRY_ATTEMPTS = 100
    }
    
    private val adjectives: List<String> by lazy {
        loadWordsFromFile("adjectives.txt")
    }
    
    private val animals: List<String> by lazy {
        loadWordsFromFile("animals.txt")
    }
    
    private fun loadWordsFromFile(filename: String): List<String> {
        return try {
            val resource = ClassPathResource(filename)
            BufferedReader(InputStreamReader(resource.inputStream)).use { reader ->
                reader.readLines()
                    .map { it.trim() }
                    .filter { it.isNotBlank() }
            }
        } catch (e: Exception) {
            logger.error("Failed to load words from file: $filename", e)
            emptyList()
        }
    }
    
    fun generateUniqueNickname(): String {
        if (adjectives.isEmpty() || animals.isEmpty()) {
            throw IllegalStateException("Word lists not loaded properly")
        }
        
        var attempts = 0
        
        while (attempts < MAX_RETRY_ATTEMPTS) {
            val nickname = generateRandomNickname()
            
            if (!userRepository.existsByNickname(nickname)) {
                logger.info("Generated unique nickname: {} (attempts: {})", nickname, attempts + 1)
                return nickname
            }
            
            attempts++
        }
        
        // If we couldn't find a unique combination after MAX_RETRY_ATTEMPTS,
        // append a random number to ensure uniqueness
        val baseNickname = generateRandomNickname()
        val uniqueNickname = "$baseNickname${Random.nextInt(1000, 9999)}"
        
        logger.warn("Could not generate unique nickname after {} attempts, using: {}", 
                   MAX_RETRY_ATTEMPTS, uniqueNickname)
        
        return uniqueNickname
    }
    
    private fun generateRandomNickname(): String {
        val adjective = adjectives[Random.nextInt(adjectives.size)]
        val animal = animals[Random.nextInt(animals.size)]
        
        // Capitalize first letter of each word and combine
        return adjective.replaceFirstChar { it.uppercase() } + 
               animal.replaceFirstChar { it.uppercase() }
    }
    
    fun getWordListStats(): Map<String, Int> {
        return mapOf(
            "adjectives" to adjectives.size,
            "animals" to animals.size,
            "totalCombinations" to (adjectives.size * animals.size)
        )
    }
}