package com.privo.infrastructure.messaging

import com.fasterxml.jackson.annotation.JsonSubTypes
import com.fasterxml.jackson.annotation.JsonTypeInfo
import com.privo.application.dto.ChatRoomResponse
import java.time.LocalDateTime

@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "type"
)
@JsonSubTypes(
    JsonSubTypes.Type(value = ChatRoomListUpdatedEvent::class, name = "CHAT_ROOM_LIST_UPDATED")
)
sealed class UserEvent {
    abstract val userId: String
    abstract val timestamp: LocalDateTime
}

data class ChatRoomListUpdatedEvent(
    override val userId: String,
    val chatRooms: List<ChatRoomResponse>,
    override val timestamp: LocalDateTime = LocalDateTime.now()
) : UserEvent()