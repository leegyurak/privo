package com.privo.infrastructure.messaging

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.data.redis.core.RedisTemplate
import org.springframework.stereotype.Component

@Component
class RedisEventPublisher(
    private val redisTemplate: RedisTemplate<String, String>,
    private val objectMapper: ObjectMapper
) : EventPublisher {
    
    companion object {
        private val logger = LoggerFactory.getLogger(RedisEventPublisher::class.java)
        private const val CHAT_EVENTS_CHANNEL = "chat:events"
    }
    
    override fun publishChatEvent(event: ChatEvent) {
        try {
            val eventJson = objectMapper.writeValueAsString(event)
            val channelName = "$CHAT_EVENTS_CHANNEL:${event.chatRoomId}"
            
            redisTemplate.convertAndSend(channelName, eventJson)
            logger.debug("Published chat event to channel {}: {}", channelName, eventJson)
        } catch (e: Exception) {
            logger.error("Failed to publish chat event: {}", event, e)
            throw RuntimeException("Failed to publish chat event", e)
        }
    }
}