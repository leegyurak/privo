package com.privo.presentation.controller

import com.fasterxml.jackson.databind.ObjectMapper
import com.ninjasquad.springmockk.MockkBean
import com.privo.application.dto.AuthResponse
import com.privo.application.dto.LoginRequest
import com.privo.application.dto.RegisterRequest
import com.privo.application.dto.UserProfileResponse
import com.privo.application.service.NicknameGeneratorService
import com.privo.application.usecase.GetUserByNicknameUseCase
import com.privo.application.usecase.LoginUserUseCase
import com.privo.application.usecase.RegisterUserUseCase
import com.privo.domain.model.User
import io.mockk.every
import io.mockk.verify
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@WebMvcTest(AuthController::class)
@ActiveProfiles("test")
@Import(TestSecurityConfig::class)
class AuthControllerTest {
    
    @Autowired
    private lateinit var mockMvc: MockMvc
    
    @Autowired
    private lateinit var objectMapper: ObjectMapper
    
    @MockkBean
    private lateinit var registerUserUseCase: RegisterUserUseCase
    
    @MockkBean
    private lateinit var loginUserUseCase: LoginUserUseCase
    
    @MockkBean
    private lateinit var nicknameGeneratorService: NicknameGeneratorService
    
    @MockkBean
    private lateinit var getUserByNicknameUseCase: GetUserByNicknameUseCase
    
    @Test
    fun `should register user successfully`() {
        // Given
        val request = RegisterRequest(
            nickname = "testuser",
            password = "password123",
            publicKey = "publicKeyData"
        )
        
        val user = User(
            id = "user-123",
            nickname = request.nickname,
            passwordHash = "hashedPassword",
            publicKeyHash = "hashedPublicKey"
        )
        
        every { registerUserUseCase.execute(request) } returns user
        
        // When & Then
        mockMvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.message").value("회원가입이 완료되었습니다."))
            .andExpect(jsonPath("$.userId").exists())
        
        verify { registerUserUseCase.execute(request) }
    }
    
    @Test
    fun `should return bad request for invalid registration data`() {
        // Given
        val invalidRequest = RegisterRequest(
            nickname = "a", // Too short
            password = "short", // Too short
            publicKey = "" // Empty
        )
        
        // When & Then
        mockMvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("입력값 검증 실패"))
            .andExpect(jsonPath("$.details").exists())
        
        verify(exactly = 0) { registerUserUseCase.execute(any()) }
    }
    
    @Test
    fun `should handle registration business logic error`() {
        // Given
        val request = RegisterRequest(
            nickname = "existinguser",
            password = "password123",
            publicKey = "publicKeyData"
        ) 
        
        every { registerUserUseCase.execute(request) } throws IllegalArgumentException("이미 사용 중인 닉네임입니다")
        
        // When & Then
        mockMvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("이미 사용 중인 닉네임입니다"))
        
        verify { registerUserUseCase.execute(request) }
    }
    
    @Test
    fun `should login successfully`() {
        // Given
        val request = LoginRequest(
            nickname = "testuser",
            password = "password123"
        )
        
        val authResponse = AuthResponse(
            accessToken = "jwt-token",
            expiresIn = 86400000L,
            userHashedId = "hashed-user-id"
        )
        
        every { loginUserUseCase.execute(request) } returns authResponse
        
        // When & Then
        mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.accessToken").value("jwt-token"))
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andExpect(jsonPath("$.expiresIn").value(86400000L))
            .andExpect(jsonPath("$.userHashedId").value("hashed-user-id"))
        
        verify { loginUserUseCase.execute(request) }
    }
    
    @Test
    fun `should return bad request for invalid login credentials`() {
        // Given
        val request = LoginRequest(
            nickname = "testuser",
            password = "wrongPassword"
        )
        
        every { loginUserUseCase.execute(request) } throws IllegalArgumentException("잘못된 닉네임 또는 비밀번호입니다")
        
        // When & Then
        mockMvc.perform(
            post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("잘못된 닉네임 또는 비밀번호입니다"))
        
        verify { loginUserUseCase.execute(request) }
    }
    
    @Test
    fun `should generate nickname successfully`() {
        // Given
        val generatedNickname = "BraveEagle"
        every { nicknameGeneratorService.generateUniqueNickname() } returns generatedNickname
        
        // When & Then
        mockMvc.perform(get("/api/auth/generate-nickname"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.nickname").value(generatedNickname))
            .andExpect(jsonPath("$.isUnique").value(true))
        
        verify { nicknameGeneratorService.generateUniqueNickname() }
    }
    
    @Test
    fun `should return server error when nickname generation fails`() {
        // Given
        every { nicknameGeneratorService.generateUniqueNickname() } throws IllegalStateException("Word lists not loaded")
        
        // When & Then
        mockMvc.perform(get("/api/auth/generate-nickname"))
            .andExpect(status().isInternalServerError)
            .andExpect(jsonPath("$.error").value("닉네임 생성 서비스에 문제가 있습니다"))
        
        verify { nicknameGeneratorService.generateUniqueNickname() }
    }
    
    @Test
    fun `should return server error when unexpected error occurs during nickname generation`() {
        // Given
        every { nicknameGeneratorService.generateUniqueNickname() } throws RuntimeException("Unexpected error")
        
        // When & Then
        mockMvc.perform(get("/api/auth/generate-nickname"))
            .andExpect(status().isInternalServerError)
            .andExpect(jsonPath("$.error").value("서버 오류가 발생했습니다"))
        
        verify { nicknameGeneratorService.generateUniqueNickname() }
    }
    
    @Test
    fun `should get user by nickname successfully`() {
        // Given
        val nickname = "testuser"
        val userProfile = UserProfileResponse(
            userHashedId = "user-123",
            nickname = nickname,
            createdAt = "2023-01-01 12:00:00"
        )
        
        every { getUserByNicknameUseCase.execute(nickname) } returns userProfile
        
        // When & Then
        mockMvc.perform(get("/api/auth/user/$nickname"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.userHashedId").value("user-123"))
            .andExpect(jsonPath("$.nickname").value(nickname))
            .andExpect(jsonPath("$.createdAt").value("2023-01-01 12:00:00"))
        
        verify { getUserByNicknameUseCase.execute(nickname) }
    }
    
    @Test
    fun `should return bad request when user not found`() {
        // Given
        val nickname = "nonexistentuser"
        every { getUserByNicknameUseCase.execute(nickname) } throws IllegalArgumentException("해당 닉네임의 사용자를 찾을 수 없습니다")
        
        // When & Then
        mockMvc.perform(get("/api/auth/user/$nickname"))
            .andExpect(status().isBadRequest)
            .andExpect(jsonPath("$.error").value("해당 닉네임의 사용자를 찾을 수 없습니다"))
        
        verify { getUserByNicknameUseCase.execute(nickname) }
    }
    
    @Test
    fun `should return server error when unexpected error occurs during user retrieval`() {
        // Given
        val nickname = "testuser"
        every { getUserByNicknameUseCase.execute(nickname) } throws RuntimeException("Database error")
        
        // When & Then
        mockMvc.perform(get("/api/auth/user/$nickname"))
            .andExpect(status().isInternalServerError)
            .andExpect(jsonPath("$.error").value("서버 오류가 발생했습니다"))
        
        verify { getUserByNicknameUseCase.execute(nickname) }
    }
    
}