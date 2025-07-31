# Privo Backend - 개발 가이드

## 목차
- [개발 환경 설정](#개발-환경-설정)
- [테스트 가이드](#테스트-가이드)
- [Docker 환경](#docker-환경)
- [Makefile 명령어](#makefile-명령어)
- [코드 스타일](#코드-스타일)
- [디버깅](#디버깅)

## 개발 환경 설정

### 사전 요구사항
- JDK 17+
- Docker & Docker Compose
- Make (선택사항, 편의를 위해)

### 초기 설정
```bash
# 1. 저장소 클론
git clone <repository-url>
cd privo/backend

# 2. 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 필요한 값들을 설정

# 3. 개발 환경 구성
make dev-setup

# 4. 애플리케이션 실행
make run
```

## 테스트 가이드

### 테스트 구조
```
src/test/kotlin/
├── com/privo/
│   ├── domain/model/           # 도메인 모델 단위 테스트
│   ├── infrastructure/         # 인프라 레이어 단위 테스트
│   ├── application/usecase/    # 유스케이스 통합 테스트
│   └── presentation/controller/ # API 컨트롤러 테스트
└── resources/
    └── application-test.yml    # 테스트 설정
```

### 테스트 실행
```bash
# 모든 테스트
make test

# 단위 테스트만 (빠른 실행)
make test-unit

# 통합 테스트만
make test-integration

# 테스트 DB를 사용한 전체 테스트
make test-full
```

### 테스트 작성 가이드

#### 단위 테스트 (Unit Tests)
```kotlin
// 도메인 모델 테스트 예시
class UserTest {
    @Test
    fun `should verify email successfully`() {
        // Given
        val user = User(...)
        
        // When
        val verifiedUser = user.verifyEmail()
        
        // Then
        assertTrue(verifiedUser.isEmailVerified)
    }
}
```

#### 통합 테스트 (Integration Tests)
```kotlin
// UseCase 테스트 예시
@ExtendWith(MockKExtension::class)
class RegisterUserUseCaseTest {
    @MockK
    private lateinit var userRepository: UserRepository
    
    @Test
    fun `should register user successfully`() {
        // Given, When, Then
        // 실제 비즈니스 로직 테스트
    }
}
```

#### API 테스트 (Controller Tests)
```kotlin
@WebMvcTest(AuthController::class)
@ActiveProfiles("test")
class AuthControllerTest {
    @Autowired
    private lateinit var mockMvc: MockMvc
    
    @Test
    fun `should register user successfully`() {
        mockMvc.perform(
            post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(...)
        )
        .andExpect(status().isOk)
    }
}
```

## Docker 환경

### 서비스 구성
- **MySQL**: 메인 데이터베이스 (포트 3306)
- **MySQL Test**: 테스트용 데이터베이스 (포트 3307)
- **Redis**: 메시징 및 캐싱 (포트 6379)
- **Redis Test**: 테스트용 Redis (포트 6380)
- **Adminer**: 데이터베이스 관리 도구 (포트 8081)
- **Redis Commander**: Redis 관리 도구 (포트 8082)

### Docker 명령어
```bash
# 개발에 필요한 모든 서비스 시작
make docker-up-dev

# 기본 서비스만 시작 (MySQL, Redis)
make docker-up

# 테스트용 서비스 시작
make docker-test

# 모든 서비스 중지
make docker-down

# 완전 정리 (볼륨 포함)
make docker-clean
```

### 개발 도구 접근
- **Adminer**: http://localhost:8081
  - 시스템: MySQL
  - 서버: mysql
  - 사용자명: privo
  - 비밀번호: privo123
  - 데이터베이스: privo

- **Redis Commander**: http://localhost:8082

## Makefile 명령어

### 빌드 & 실행
```bash
make build          # 애플리케이션 빌드
make run            # 개발 모드로 실행
make run-prod       # 프로덕션 모드로 실행
make clean          # 빌드 아티팩트 정리
```

### 테스트
```bash
make test           # 모든 테스트 실행
make test-unit      # 단위 테스트만
make test-integration # 통합 테스트만
make test-full      # 테스트 DB 사용한 전체 테스트
```

### 개발 환경
```bash
make setup          # 초기 프로젝트 설정
make dev-setup      # 개발 환경 전체 설정
make dev            # 빠른 개발 사이클
make health-check   # 애플리케이션 상태 확인
```

### 데이터베이스
```bash
make db-migrate     # 데이터베이스 마이그레이션
make db-reset       # 데이터베이스 리셋
```

## 코드 스타일

### Kotlin 스타일 가이드
- [Kotlin 공식 스타일 가이드](https://kotlinlang.org/docs/coding-conventions.html) 준수
- 들여쓰기: 4칸 공백
- 최대 행 길이: 120자
- 파일명: PascalCase
- 함수명: camelCase
- 상수명: UPPER_SNAKE_CASE

### 아키텍처 규칙
- Clean Architecture 레이어 준수
- 의존성 역전 원칙 적용
- 도메인 로직은 infrastructure에 의존하지 않음
- 각 레이어별 책임 분리

### 테스트 명명 규칙
```kotlin
// Good
@Test
fun `should register user successfully when valid data provided`()

@Test  
fun `should throw exception when email already exists`()

// Avoid
@Test
fun testRegisterUser()

@Test
fun registerUserTest()
```

## 디버깅

### 로그 레벨 설정
```yaml
# application-dev.yml
logging:
  level:
    com.privo: DEBUG
    org.springframework.security: DEBUG
    org.springframework.web: DEBUG
```

### 데이터베이스 쿼리 로그
```yaml
spring:
  jpa:
    show-sql: true
    properties:
      hibernate:
        format_sql: true
```

### 개발 중 유용한 엔드포인트
- 헬스체크: `GET /actuator/health`
- 애플리케이션 정보: `GET /actuator/info`
- 메트릭스: `GET /actuator/metrics`

### 일반적인 문제 해결

#### 데이터베이스 연결 실패
```bash
# MySQL 컨테이너 상태 확인
docker-compose ps mysql

# MySQL 로그 확인
docker-compose logs mysql

# 데이터베이스 재시작
make db-reset
```

#### Redis 연결 실패
```bash
# Redis 컨테이너 상태 확인
docker-compose ps redis

# Redis 연결 테스트
docker-compose exec redis redis-cli ping
```

#### 테스트 실패
```bash
# 테스트 로그 자세히 보기
./gradlew test --info

# 특정 테스트만 실행
./gradlew test --tests "UserTest"

# 테스트 DB 초기화
make docker-test
```

## 성능 모니터링

### 메트릭스 확인
```bash
# 애플리케이션 메트릭스
curl http://localhost:8080/actuator/metrics

# JVM 메모리 사용량
curl http://localhost:8080/actuator/metrics/jvm.memory.used

# HTTP 요청 통계
curl http://localhost:8080/actuator/metrics/http.server.requests
```

### 프로파일링
- Spring Boot Actuator를 통한 기본 메트릭스
- 추후 Micrometer + Prometheus 통합 예정

## 배포

### JAR 빌드
```bash
make prod-build
# 결과: build/libs/privo-backend-*.jar
```

### 환경별 설정
- `dev`: 개발 환경 (H2 DB)
- `prod`: 운영 환경 (MySQL)
- `test`: 테스트 환경 (H2 DB)

### CI/CD
```bash
# CI 파이프라인에서 사용
make ci  # clean + build + test
```