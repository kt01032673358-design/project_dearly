# 04. API 명세

모든 API는 HTTPS를 사용하고 JSON을 주고받는다. 서버 내부 구현 방식이 달라도 아래 계약은 유지한다.

## 1. 공통 규칙
- `Content-Type: application/json`
- 요청 본문 크기 제한을 설정한다.
- 입력 검증은 프런트엔드와 서버 양쪽에서 수행한다. 서버 검증이 최종 기준이다.
- 오류 응답은 일관된 구조를 사용한다.
- 비밀 키, 스택 트레이스, 공급자 원문 오류를 클라이언트에 보내지 않는다.

오류 형식:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력 내용을 확인해 줘."
  }
}
```

## 2. POST /api/correct-diary
영어 일기를 AI로 교정한다.

### 요청
```json
{
  "diary": "I go to school yesterday and meet my friend."
}
```

### 검증
- `diary`는 문자열이어야 한다.
- trim 후 비어 있으면 400
- 최대 5,000자
- 과도한 요청 크기는 413
- 사용자 입력은 프롬프트 지시가 아니라 교정할 원문 데이터로 취급한다.

### 성공 응답 예시
```json
{
  "data": {
    "correctedText": "I went to school yesterday and met my friend.",
    "corrections": [
      {
        "original": "go",
        "corrected": "went",
        "reason": "yesterday가 과거를 나타내므로 동사를 과거형으로 바꿨어."
      },
      {
        "original": "meet",
        "corrected": "met",
        "reason": "앞 문장과 같은 과거 시제로 맞췄어."
      }
    ],
    "compliment": "You did a great job sharing what happened in your day!"
  }
}
```

### 서버 AI 출력 계약
- `correctedText`: 문자열, 필수
- `corrections`: 배열, 최대 5개. 각 항목에 `original`, `corrected`, `reason` 문자열
- `compliment`: 영어 한 문장 문자열, 필수
- 결과 JSON을 파싱하고 필드·자료형을 검증한다.
- 형식이 잘못되면 안전한 오류를 반환하고, 원시 AI 응답을 그대로 노출하지 않는다.

### 상태 코드
- 200 성공
- 400 입력값 오류
- 413 요청 본문 크기 초과
- 429 요청 제한
- 502 AI 공급자 응답 오류
- 500 서버 설정 또는 내부 오류

## 3. POST /api/feedback
로그인 없이 피드백을 저장한다.

### 요청
```json
{
  "message": "교정 이유가 조금 더 자세하면 좋겠어요."
}
```

### 검증
- `message`는 문자열
- trim 후 1~1,000자
- 작성자 식별 정보는 받지 않는다.
- 서버가 생성 시각을 기록한다.
- 저장 전후로 입력값을 안전하게 처리한다.

### 성공 응답 예시
```json
{
  "data": {
    "id": "uuid",
    "message": "교정 이유가 조금 더 자세하면 좋겠어요.",
    "created_at": "2026-11-11T03:00:00.000Z"
  }
}
```

### 상태 코드
- 201 저장 성공
- 400 입력값 오류
- 413 요청 본문 크기 초과
- 429 요청 제한
- 500 저장 실패 또는 서버 오류

## 4. GET /api/feedback
전체 피드백을 최신순으로 조회한다.

### 성공 응답 예시
```json
{
  "data": [
    {
      "id": "uuid",
      "message": "교정 이유가 조금 더 자세하면 좋겠어요.",
      "created_at": "2026-11-11T03:00:00.000Z"
    }
  ]
}
```

### 규칙
- `created_at DESC` 정렬
- 모든 항목 반환
- `id`, `message`, `created_at`만 반환
- 내부 관리 필드나 비밀 데이터는 반환하지 않는다.
- 데이터가 없으면 빈 배열 반환

### 상태 코드
- 200 조회 성공
- 500 조회 실패

## 5. CORS 및 요청 제한
- 프런트엔드와 API가 같은 Vercel 도메인에서 서비스되면 불필요한 광범위 CORS를 열지 않는다.
- 별도 도메인 사용 시 운영 도메인만 허용한다.
- 교정·피드백 API에 IP 기반 또는 배포 환경에 적합한 요청 제한을 둔다.
- 서버리스 환경에서는 메모리 기반 제한이 인스턴스 간 공유되지 않을 수 있다. 실제 배포 환경에서 동작하는 제한 방식을 선택하고 한계를 문서화한다.
