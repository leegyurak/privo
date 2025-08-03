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
    private lateinit var sendDirectMessageUseCase: SendDirectMessageUseCase
    
    // Required due to AuthController dependency
    @MockkBean
    private lateinit var registerUserUseCase: RegisterUserUseCase
    
    @MockkBean
    private lateinit var loginUserUseCase: LoginUserUseCase
    
    @MockkBean
    private lateinit var getUserByNicknameUseCase: GetUserByNicknameUseCase
    
    // Required due to NicknameGeneratorService dependency
    @MockkBean
    private lateinit var nicknameGeneratorService: NicknameGeneratorService
    
    // Required due to ChatController dependency
    @MockkBean
    private lateinit var chatRoomMemberRepository: com.privo.domain.repository.ChatRoomMemberRepository
    
    @Test
    @WithMockUser(username = "hashed-user-id")
    fun `should create chat room successfully`() {
        // Given
        val request = CreateChatRoomRequest(
            name = "Test Room"
        )
        
        val response = ChatRoomResponse(
            id = "room-123",
            name = "Test Room",
            isDirectMessage = false,
            memberCount = 1,
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
        
        verify { createChatRoomUseCase.execute(request, "hashed-user-id") }
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
            .andExpect(jsonPath("$[0].isDirectMessage").value(false))
            .andExpect(jsonPath("$[1].id").value("room-2"))
            .andExpect(jsonPath("$[1].isDirectMessage").value(true))
        
        verify { getChatRoomsUseCase.execute("hashed-user-id") }
    }
    
    @Test
    @WithMockUser(username = "hashed-user-id")
    fun `should create direct message room successfully`() {
        // Given
        val request = CreateDirectMessageRoomRequest(
            recipientHashedId = "recipient-hashed-id",
            name = "Test DM Room"
        )
        
        val response = ChatRoomResponse(
            id = "dm-room-123",
            name = "Direct Message",
            isDirectMessage = true,
            memberCount = 2,
            createdAt = "2023-01-01T00:00:00",
            updatedAt = "2023-01-01T00:00:00"
        )
        
        every { sendDirectMessageUseCase.createDirectMessageRoom("recipient-hashed-id", "hashed-user-id", "Test DM Room") } returns response
        
        // When & Then
        mockMvc.perform(
            post("/api/chat/rooms/direct-messages")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.id").value("dm-room-123"))
            .andExpect(jsonPath("$.name").value("Direct Message"))
            .andExpect(jsonPath("$.isDirectMessage").value(true))
            .andExpect(jsonPath("$.memberCount").value(2))
        
        verify { sendDirectMessageUseCase.createDirectMessageRoom("recipient-hashed-id", "hashed-user-id", "Test DM Room") }
    }
    
    @Test
    fun `should return forbidden for unauthenticated requests`() {
        // When & Then
        mockMvc.perform(get("/api/chat/rooms"))
            .andExpect(status().isForbidden)
        
        verify(exactly = 0) { getChatRoomsUseCase.execute(any()) }
    }
}