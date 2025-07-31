package com.privo.application.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.NotNull
import java.time.LocalDateTime

data class CreateChatRoomRequest(
    @field:NotBlank(message = "채팅방 이름은 필수입니다")
    val name: String,
    
    val isDirectMessage: Boolean = false,
    
    val memberUserHashedIds: List<String> = emptyList()
)

data class SendMessageRequest(
    @field:NotBlank(message = "암호화된 메시지 내용은 필수입니다")
    val encryptedContent: String,
    
    @field:NotBlank(message = "초기화 벡터는 필수입니다")
    val contentIv: String,
    
    val messageType: String = "TEXT"
)

data class ChatRoomResponse(
    val id: String,
    val name: String,
    val isDirectMessage: Boolean,
    val memberCount: Int,
    val createdAt: String,
    val updatedAt: String
)

data class ChatMessageResponse(
    val id: String,
    val chatRoomId: String,
    val senderHashedId: String,
    val encryptedContent: String,
    val contentIv: String,
    val messageType: String,
    val timestamp: String,
    val isDeleted: Boolean
)

data class ChatRoomMemberResponse(
    val id: String,
    val chatRoomId: String,
    val userHashedId: String,
    val role: String,
    val joinedAt: String,
    val isActive: Boolean
)

data class GetMessagesRequest(
    val limit: Int = 50,
    val offset: Int = 0,
    val after: String? = null
)

data class SendDirectMessageRequest(
    @field:NotBlank(message = "수신자 해시 ID는 필수입니다")
    val recipientHashedId: String,
    
    @field:NotBlank(message = "암호화된 메시지 내용은 필수입니다")
    val encryptedContent: String,
    
    @field:NotBlank(message = "초기화 벡터는 필수입니다")
    val contentIv: String,
    
    val messageType: String = "TEXT"
)