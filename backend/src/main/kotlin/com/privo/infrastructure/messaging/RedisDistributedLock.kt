package com.privo.infrastructure.messaging

import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service
import java.time.Duration
import java.util.*

@Service
class RedisDistributedLock(
    private val redisTemplate: RedisTemplate<String, String>
) {
    
    companion object {
        private const val LOCK_PREFIX = "lock:"
        private const val DEFAULT_LOCK_TIMEOUT_SECONDS = 10L
        private const val DEFAULT_ACQUIRE_TIMEOUT_MILLIS = 5000L
    }
    
    /**
     * Acquire a distributed lock with timeout
     */
    fun acquireLock(
        lockKey: String, 
        timeoutSeconds: Long = DEFAULT_LOCK_TIMEOUT_SECONDS,
        acquireTimeoutMillis: Long = DEFAULT_ACQUIRE_TIMEOUT_MILLIS
    ): String? {
        val fullKey = "${LOCK_PREFIX}${lockKey}"
        val lockValue = UUID.randomUUID().toString()
        val startTime = System.currentTimeMillis()
        
        while (System.currentTimeMillis() - startTime < acquireTimeoutMillis) {
            val success = redisTemplate.opsForValue()
                .setIfAbsent(fullKey, lockValue, Duration.ofSeconds(timeoutSeconds))
            
            if (success == true) {
                return lockValue
            }
            
            // Wait a bit before retrying
            try {
                Thread.sleep(50)
            } catch (e: InterruptedException) {
                Thread.currentThread().interrupt()
                return null
            }
        }
        
        return null
    }
    
    /**
     * Release a distributed lock
     */
    fun releaseLock(lockKey: String, lockValue: String): Boolean {
        val fullKey = "${LOCK_PREFIX}${lockKey}"
        
        // Simple check and delete - not atomic but sufficient for our use case
        val currentValue = redisTemplate.opsForValue().get(fullKey)
        if (currentValue == lockValue) {
            return redisTemplate.delete(fullKey)
        }
        
        return false
    }
    
    /**
     * Execute a block of code with distributed lock
     */
    fun <T> withLock(
        lockKey: String,
        timeoutSeconds: Long = DEFAULT_LOCK_TIMEOUT_SECONDS,
        acquireTimeoutMillis: Long = DEFAULT_ACQUIRE_TIMEOUT_MILLIS,
        block: () -> T
    ): T? {
        val lockValue = acquireLock(lockKey, timeoutSeconds, acquireTimeoutMillis)
        
        return if (lockValue != null) {
            try {
                block()
            } finally {
                releaseLock(lockKey, lockValue)
            }
        } else {
            null
        }
    }
}