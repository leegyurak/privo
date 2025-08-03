package com.privo.application.dto

import jakarta.validation.constraints.NotBlank

data class BlockUserRequest(
    @field:NotBlank(message = "차단할 사용자 ID는 필수입니다")
    val targetUserId: String
)

data class UnblockUserRequest(
    @field:NotBlank(message = "차단 해제할 사용자 ID는 필수입니다")
    val targetUserId: String
)