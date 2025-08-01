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
    fun addSession(userHashedId: String, session: WebSocketSession) {
        userSessions.computeIfAbsent(userHashedId) { mutableSetOf() }.add(session)
    }
    
    /**
     * Remove a WebSocket session for a user
     */
    fun removeSession(userHashedId: String, session: WebSocketSession) {
        userSessions[userHashedId]?.remove(session)
        if (userSessions[userHashedId]?.isEmpty() == true) {
            userSessions.remove(userHashedId)
        }
    }
    
    /**
     * Check if user is online (has active WebSocket connections)
     */
    fun isUserOnline(userHashedId: String): Boolean {
        return userSessions[userHashedId]?.any { it.isOpen } == true
    }
    
    /**
     * Get all active sessions for a user
     */
    fun getUserSessions(userHashedId: String): Set<WebSocketSession> {
        return userSessions[userHashedId]?.filter { it.isOpen }?.toSet() ?: emptySet()
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