package com.privo.presentation.controller

import com.privo.application.dto.*
import com.privo.application.usecase.*
import com.privo.domain.repository.ChatRoomMemberRepository
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/chat")
class ChatController(
    private val createChatRoomUseCase: CreateChatRoomUseCase,
    private val getChatRoomsUseCase: GetChatRoomsUseCase,
    private val sendMessageUseCase: SendMessageUseCase,
    private val getMessagesUseCase: GetMessagesUseCase,
    private val sendDirectMessageUseCase: SendDirectMessageUseCase,
    private val chatRoomMemberRepository: ChatRoomMemberRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(ChatController::class.java)
    }
    
    @GetMapping("/debug/rooms/{userHashedId}")
    fun debugChatRooms(@PathVariable userHashedId: String): ResponseEntity<Any> {
        return try {
            logger.info("Debug: Getting chat rooms for user: {}", userHashedId)
            val chatRooms = getChatRoomsUseCase.execute(userHashedId)
            logger.info("Debug: Found {} chat rooms for user {}", chatRooms.size, userHashedId)
            
            // Additional debugging: check raw memberships
            val memberships = chatRoomMemberRepository.findByUserHashedId(userHashedId)
            val activeMemberships = chatRoomMemberRepository.findActiveChatRoomsByUserHashedId(userHashedId)
            
            logger.info("Debug: User {} has {} total memberships, {} active", 
                userHashedId, memberships.size, activeMemberships.size)
            
            memberships.forEach { membership ->
                logger.info("Debug: Membership - Room: {}, Active: {}, Role: {}", 
                    membership.chatRoomId, membership.isActive, membership.role)
            }
            
            ResponseEntity.ok(mapOf(
                "userHashedId" to userHashedId,
                "chatRoomsCount" to chatRooms.size,
                "chatRooms" to chatRooms,
                "totalMemberships" to memberships.size,
                "activeMemberships" to activeMemberships.size,
                "memberships" to memberships.map { mapOf(
                    "chatRoomId" to it.chatRoomId,
                    "isActive" to it.isActive,
                    "role" to it.role.name
                )}
            ))
        } catch (e: Exception) {
            logger.error("Debug chat rooms error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @PostMapping("/rooms")
    fun createChatRoom(
        @Valid @RequestBody request: CreateChatRoomRequest,
        authentication: Authentication
    ): ResponseEntity<Any> {
        return try {
            val userHashedId = authentication.name
            val chatRoom = createChatRoomUseCase.execute(request, userHashedId)
            
            ResponseEntity.status(HttpStatus.CREATED).body(chatRoom)
        } catch (e: IllegalArgumentException) {
            logger.warn("Create chat room failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "채팅방 생성에 실패했습니다")))
        } catch (e: Exception) {
            logger.error("Create chat room error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @GetMapping("/rooms")
    fun getChatRooms(authentication: Authentication): ResponseEntity<Any> {
        return try {
            val userHashedId = authentication.name
            val chatRooms = getChatRoomsUseCase.execute(userHashedId)
            
            ResponseEntity.ok(chatRooms)
        } catch (e: Exception) {
            logger.error("Get chat rooms error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @PostMapping("/rooms/{chatRoomId}/messages")
    fun sendMessage(
        @PathVariable chatRoomId: String,
        @Valid @RequestBody request: SendMessageRequest,
        authentication: Authentication
    ): ResponseEntity<Any> {
        return try {
            val userHashedId = authentication.name
            val message = sendMessageUseCase.execute(chatRoomId, request, userHashedId)
            
            ResponseEntity.status(HttpStatus.CREATED).body(message)
        } catch (e: IllegalArgumentException) {
            logger.warn("Send message failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "메시지 전송에 실패했습니다")))
        } catch (e: Exception) {
            logger.error("Send message error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @GetMapping("/rooms/{chatRoomId}/messages")
    fun getMessages(
        @PathVariable chatRoomId: String,
        @RequestParam(defaultValue = "50") limit: Int,
        @RequestParam(defaultValue = "0") offset: Int,
        @RequestParam(required = false) after: String?,
        authentication: Authentication
    ): ResponseEntity<Any> {
        return try {
            val userHashedId = authentication.name
            val request = GetMessagesRequest(limit, offset, after)
            val messages = getMessagesUseCase.execute(chatRoomId, request, userHashedId)
            
            ResponseEntity.ok(messages)
        } catch (e: IllegalArgumentException) {
            logger.warn("Get messages failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "메시지 조회에 실패했습니다")))
        } catch (e: Exception) {
            logger.error("Get messages error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @PostMapping("/direct-messages")
    fun sendDirectMessage(
        @Valid @RequestBody request: SendDirectMessageRequest,
        authentication: Authentication
    ): ResponseEntity<Any> {
        return try {
            val senderHashedId = authentication.name
            logger.info("API: Sending DM from {} to {}", senderHashedId, request.recipientHashedId)
            
            val message = sendDirectMessageUseCase.execute(request, senderHashedId)
            logger.info("API: DM sent successfully, chatRoomId: {}", message.chatRoomId)
            
            ResponseEntity.status(HttpStatus.CREATED).body(message)
        } catch (e: IllegalArgumentException) {
            logger.warn("Send direct message failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "다이렉트 메시지 전송에 실패했습니다")))
        } catch (e: Exception) {
            logger.error("Send direct message error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
}