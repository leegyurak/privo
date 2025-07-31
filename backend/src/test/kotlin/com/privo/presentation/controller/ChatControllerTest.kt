package com.privo.presentation.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.ninjasquad.springmockk.MockkBean
import com.privo.application.dto.*
import com.privo.application.usecase.*
import com.privo.application.service.NicknameGeneratorService
import io.mockk.every
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.test.context.support.WithMockUser
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@WebMvcTest(ChatController::class)
@ActiveProfiles("test")
@Import(TestSecurityConfig::class)
class ChatControllerTest {
    
    @Autowired
    private lateinit var mockMvc: MockMvc
    
    @Autowired
    private lateinit var objectMapper: ObjectMapper
    
    @MockkBean
    private lateinit var createChatRoomUseCase: CreateChatRoomUseCase
    
    @MockkBean
    private lateinit var getChatRoomsUseCase: GetChatRoomsUseCase
    
    @MockkBean
    private lateinit var sendMessageUseCase: SendMessageUseCase
    
    @MockkBean
    private lateinit var getMessagesUseCase: GetMessagesUseCase
    
    @MockkBean
    private lateinit var sendDirectMessageUseCase: SendDirectMessageUseCase
    
    // Required due to AuthController dependency
    @MockkBean
    private lateinit var registerUserUseCase: RegisterUserUseCase
    
    @MockkBean
    private lateinit var loginUserUseCase: LoginUserUseCase
    
    @MockkBean
    private lateinit var getUserByNicknameUseCase: GetUserByNicknameUseCase
    
    @MockkBean
    private lateinit var nicknameGeneratorService: NicknameGeneratorService
    
    @MockkBean
    private lateinit var chatRoomMemberRepository: com.privo.domain.repository.ChatRoomMemberRepository
    
    @Test
    @WithMockUser(username = "hashed-user-id")
    fun `should create chat room successfully`() {
        // Given
        val request = CreateChatRoomRequest(
            name = "Test Room",
            isDirectMessage = false,
            memberUserHashedIds = listOf("member1", "member2")
        )
        
        val response = ChatRoomResponse(
            id = "room-123",
            name = "Test Room",
            isDirectMessage = false,
            memberCount = 3,
            createdAt = "2023-01-01T00:00:00",
            updatedAt = "2023-01-01T00:00:00"
        )
        
        every { createChatRoomUseCase.execute(request, "hashed-user-id") } returns response
        
        // When & Then
        mockMvc.perform(
            post("/api/chat/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").value("room-123"))
            .andExpect(jsonPath("$.name").value("Test Room"))
            .andExpect(jsonPath("$.isDirectMessage").value(false))
            .andExpect(jsonPath("$.memberCount").value(3))
        
        verify { createChatRoomUseCase.execute(request, "hashed-user-id") }
    }
    
    @Test
    @WithMockUser(username = "hashed-user-id")
    fun `should return bad request for invalid chat room creation`() {
        // Given
        val invalidRequest = CreateChatRoomRequest(
            name = "", // Empty name
            isDirectMessage = false
        )
        
        // When & Then
        mockMvc.perform(
            post("/api/chat/rooms")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("입력값 검증 실패"))
        
        verify(exactly = 0) { createChatRoomUseCase.execute(any(), any()) }
    }
    
    @Test
    @WithMockUser(username = "hashed-user-id")
    fun `should get chat rooms successfully`() {
        // Given
        val chatRooms = listOf(
            ChatRoomResponse(
                id = "room-1",
                name = "Room 1",
                isDirectMessage = false,
                memberCount = 2,
                createdAt = "2023-01-01T00:00:00",
                updatedAt = "2023-01-01T00:00:00"
            ),
            ChatRoomResponse(
                id = "room-2",
                name = "Room 2",
                isDirectMessage = true,
                memberCount = 2,
                createdAt = "2023-01-01T01:00:00",
                updatedAt = "2023-01-01T01:00:00"
            )
        )
        
        every { getChatRoomsUseCase.execute("hashed-user-id") } returns chatRooms
        
        // When & Then
        mockMvc.perform(get("/api/chat/rooms"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value("room-1"))
            .andExpect(jsonPath("$[0].name").value("Room 1"))
            .andExpect(jsonPath("$[1].id").value("room-2"))
            .andExpect(jsonPath("$[1].isDirectMessage").value(true))
        
        verify { getChatRoomsUseCase.execute("hashed-user-id") }
    }
    
    @Test
    @WithMockUser(username = "hashed-user-id")
    fun `should send message successfully`() {
        // Given
        val chatRoomId = "room-123"
        val request = SendMessageRequest(
            encryptedContent = "encrypted-content",
            contentIv = "iv-string",
            messageType = "TEXT"
        )
        
        val response = ChatMessageResponse(
            id = "msg-123",
            chatRoomId = chatRoomId,
            senderHashedId = "hashed-user-id",
            encryptedContent = "encrypted-content",
            contentIv = "iv-string",
            messageType = "TEXT",
            timestamp = "2023-01-01T00:00:00",
            isDeleted = false
        )
        
        every { sendMessageUseCase.execute(chatRoomId, request, "hashed-user-id") } returns response
        
        // When & Then
        mockMvc.perform(
            post("/api/chat/rooms/$chatRoomId/messages")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").value("msg-123"))
            .andExpect(jsonPath("$.chatRoomId").value(chatRoomId))
            .andExpect(jsonPath("$.encryptedContent").value("encrypted-content"))
            .andExpect(jsonPath("$.contentIv").value("iv-string"))
            .andExpect(jsonPath("$.messageType").value("TEXT"))
        
        verify { sendMessageUseCase.execute(chatRoomId, request, "hashed-user-id") }
    }
    
    @Test
    @WithMockUser(username = "hashed-user-id")
    fun `should return bad request for empty message content`() {
        // Given
        val chatRoomId = "room-123"
        val invalidRequest = SendMessageRequest(
            encryptedContent = "", // Empty content
            contentIv = "",        // Empty IV
            messageType = "TEXT"
        )
        
        // When & Then
        mockMvc.perform(
            post("/api/chat/rooms/$chatRoomId/messages")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("입력값 검증 실패"))
        
        verify(exactly = 0) { sendMessageUseCase.execute(any(), any(), any()) }
    }
    
    @Test
    @WithMockUser(username = "hashed-user-id")
    fun `should handle send message business logic error`() {
        // Given
        val chatRoomId = "room-123"
        val request = SendMessageRequest(
            encryptedContent = "encrypted-content",
            contentIv = "iv-string",
            messageType = "TEXT"
        )
        
        every { sendMessageUseCase.execute(chatRoomId, request, "hashed-user-id") } throws IllegalArgumentException("채팅방에 참여하지 않은 사용자입니다")
        
        // When & Then
        mockMvc.perform(
            post("/api/chat/rooms/$chatRoomId/messages")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("채팅방에 참여하지 않은 사용자입니다"))
        
        verify { sendMessageUseCase.execute(chatRoomId, request, "hashed-user-id") }
    }
    
    @Test
    @WithMockUser(username = "hashed-user-id")
    fun `should get messages successfully`() {
        // Given
        val chatRoomId = "room-123"
        val messages = listOf(
            ChatMessageResponse(
                id = "msg-1",
                chatRoomId = chatRoomId,
                senderHashedId = "sender-1",
                encryptedContent = "content-1",
                contentIv = "iv-1",
                messageType = "TEXT",
                timestamp = "2023-01-01T00:00:00",
                isDeleted = false
            ),
            ChatMessageResponse(
                id = "msg-2",
                chatRoomId = chatRoomId,
                senderHashedId = "sender-2",
                encryptedContent = "content-2",
                contentIv = "iv-2",
                messageType = "IMAGE",
                timestamp = "2023-01-01T01:00:00",
                isDeleted = false
            )
        )
        
        val expectedRequest = GetMessagesRequest(limit = 50, offset = 0, after = null)
        every { getMessagesUseCase.execute(chatRoomId, expectedRequest, "hashed-user-id") } returns messages
        
        // When & Then
        mockMvc.perform(get("/api/chat/rooms/$chatRoomId/messages"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$.length()").value(2))
            .andExpect(jsonPath("$[0].id").value("msg-1"))
            .andExpect(jsonPath("$[0].messageType").value("TEXT"))
            .andExpect(jsonPath("$[1].id").value("msg-2"))
            .andExpect(jsonPath("$[1].messageType").value("IMAGE"))
        
        verify { getMessagesUseCase.execute(chatRoomId, expectedRequest, "hashed-user-id") }
    }
    
    @Test
    @WithMockUser(username = "hashed-user-id")
    fun `should get messages with custom parameters`() {
        // Given
        val chatRoomId = "room-123"
        val messages = emptyList<ChatMessageResponse>()
        
        val expectedRequest = GetMessagesRequest(limit = 20, offset = 10, after = "2023-01-01T00:00:00")
        every { getMessagesUseCase.execute(chatRoomId, expectedRequest, "hashed-user-id") } returns messages
        
        // When & Then
        mockMvc.perform(
            get("/api/chat/rooms/$chatRoomId/messages")
                .param("limit", "20")
                .param("offset", "10")
                .param("after", "2023-01-01T00:00:00")
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$").isArray)
            .andExpect(jsonPath("$.length()").value(0))
        
        verify { getMessagesUseCase.execute(chatRoomId, expectedRequest, "hashed-user-id") }
    }
    
    @Test
    fun `should return unauthorized for unauthenticated requests`() {
        // When & Then
        mockMvc.perform(get("/api/chat/rooms"))
            .andExpect(status().isForbidden)
        
        verify(exactly = 0) { getChatRoomsUseCase.execute(any()) }
    }
}