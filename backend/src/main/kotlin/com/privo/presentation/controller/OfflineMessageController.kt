package com.privo.presentation.controller

import com.privo.infrastructure.messaging.OfflineMessageStore
import com.privo.application.dto.ChatMessageResponse
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.core.userdetails.UserDetails
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/offline-messages")
class OfflineMessageController(
    private val offlineMessageStore: OfflineMessageStore
) {
    
    /**
     * Get all offline messages for the current user
     */
    @GetMapping
    fun getOfflineMessages(
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<OfflineMessagesResponse> {
        val userHashedId = userDetails.username
        val offlineMessages = offlineMessageStore.getAndClearOfflineMessages(userHashedId)
        
        val messageResponses = offlineMessages.map { message ->
            ChatMessageResponse(
                id = message.id,
                chatRoomId = message.chatRoomId,
                senderHashedId = message.senderHashedId,
                encryptedContent = message.encryptedContent,
                contentIv = message.contentIv,
                messageType = message.messageType,
                timestamp = message.timestamp.toString(),
                isDeleted = message.isDeleted
            )
        }
        
        return ResponseEntity.ok(
            OfflineMessagesResponse(
                count = messageResponses.size,
                messages = messageResponses
            )
        )
    }
    
    /**
     * Check if user has offline messages
     */
    @GetMapping("/count")
    fun getOfflineMessageCount(
        @AuthenticationPrincipal userDetails: UserDetails
    ): ResponseEntity<OfflineMessageCountResponse> {
        val userHashedId = userDetails.username
        val count = offlineMessageStore.getOfflineMessageCount(userHashedId)
        
        return ResponseEntity.ok(
            OfflineMessageCountResponse(
                count = count,
                hasMessages = count > 0
            )
        )
    }
}

data class OfflineMessagesResponse(
    val count: Int,
    val messages: List<ChatMessageResponse>
)

data class OfflineMessageCountResponse(
    val count: Long,
    val hasMessages: Boolean
)