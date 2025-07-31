# Privo - E2E 암호화 채팅 애플리케이션

## 개요
Privo는 End-to-End 암호화를 지원하는 실시간 채팅 애플리케이션입니다. 모든 메시지는 AES-256 암호화로 보호되며, 서버에서는 복호화할 수 없도록 설계되었습니다.

## 주요 기능
- **E2E 암호화**: AES-256 GCM 모드 사용
- **이메일 인증**: 복호화 불가능한 해시 기반 인증
- **실시간 메시징**: Redis 기반 이벤트 스트림
- **Clean Architecture**: 계층형 아키텍처 설계
- **Spring Boot + Kotlin**: 현대적인 백엔드 구성

## 기술 스택
- **언어**: Kotlin 1.9.20
- **프레임워크**: Spring Boot 3.2.0
- **데이터베이스**: H2 (개발), PostgreSQL (운영)
- **캐시/메시징**: Redis
- **보안**: Spring Security, JWT
- **ORM**: JPA/Hibernate

## 프로젝트 구조
```
src/main/kotlin/com/privo/
├── domain/           # 도메인 레이어
│   ├── model/        # 엔티티
│   └── repository/   # 리포지토리 인터페이스
├── application/      # 애플리케이션 레이어
│   ├── dto/          # 데이터 전송 객체
│   └── usecase/      # 유스케이스
├── infrastructure/   # 인프라스트럭처 레이어
│   ├── config/       # 설정
│   ├── messaging/    # Redis 이벤트
│   ├── persistence/  # JPA 구현
│   └── security/     # 보안 유틸리티
└── presentation/     # 프레젠테이션 레이어
    ├── controller/   # REST API
    └── websocket/    # WebSocket 핸들러
```

## 보안 특징
1. **메시지 암호화**: 클라이언트에서 AES-256 GCM으로 암호화
2. **해시된 사용자 ID**: 개인정보 보호를 위한 해시 처리
3. **토큰 기반 인증**: JWT를 사용한 무상태 인증
4. **서버에서 복호화 불가**: 암호화 키는 클라이언트에서만 관리

## API 엔드포인트

### 인증 API
- `POST /api/auth/register` - 회원가입
- `POST /api/auth/login` - 로그인
- `POST /api/auth/verify-email` - 이메일 인증
- `GET /api/auth/me` - 현재 사용자 정보

### 채팅 API
- `POST /api/chat/rooms` - 채팅방 생성
- `GET /api/chat/rooms` - 채팅방 목록
- `POST /api/chat/rooms/{id}/messages` - 메시지 전송
- `GET /api/chat/rooms/{id}/messages` - 메시지 조회

### WebSocket
- `ws://localhost:8080/ws/chat?token={jwt_token}` - 실시간 채팅

## 실행 방법

### 빠른 시작
```bash
# 1. 환경 설정 파일 복사
cp .env.example .env

# 2. 환경 변수 편집 (필요한 경우)
vi .env

# 3. 개발 환경 설정 (데이터베이스, Redis, 관리 도구 포함)
make dev-setup

# 4. 애플리케이션 실행
make run
```

### 데이터베이스 마이그레이션
```bash
# 마이그레이션 실행
make db-migrate

# 마이그레이션 상태 확인
make db-info

# 마이그레이션 검증
make db-validate
```

### 개발 환경 설정

#### Docker를 사용한 인프라 구성
```bash
# 기본 서비스 (MySQL, Redis)
make docker-up

# 개발 도구 포함 (Adminer, Redis Commander)
make docker-up-dev

# 서비스 중지
make docker-down
```

#### 수동 실행
```bash
# 빌드
make build

# 테스트 실행
make test

# 애플리케이션 실행 (개발 모드)
make run

# 애플리케이션 실행 (운영 모드)
make run-prod
```

### 테스트 실행
```bash
# 모든 테스트
make test

# 단위 테스트만
make test-unit

# 통합 테스트만
make test-integration

# 테스트 데이터베이스 사용한 전체 테스트
make test-full
```

### 환경 변수
```bash
# JWT 설정
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=86400000

# 데이터베이스 (MySQL)
DATABASE_URL=jdbc:mysql://localhost:3306/privo
DATABASE_USERNAME=privo
DATABASE_PASSWORD=privo123

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 이메일 설정
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

### 개발 도구 접근
- **Adminer (데이터베이스 관리)**: http://localhost:8081
- **Redis Commander (Redis 관리)**: http://localhost:8082
- **애플리케이션 헬스체크**: http://localhost:8080/actuator/health

## 데이터베이스 스키마

### users 테이블
- 사용자 정보 (이메일, 패스워드 해시, 공개키 해시)
- 이메일 인증 정보

### chat_rooms 테이블
- 채팅방 정보

### chat_room_members 테이블
- 채팅방 멤버십 정보

### chat_messages 테이블
- 암호화된 메시지 저장
- 복호화 불가능한 형태로 저장

## 개발 가이드라인

### 보안 원칙
1. 서버에서는 메시지 내용을 절대 복호화하지 않음
2. 사용자 식별은 해시된 ID만 사용
3. 민감한 정보는 로그에 남기지 않음
4. 모든 API는 인증된 사용자만 접근 가능

### 코드 스타일
- Kotlin 표준 스타일 가이드 준수
- Clean Architecture 원칙 적용
- SOLID 원칙 준수
- 단위 테스트 작성 권장

## 시작하기

### 빠른 실행
```bash
# 1. 환경 파일 설정
cp .env.example .env

# 2. Gradle Wrapper 확인 (이미 생성됨)
./gradlew --version

# 3. 단위 테스트 실행
./gradlew test --tests "*EncryptionUtil*" --tests "*PasswordUtil*" --tests "*User*" --tests "*ChatMessage*"

# 4. 빌드
./gradlew build -x test

# 5. 개발 환경 구성 (데이터베이스 마이그레이션 포함)
make dev-setup

# 6. 애플리케이션 실행
make run
```

### 데이터베이스 마이그레이션 관리
```bash
# 마이그레이션 실행
make db-migrate

# 마이그레이션 상태 확인  
make db-info

# 마이그레이션 검증
make db-validate
```

이제 Flyway 마이그레이션과 함께 완전한 E2E 암호화 채팅 시스템을 사용할 수 있습니다! 🚀

## 라이선스
MIT License