package com.privo.infrastructure.messaging

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.data.redis.connection.MessageListener
import org.springframework.data.redis.listener.ChannelTopic
import org.springframework.data.redis.listener.RedisMessageListenerContainer
import org.springframework.stereotype.Service
import java.util.concurrent.ConcurrentHashMap

@Service
class UserEventSubscriber(
    private val redisMessageListenerContainer: RedisMessageListenerContainer,
    private val objectMapper: ObjectMapper
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(UserEventSubscriber::class.java)
        private const val USER_CHANNEL_PREFIX = "user_events:"
    }
    
    private val subscriptions = ConcurrentHashMap<String, MessageListener>()
    
    fun subscribeToUser(userId: String, handler: (UserEvent) -> Unit) {
        val channelName = "${USER_CHANNEL_PREFIX}${userId}"
        
        // 이미 구독 중인 경우 기존 구독 해제
        unsubscribeFromUser(userId)
        
        val messageListener = MessageListener { message, _ ->
            try {
                val eventJson = String(message.body)
                val event = objectMapper.readValue(eventJson, UserEvent::class.java)
                handler(event)
            } catch (e: Exception) {
                logger.error("Failed to process user event from channel {}: {}", channelName, String(message.body), e)
            }
        }
        
        subscriptions[userId] = messageListener
        redisMessageListenerContainer.addMessageListener(messageListener, ChannelTopic(channelName))
        
        logger.debug("Subscribed to user events for user: {}", userId)
    }
    
    fun unsubscribeFromUser(userId: String) {
        val messageListener = subscriptions.remove(userId)
        if (messageListener != null) {
            val channelName = "${USER_CHANNEL_PREFIX}${userId}"
            redisMessageListenerContainer.removeMessageListener(messageListener, ChannelTopic(channelName))
            logger.debug("Unsubscribed from user events for user: {}", userId)
        }
    }
    
    fun isSubscribedToUser(userId: String): Boolean {
        return subscriptions.containsKey(userId)
    }
}