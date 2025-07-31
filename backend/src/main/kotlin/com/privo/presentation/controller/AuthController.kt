package com.privo.presentation.controller

import com.privo.application.dto.*
import com.privo.application.service.NicknameGeneratorService
import com.privo.application.usecase.GetUserByNicknameUseCase
import com.privo.application.usecase.LoginUserUseCase
import com.privo.application.usecase.RegisterUserUseCase
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(
    private val registerUserUseCase: RegisterUserUseCase,
    private val loginUserUseCase: LoginUserUseCase,
    private val nicknameGeneratorService: NicknameGeneratorService,
    private val getUserByNicknameUseCase: GetUserByNicknameUseCase
) {
    
    companion object {
        private val logger = LoggerFactory.getLogger(AuthController::class.java)
    }
    
    @PostMapping("/register")
    fun register(@Valid @RequestBody request: RegisterRequest): ResponseEntity<Map<String, String>> {
        return try {
            val user = registerUserUseCase.execute(request)
            logger.info("User registration successful for nickname: {}", request.nickname)
            
            ResponseEntity.ok(mapOf(
                "message" to "회원가입이 완료되었습니다.",
                "userId" to user.id
            ))
        } catch (e: IllegalArgumentException) {
            logger.warn("Registration failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "회원가입에 실패했습니다")))
        } catch (e: Exception) {
            logger.error("Registration error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @PostMapping("/login")
    fun login(@Valid @RequestBody request: LoginRequest): ResponseEntity<Any> {
        return try {
            val authResponse = loginUserUseCase.execute(request)
            logger.info("User login successful for nickname: {}", request.nickname)
            
            ResponseEntity.ok(authResponse)
        } catch (e: IllegalArgumentException) {
            logger.warn("Login failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "로그인에 실패했습니다")))
        } catch (e: Exception) {
            logger.error("Login error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    
    @GetMapping("/generate-nickname")
    fun generateNickname(): ResponseEntity<Any> {
        return try {
            val nickname = nicknameGeneratorService.generateUniqueNickname()
            logger.info("Generated unique nickname: {}", nickname)
            
            ResponseEntity.ok(GenerateNicknameResponse(
                nickname = nickname,
                isUnique = true
            ))
        } catch (e: IllegalStateException) {
            logger.error("Nickname generation failed due to service error: {}", e.message)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(mapOf("error" to "닉네임 생성 서비스에 문제가 있습니다"))
        } catch (e: Exception) {
            logger.error("Nickname generation error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @GetMapping("/user/{nickname}")
    fun getUserByNickname(@PathVariable nickname: String): ResponseEntity<Any> {
        return try {
            val userProfile = getUserByNicknameUseCase.execute(nickname)
            logger.info("User profile retrieved successfully for nickname: {}", nickname)
            
            ResponseEntity.ok(userProfile)
        } catch (e: IllegalArgumentException) {
            logger.warn("User profile retrieval failed: {}", e.message)
            ResponseEntity.badRequest().body(mapOf("error" to (e.message ?: "사용자를 찾을 수 없습니다")))
        } catch (e: Exception) {
            logger.error("User profile retrieval error", e)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(mapOf("error" to "서버 오류가 발생했습니다"))
        }
    }
    
    @GetMapping("/me")
    fun getCurrentUser(): ResponseEntity<Map<String, String>> {
        // TODO: Implement get current user profile
        return ResponseEntity.ok(mapOf("message" to "User profile endpoint - to be implemented"))
    }
}