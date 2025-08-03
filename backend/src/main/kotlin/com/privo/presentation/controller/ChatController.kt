package com.privo.presentation.controller

import com.privo.application.dto.*
import com.privo.application.usecase.CreateChatRoomUseCase
import com.privo.application.usecase.GetChatRoomsUseCase
import com.privo.application.usecase.LeaveChatRoomUseCase
import com.privo.application.usecase.SendDirectMessageUseCase
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
    private val leaveChatRoomUseCase: LeaveChatRoomUseCase,
    private val sendDirectMessageUseCase: SendDirectMessageUseCase,
    private val chatRoomMemberRepository: ChatRoomMemberRepository
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(ChatController::class.java)
    }
    
    @GetMapping("/debug/rooms/{userId}")
    fun debugChatRooms(@PathVariable userId: String): ResponseEntity<Any> {
        return try {
            logger.info("Debug: Getting chat rooms for user: {}", userId)
            val chatRooms = getChatRoomsUseCase.execute(userId)
            logger.info("Debug: Found {} chat rooms for user {}", chatRooms.size, userId)
            
            // Additional debugging: check raw memberships
            val memberships = chatRoomMemberRepository.findByUserId(userId)
            val activeMemberships = chatRoomMemberRepository.findActiveChatRoomsByUserId(userId)
            
            logger.info("Debug: User {} has {} total memberships, {} active", 
                userId, memberships.size, activeMemberships.size)
            
            memberships.forEach { membership ->
                logger.info("Debug: Membership - Room: {}, Active: {}, Role: {}", 
                    membership.chatRoomId, membership.isActive, membership.role)
            }
            
            ResponseEntity.ok(mapOf(
                "userId" to userId,
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
            val userId = authentication.name
            val chatRoom = createChatRoomUseCase.execute(request, userId)
            
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
            val userId = authentication.name
            val chatRooms = getChatRoomsUseCase.execute(userId)
            
            ResponseEntity.ok(chatRooms)
        } catch (e: Exception) {
            logger.error("Get chat rooms error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    
    @PostMapping("/rooms/direct-messages")
    fun createDirectMessageRoom(
        @Valid @RequestBody request: CreateDirectMessageRoomRequest,
        authentication: Authentication
    ): ResponseEntity<Any> {
        return try {
            val senderId = authentication.name
            logger.info("API: Creating DM room between {} and {}", senderId, request.recipientHashedId)
            
            val chatRoom = sendDirectMessageUseCase.createDirectMessageRoom(request.recipientHashedId, senderId, request.name)
            logger.info("API: DM room created successfully: {}", chatRoom.id)
            
            ResponseEntity.status(HttpStatus.CREATED).body(chatRoom)
        } catch (e: IllegalArgumentException) {
            logger.warn("Create direct message room failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "DM 채팅방 생성에 실패했습니다")))
        } catch (e: Exception) {
            logger.error("Create direct message room error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @PostMapping("/rooms/{chatRoomId}/leave")
    fun leaveChatRoom(
        @PathVariable chatRoomId: String,
        authentication: Authentication
    ): ResponseEntity<Any> {
        return try {
            val userId = authentication.name
            logger.info("User {} attempting to leave chat room: {}", userId, chatRoomId)
            
            leaveChatRoomUseCase.execute(chatRoomId, userId)
            logger.info("User {} successfully left chat room: {}", userId, chatRoomId)
            
            ResponseEntity.ok(mapOf("message" to "채팅방에서 나갔습니다"))
        } catch (e: IllegalArgumentException) {
            logger.warn("Leave chat room failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "채팅방 나가기에 실패했습니다")))
        } catch (e: Exception) {
            logger.error("Leave chat room error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
}