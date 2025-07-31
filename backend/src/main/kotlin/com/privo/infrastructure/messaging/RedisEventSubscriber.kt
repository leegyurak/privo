package com.privo.infrastructure.messaging

import com.fasterxml.jackson.databind.ObjectMapper
import org.slf4j.LoggerFactory
import org.springframework.data.redis.connection.RedisConnectionFactory
import org.springframework.data.redis.listener.ChannelTopic
import org.springframework.data.redis.listener.RedisMessageListenerContainer
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter
import org.springframework.stereotype.Component
import java.util.concurrent.ConcurrentHashMap

@Component
class RedisEventSubscriber(
    private val redisConnectionFactory: RedisConnectionFactory,
    private val objectMapper: ObjectMapper
) : EventSubscriber {
    
    companion object {
        private val logger = LoggerFactory.getLogger(RedisEventSubscriber::class.java)
        private const val CHAT_EVENTS_CHANNEL = "chat:events"
    }
    
    private val listenerContainer = RedisMessageListenerContainer().apply {
        setConnectionFactory(redisConnectionFactory)
        afterPropertiesSet()
        start()
    }
    
    private val subscriptions = ConcurrentHashMap<String, MessageListenerAdapter>()
    
    override fun subscribe(chatRoomId: String, handler: (ChatEvent) -> Unit) {
        val channelName = "$CHAT_EVENTS_CHANNEL:$chatRoomId"
        val topic = ChannelTopic(channelName)
        
        val messageListener = MessageListenerAdapter({ message: org.springframework.data.redis.connection.Message, pattern: ByteArray? ->
            try {
                val eventJson = String(message.body)
                val event = objectMapper.readValue(eventJson, ChatEvent::class.java)
                handler(event)
                logger.debug("Processed chat event from channel {}: {}", channelName, eventJson)
            } catch (e: Exception) {
                logger.error("Failed to process chat event from channel {}: {}", channelName, String(message.body), e)
            }
        })
        
        subscriptions[chatRoomId] = messageListener
        listenerContainer.addMessageListener(messageListener, topic)
        
        logger.info("Subscribed to chat events for room: {}", chatRoomId)
    }
    
    override fun unsubscribe(chatRoomId: String) {
        subscriptions.remove(chatRoomId)?.let { listener ->
            listenerContainer.removeMessageListener(listener)
            logger.info("Unsubscribed from chat events for room: {}", chatRoomId)
        }
    }
}