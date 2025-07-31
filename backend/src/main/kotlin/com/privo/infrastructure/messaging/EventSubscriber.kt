package com.privo.infrastructure.messaging

interface EventSubscriber {
    fun subscribe(chatRoomId: String, handler: (ChatEvent) -> Unit)
    fun unsubscribe(chatRoomId: String)
}