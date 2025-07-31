package com.privo.infrastructure.messaging

interface EventPublisher {
    fun publishChatEvent(event: ChatEvent)
}