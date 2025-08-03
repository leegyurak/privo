package com.privo.presentation.controller

import com.privo.application.dto.BlockUserRequest
import com.privo.application.dto.UnblockUserRequest
import com.privo.application.usecase.BlockUserUseCase
import com.privo.application.usecase.GetBlockedUsersUseCase
import com.privo.application.usecase.UnblockUserUseCase
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/users")
class BlockController(
    private val blockUserUseCase: BlockUserUseCase,
    private val unblockUserUseCase: UnblockUserUseCase,
    private val getBlockedUsersUseCase: GetBlockedUsersUseCase
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(BlockController::class.java)
    }
    
    @PostMapping("/block")
    fun blockUser(
        @Valid @RequestBody request: BlockUserRequest,
        authentication: Authentication
    ): ResponseEntity<Any> {
        return try {
            val userId = authentication.name
            logger.info("User {} attempting to block user: {}", userId, request.targetUserId)
            
            blockUserUseCase.execute(userId, request.targetUserId)
            logger.info("User {} successfully blocked user: {}", userId, request.targetUserId)
            
            ResponseEntity.ok(mapOf("message" to "사용자를 차단했습니다"))
        } catch (e: IllegalArgumentException) {
            logger.warn("Block user failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "사용자 차단에 실패했습니다")))
        } catch (e: Exception) {
            logger.error("Block user error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @PostMapping("/unblock")
    fun unblockUser(
        @Valid @RequestBody request: UnblockUserRequest,
        authentication: Authentication
    ): ResponseEntity<Any> {
        return try {
            val userId = authentication.name
            logger.info("User {} attempting to unblock user: {}", userId, request.targetUserId)
            
            unblockUserUseCase.execute(userId, request.targetUserId)
            logger.info("User {} successfully unblocked user: {}", userId, request.targetUserId)
            
            ResponseEntity.ok(mapOf("message" to "사용자 차단을 해제했습니다"))
        } catch (e: IllegalArgumentException) {
            logger.warn("Unblock user failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "사용자 차단 해제에 실패했습니다")))
        } catch (e: Exception) {
            logger.error("Unblock user error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @GetMapping("/blocked")
    fun getBlockedUsers(authentication: Authentication): ResponseEntity<Any> {
        return try {
            val userId = authentication.name
            logger.info("Getting blocked users for user: {}", userId)
            
            val blockedUsers = getBlockedUsersUseCase.execute(userId)
            logger.info("Found {} blocked users for user: {}", blockedUsers.size, userId)
            
            ResponseEntity.ok(blockedUsers)
        } catch (e: Exception) {
            logger.error("Get blocked users error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
}