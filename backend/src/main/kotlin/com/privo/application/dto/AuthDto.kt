package com.privo.application.dto

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

data class RegisterRequest(
    @field:NotBlank(message = "닉네임은 필수입니다")
    @field:Size(min = 2, max = 50, message = "닉네임은 2-50자 사이여야 합니다")
    val nickname: String,
    
    @field:NotBlank(message = "비밀번호는 필수입니다")
    @field:Size(min = 8, message = "비밀번호는 최소 8자 이상이어야 합니다")
    val password: String,
    
    @field:NotBlank(message = "공개키는 필수입니다")
    val publicKey: String
)

data class LoginRequest(
    @field:NotBlank(message = "닉네임은 필수입니다")
    val nickname: String,
    
    @field:NotBlank(message = "비밀번호는 필수입니다")
    val password: String
)


data class AuthResponse(
    val accessToken: String,
    val tokenType: String = "Bearer",
    val expiresIn: Long,
    val userId: String
)

data class UserProfileResponse(
    val userId: String,
    val nickname: String,
    val createdAt: String
)

data class GenerateNicknameResponse(
    val nickname: String,
    val isUnique: Boolean
)