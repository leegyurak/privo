package com.privo.infrastructure.websocket

import org.springframework.stereotype.Service
import org.springframework.web.socket.WebSocketSession
import java.util.concurrent.ConcurrentHashMap

@Service
class WebSocketSessionManager {
    
    private val userSessions = ConcurrentHashMap<String, MutableSet<WebSocketSession>>()
    
    /**
     * Add a WebSocket session for a user
     */
    fun addSession(userId: String, session: WebSocketSession) {
        userSessions.computeIfAbsent(userId) { mutableSetOf() }.add(session)
    }
    
    /**
     * Remove a WebSocket session for a user
     */
    fun removeSession(userId: String, session: WebSocketSession) {
        userSessions[userId]?.remove(session)
        if (userSessions[userId]?.isEmpty() == true) {
            userSessions.remove(userId)
        }
    }
    
    /**
     * Check if user is online (has active WebSocket connections)
     */
    fun isUserOnline(userId: String): Boolean {
        return userSessions[userId]?.any { it.isOpen } == true
    }
    
    /**
     * Get all active sessions for a user
     */
    fun getUserSessions(userId: String): Set<WebSocketSession> {
        return userSessions[userId]?.filter { it.isOpen }?.toSet() ?: emptySet()
    }
    
    /**
     * Get all online users
     */
    fun getOnlineUsers(): Set<String> {
        return userSessions.filter { (_, sessions) -> 
            sessions.any { it.isOpen } 
        }.keys
    }
    
    /**
     * Clean up closed sessions
     */
    fun cleanupClosedSessions() {
        userSessions.values.forEach { sessions ->
            sessions.removeIf { !it.isOpen }
        }
        userSessions.entries.removeIf { it.value.isEmpty() }
    }
}