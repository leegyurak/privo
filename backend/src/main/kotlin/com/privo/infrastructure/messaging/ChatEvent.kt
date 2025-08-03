package com.privo.infrastructure.messaging

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import java.time.LocalDateTime

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "type"
)
@JsonSubTypes(
    JsonSubTypes.Type(value = MessageSentEvent::class, name = "MESSAGE_SENT"),
    JsonSubTypes.Type(value = UserJoinedEvent::class, name = "USER_JOINED"),
    JsonSubTypes.Type(value = UserLeftEvent::class, name = "USER_LEFT"),
    JsonSubTypes.Type(value = TypingStartedEvent::class, name = "TYPING_STARTED"),
    JsonSubTypes.Type(value = TypingStoppedEvent::class, name = "TYPING_STOPPED"),
    JsonSubTypes.Type(value = ChatRoomCreatedEvent::class, name = "CHAT_ROOM_CREATED"),
    JsonSubTypes.Type(value = ChatRoomUpdatedEvent::class, name = "CHAT_ROOM_UPDATED")
)
sealed class ChatEvent {
    abstract val chatRoomId: String
    abstract val timestamp: LocalDateTime
}

data class MessageSentEvent(
    override val chatRoomId: String,
    val messageId: String,
    val senderId: String,
    val encryptedContent: String,
    val contentIv: String,
    val messageType: String,
    override val timestamp: LocalDateTime = LocalDateTime.now()
) : ChatEvent()

data class UserJoinedEvent(
    override val chatRoomId: String,
    val userId: String,
    override val timestamp: LocalDateTime = LocalDateTime.now()
) : ChatEvent()

data class UserLeftEvent(
    override val chatRoomId: String,
    val userId: String,
    override val timestamp: LocalDateTime = LocalDateTime.now()
) : ChatEvent()

data class TypingStartedEvent(
    override val chatRoomId: String,
    val userId: String,
    val nickname: String,
    override val timestamp: LocalDateTime = LocalDateTime.now()
) : ChatEvent()

data class TypingStoppedEvent(
    override val chatRoomId: String,
    val userId: String,
    val nickname: String,
    override val timestamp: LocalDateTime = LocalDateTime.now()
) : ChatEvent()

data class ChatRoomCreatedEvent(
    override val chatRoomId: String,
    val roomName: String,
    val isDirectMessage: Boolean,
    val memberCount: Int,
    val createdBy: String,
    override val timestamp: LocalDateTime = LocalDateTime.now()
) : ChatEvent()

data class ChatRoomUpdatedEvent(
    override val chatRoomId: String,
    val roomName: String,
    val isDirectMessage: Boolean,
    val memberCount: Int,
    override val timestamp: LocalDateTime = LocalDateTime.now()
) : ChatEvent()