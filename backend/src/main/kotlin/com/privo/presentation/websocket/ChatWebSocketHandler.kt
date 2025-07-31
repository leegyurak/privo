package com.privo.presentation.websocket

import com.fasterxml.jackson.databind.ObjectMapper
import com.privo.infrastructure.messaging.ChatEvent
import com.privo.infrastructure.messaging.EventSubscriber
import com.privo.infrastructure.security.JwtTokenProvider
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.socket.*
import java.util.concurrent.ConcurrentHashMap

@Component
class ChatWebSocketHandler(
    private val jwtTokenProvider: JwtTokenProvider,
    private val eventSubscriber: EventSubscriber,
    private val objectMapper: ObjectMapper
) : WebSocketHandler {
    
    companion object {
        private val logger = LoggerFactory.getLogger(ChatWebSocketHandler::class.java)
    }
    
    private val sessions = ConcurrentHashMap<String, WebSocketSession>()
    private val userSessions = ConcurrentHashMap<String, MutableSet<String>>()
    private val sessionSubscriptions = ConcurrentHashMap<String, MutableSet<String>>()
    
    override fun afterConnectionEstablished(session: WebSocketSession) {
        val token = extractTokenFromQuery(session)
        if (token == null || !jwtTokenProvider.validateToken(token)) {
            logger.warn("Invalid or missing token for WebSocket connection")
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Invalid token"))
            return
        }
        
        val userHashedId = jwtTokenProvider.getUserHashedIdFromToken(token)
        sessions[session.id] = session
        
        userSessions.computeIfAbsent(userHashedId) { mutableSetOf() }.add(session.id)
        sessionSubscriptions[session.id] = mutableSetOf()
        
        logger.info("WebSocket connection established for user: {} with session: {}", userHashedId, session.id)
    }
    
    override fun handleMessage(session: WebSocketSession, message: WebSocketMessage<*>) {
        if (message is TextMessage) {
            try {
                val messageData = objectMapper.readTree(message.payload)
                val action = messageData.get("action")?.asText()
                
                when (action) {
                    "subscribe" -> {
                        val chatRoomId = messageData.get("chatRoomId")?.asText()
                        if (chatRoomId != null) {
                            subscribeToRoom(session, chatRoomId)
                        }
                    }
                    "unsubscribe" -> {
                        val chatRoomId = messageData.get("chatRoomId")?.asText()
                        if (chatRoomId != null) {
                            unsubscribeFromRoom(session, chatRoomId)
                        }
                    }
                    else -> {
                        logger.warn("Unknown action: {}", action)
                    }
                }
            } catch (e: Exception) {
                logger.error("Error handling WebSocket message", e)
            }
        }
    }
    
    override fun handleTransportError(session: WebSocketSession, exception: Throwable) {
        logger.error("WebSocket transport error for session: {}", session.id, exception)
    }
    
    override fun afterConnectionClosed(session: WebSocketSession, closeStatus: CloseStatus) {
        logger.info("WebSocket connection closed for session: {}", session.id)
        
        sessions.remove(session.id)
        
        sessionSubscriptions[session.id]?.forEach { chatRoomId ->
            eventSubscriber.unsubscribe(chatRoomId)
        }
        sessionSubscriptions.remove(session.id)
        
        userSessions.values.forEach { sessionIds ->
            sessionIds.remove(session.id)
        }
        userSessions.entries.removeIf { it.value.isEmpty() }
    }
    
    override fun supportsPartialMessages(): Boolean = false
    
    private fun subscribeToRoom(session: WebSocketSession, chatRoomId: String) {
        sessionSubscriptions[session.id]?.add(chatRoomId)
        
        eventSubscriber.subscribe(chatRoomId) { event ->
            handleChatEvent(chatRoomId, event)
        }
        
        logger.info("Session {} subscribed to chat room: {}", session.id, chatRoomId)
    }
    
    private fun unsubscribeFromRoom(session: WebSocketSession, chatRoomId: String) {
        sessionSubscriptions[session.id]?.remove(chatRoomId)
        eventSubscriber.unsubscribe(chatRoomId)
        
        logger.info("Session {} unsubscribed from chat room: {}", session.id, chatRoomId)
    }
    
    private fun handleChatEvent(chatRoomId: String, event: ChatEvent) {
        try {
            val eventJson = objectMapper.writeValueAsString(event)
            val message = TextMessage(eventJson)
            
            sessions.values.forEach { session ->
                if (session.isOpen && sessionSubscriptions[session.id]?.contains(chatRoomId) == true) {
                    try {
                        session.sendMessage(message)
                    } catch (e: Exception) {
                        logger.error("Failed to send message to session: {}", session.id, e)
                    }
                }
            }
        } catch (e: Exception) {
            logger.error("Failed to handle chat event", e)
        }
    }
    
    private fun extractTokenFromQuery(session: WebSocketSession): String? {
        val query = session.uri?.query ?: return null
        val params = query.split("&").associate {
            val (key, value) = it.split("=", limit = 2)
            key to value
        }
        return params["token"]
    }
}