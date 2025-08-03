package com.privo.presentation.websocket

import com.fasterxml.jackson.databind.ObjectMapper
import com.privo.application.dto.SendMessageRequest
import com.privo.application.usecase.GetChatRoomsUseCase
import com.privo.application.usecase.SendMessageUseCase
import com.privo.domain.repository.ChatRoomMemberRepository
import com.privo.domain.repository.UserRepository
import com.privo.infrastructure.messaging.*
import com.privo.infrastructure.security.JwtTokenProvider
import com.privo.infrastructure.websocket.WebSocketSessionManager
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Component
import org.springframework.web.socket.*
import java.util.concurrent.ConcurrentHashMap

@Component
class ChatWebSocketHandler(
    private val jwtTokenProvider: JwtTokenProvider,
    private val eventSubscriber: EventSubscriber,
    private val userEventSubscriber: UserEventSubscriber,
    private val objectMapper: ObjectMapper,
    private val sendMessageUseCase: SendMessageUseCase,
    private val getChatRoomsUseCase: GetChatRoomsUseCase,
    private val chatRoomMemberRepository: ChatRoomMemberRepository,
    private val userRepository: UserRepository,
    private val webSocketSessionManager: WebSocketSessionManager,
    private val offlineMessageStore: OfflineMessageStore
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
        
        val userId = jwtTokenProvider.getUserIdFromToken(token)
        sessions[session.id] = session
        
        userSessions.computeIfAbsent(userId) { mutableSetOf() }.add(session.id)
        sessionSubscriptions[session.id] = mutableSetOf()
        
        // WebSocketSessionManager에도 세션 등록
        webSocketSessionManager.addSession(userId, session)
        
        // 사용자별 이벤트 구독 (채팅방 목록 업데이트 등)
        subscribeToUserEvents(userId, session)
        
        logger.info("WebSocket connection established for user: {} with session: {}", userId, session.id)
        
        // 오프라인 메시지 전송
        sendOfflineMessages(userId, session)
    }
    
    override fun handleMessage(session: WebSocketSession, message: WebSocketMessage<*>) {
        if (message is TextMessage) {
            try {
                logger.info("WebSocket message received: {}", message.payload)
                val messageData = objectMapper.readTree(message.payload)
                val action = messageData.get("action")?.asText()
                
                logger.info("Processing WebSocket action: {}", action)
                
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
                    "sendMessage" -> {
                        val chatRoomId = messageData.get("chatRoomId")?.asText()
                        val encryptedContent = messageData.get("encryptedContent")?.asText()
                        val contentIv = messageData.get("contentIv")?.asText()
                        val messageType = messageData.get("messageType")?.asText() ?: "TEXT"
                        val replyToMessageId = messageData.get("replyToMessageId")?.asText()
                        
                        if (chatRoomId != null && encryptedContent != null && contentIv != null) {
                            handleSendMessage(session, chatRoomId, encryptedContent, contentIv, messageType, replyToMessageId)
                        }
                    }
                    "startTyping" -> {
                        val chatRoomId = messageData.get("chatRoomId")?.asText()
                        if (chatRoomId != null) {
                            handleStartTyping(session, chatRoomId)
                        }
                    }
                    "stopTyping" -> {
                        val chatRoomId = messageData.get("chatRoomId")?.asText()
                        if (chatRoomId != null) {
                            handleStopTyping(session, chatRoomId)
                        }
                    }
                    "getChatRooms" -> {
                        handleGetChatRooms(session)
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
        
        // 사용자 ID 찾기
        val userId = userSessions.entries.find { (_, sessionIds) -> 
            sessionIds.contains(session.id) 
        }?.key
        
        sessions.remove(session.id)
        
        sessionSubscriptions[session.id]?.forEach { chatRoomId ->
            eventSubscriber.unsubscribe(chatRoomId)
        }
        sessionSubscriptions.remove(session.id)
        
        userSessions.values.forEach { sessionIds ->
            sessionIds.remove(session.id)
        }
        userSessions.entries.removeIf { it.value.isEmpty() }
        
        // WebSocketSessionManager에서도 세션 제거
        if (userId != null) {
            webSocketSessionManager.removeSession(userId, session)
            // 사용자별 이벤트 구독 해제
            unsubscribeFromUserEvents(userId)
        }
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
            
            // 채팅방의 활성 멤버들 조회
            val activeMembers = chatRoomMemberRepository.findByChatRoomId(chatRoomId)
                .filter { it.isActive }
            
            logger.debug("Sending message to {} active members in room {}", activeMembers.size, chatRoomId)
            
            // 각 멤버의 활성 세션에 메시지 전송
            activeMembers.forEach { member ->
                val memberSessions = webSocketSessionManager.getUserSessions(member.userId)
                memberSessions.forEach { session ->
                    if (session.isOpen) {
                        try {
                            session.sendMessage(message)
                            logger.debug("Sent message to user {} via session {}", member.userId, session.id)
                        } catch (e: Exception) {
                            logger.error("Failed to send message to user {} session {}", member.userId, session.id, e)
                        }
                    }
                }
                
                if (memberSessions.isEmpty()) {
                    logger.debug("User {} is offline, message will be stored for later delivery", member.userId)
                }
            }
        } catch (e: Exception) {
            logger.error("Failed to handle chat event for room {}", chatRoomId, e)
        }
    }
    
    private fun handleSendMessage(
        session: WebSocketSession, 
        chatRoomId: String, 
        encryptedContent: String, 
        contentIv: String,
        messageType: String = "TEXT",
        replyToMessageId: String? = null
    ) {
        try {
            val token = extractTokenFromQuery(session)
            if (token == null || !jwtTokenProvider.validateToken(token)) {
                logger.warn("Invalid token for send message")
                sendErrorResponse(session, "인증 토큰이 유효하지 않습니다")
                return
            }
            
            val userId = jwtTokenProvider.getUserIdFromToken(token)
            val request = SendMessageRequest(encryptedContent, contentIv, messageType, replyToMessageId)
            
            val message = sendMessageUseCase.execute(chatRoomId, request, userId)
            logger.info("Message sent via WebSocket: chatRoomId={}, userId={}, messageType={}", 
                chatRoomId, userId, messageType)
            
            val response = mapOf(
                "action" to "messageSent",
                "success" to true,
                "message" to message
            )
            session.sendMessage(TextMessage(objectMapper.writeValueAsString(response)))
            
        } catch (e: IllegalArgumentException) {
            logger.warn("WebSocket send message validation failed: {}", e.message)
            sendErrorResponse(session, e.message ?: "메시지 전송에 실패했습니다")
        } catch (e: Exception) {
            logger.error("Failed to send message via WebSocket", e)
            sendErrorResponse(session, "서버 오류가 발생했습니다")
        }
    }
    
    private fun sendErrorResponse(session: WebSocketSession, errorMessage: String) {
        val errorResponse = mapOf(
            "action" to "messageSent",
            "success" to false,
            "error" to errorMessage
        )
        try {
            session.sendMessage(TextMessage(objectMapper.writeValueAsString(errorResponse)))
        } catch (sendError: Exception) {
            logger.error("Failed to send error response", sendError)
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
    
    private fun sendOfflineMessages(userId: String, session: WebSocketSession) {
        try {
            val offlineMessages = offlineMessageStore.getAndClearOfflineMessages(userId)
            
            if (offlineMessages.isNotEmpty()) {
                logger.info("Sending {} offline messages to user: {}", offlineMessages.size, userId)
                
                offlineMessages.forEach { offlineMessage ->
                    val messageEvent = mapOf(
                        "action" to "offlineMessage",
                        "id" to offlineMessage.id,
                        "chatRoomId" to offlineMessage.chatRoomId,
                        "senderId" to offlineMessage.senderId,
                        "encryptedContent" to offlineMessage.encryptedContent,
                        "contentIv" to offlineMessage.contentIv,
                        "messageType" to offlineMessage.messageType,
                        "timestamp" to offlineMessage.timestamp.toString()
                    )
                    
                    val messageJson = objectMapper.writeValueAsString(messageEvent)
                    session.sendMessage(TextMessage(messageJson))
                    
                    logger.debug("Sent offline message {} to user {}", offlineMessage.id, userId)
                }
            } else {
                logger.debug("No offline messages for user: {}", userId)
            }
        } catch (e: Exception) {
            logger.error("Failed to send offline messages to user: {}", userId, e)
        }
    }
    
    private fun handleStartTyping(session: WebSocketSession, chatRoomId: String) {
        try {
            val userId = getUserIdFromSession(session)
            if (userId == null) {
                logger.warn("Cannot handle start typing - user ID not found for session: {}", session.id)
                return
            }
            
            // 채팅방 멤버십 확인
            val membership = chatRoomMemberRepository.findByChatRoomIdAndUserId(chatRoomId, userId)
            if (membership == null || !membership.isActive) {
                logger.warn("User {} is not an active member of chat room {}", userId, chatRoomId)
                return
            }
            
            logger.debug("User {} started typing in room: {}", userId, chatRoomId)
            
            // 사용자 닉네임 조회
            val user = userRepository.findById(userId)
            val nickname = user?.nickname ?: "Unknown User"
            
            // 타이핑 시작 이벤트 생성 및 발행
            val typingEvent = TypingStartedEvent(
                chatRoomId = chatRoomId,
                userId = userId,
                nickname = nickname
            )
            
            handleChatEvent(chatRoomId, typingEvent)
            
        } catch (e: Exception) {
            logger.error("Error handling start typing for session: {}", session.id, e)
        }
    }
    
    private fun handleStopTyping(session: WebSocketSession, chatRoomId: String) {
        try {
            val userId = getUserIdFromSession(session)
            if (userId == null) {
                logger.warn("Cannot handle stop typing - user ID not found for session: {}", session.id)
                return
            }
            
            // 채팅방 멤버십 확인
            val membership = chatRoomMemberRepository.findByChatRoomIdAndUserId(chatRoomId, userId)
            if (membership == null || !membership.isActive) {
                logger.warn("User {} is not an active member of chat room {}", userId, chatRoomId)
                return
            }
            
            logger.debug("User {} stopped typing in room: {}", userId, chatRoomId)
            
            // 사용자 닉네임 조회
            val user = userRepository.findById(userId)
            val nickname = user?.nickname ?: "Unknown User"
            
            // 타이핑 종료 이벤트 생성 및 발행
            val typingEvent = TypingStoppedEvent(
                chatRoomId = chatRoomId,
                userId = userId,
                nickname = nickname
            )
            
            handleChatEvent(chatRoomId, typingEvent)
            
        } catch (e: Exception) {
            logger.error("Error handling stop typing for session: {}", session.id, e)
        }
    }
    
    private fun getUserIdFromSession(session: WebSocketSession): String? {
        return userSessions.entries.find { (_, sessionIds) -> 
            sessionIds.contains(session.id) 
        }?.key
    }
    
    private fun subscribeToUserEvents(userId: String, session: WebSocketSession) {
        userEventSubscriber.subscribeToUser(userId) { event ->
            handleUserEvent(userId, event)
        }
        logger.debug("Subscribed to user events for user: {}", userId)
    }
    
    private fun unsubscribeFromUserEvents(userId: String) {
        userEventSubscriber.unsubscribeFromUser(userId)
        logger.debug("Unsubscribed from user events for user: {}", userId)
    }
    
    private fun handleUserEvent(userId: String, event: UserEvent) {
        try {
            val eventJson = objectMapper.writeValueAsString(event)
            val message = TextMessage(eventJson)
            
            // 해당 사용자의 모든 활성 세션에 이벤트 전송
            val userActiveSessions = webSocketSessionManager.getUserSessions(userId)
            userActiveSessions.forEach { session ->
                if (session.isOpen) {
                    try {
                        session.sendMessage(message)
                        logger.debug("Sent user event {} to user {} via session {}", 
                            event::class.simpleName, userId, session.id)
                    } catch (e: Exception) {
                        logger.error("Failed to send user event to user {} session {}", userId, session.id, e)
                    }
                }
            }
        } catch (e: Exception) {
            logger.error("Failed to handle user event for user {}: {}", userId, event, e)
        }
    }
    
    private fun handleGetChatRooms(session: WebSocketSession) {
        try {
            val userId = getUserIdFromSession(session)
            if (userId == null) {
                logger.warn("Cannot get chat rooms - user ID not found for session: {}", session.id)
                sendErrorResponse(session, "사용자 인증이 필요합니다")
                return
            }
            
            val chatRooms = getChatRoomsUseCase.execute(userId)
            
            val response = mapOf(
                "action" to "chatRoomsResponse",
                "success" to true,
                "chatRooms" to chatRooms
            )
            
            session.sendMessage(TextMessage(objectMapper.writeValueAsString(response)))
            logger.debug("Sent chat rooms list to user: {} (count: {})", userId, chatRooms.size)
            
        } catch (e: Exception) {
            logger.error("Failed to get chat rooms via WebSocket", e)
            sendErrorResponse(session, "채팅방 목록을 가져오는데 실패했습니다")
        }
    }
}