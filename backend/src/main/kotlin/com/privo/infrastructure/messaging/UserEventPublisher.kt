package com.privo.infrastructure.messaging

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Service

@Service
class UserEventPublisher(
    private val redisTemplate: RedisTemplate<String, String>,
    private val objectMapper: ObjectMapper
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(UserEventPublisher::class.java)
        private const val USER_CHANNEL_PREFIX = "user_events:"
    }
    
    fun publishToUser(userId: String, event: UserEvent) {
        try {
            val channelName = "${USER_CHANNEL_PREFIX}${userId}"
            val eventJson = objectMapper.writeValueAsString(event)
            
            logger.debug("Publishing user event to channel {}: {}", channelName, event::class.simpleName)
            redisTemplate.convertAndSend(channelName, eventJson)
            
        } catch (e: Exception) {
            logger.error("Failed to publish user event for user {}: {}", userId, event, e)
        }
    }
}