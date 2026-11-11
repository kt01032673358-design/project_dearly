# 05. Supabase 데이터베이스 및 보안 정책

## 1. 저장 범위
Supabase에는 서비스 피드백만 저장한다. 영어 일기 원문과 AI 교정 결과는 기본 범위에서 저장하지 않는다.

## 2. 테이블: feedback
| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | 피드백 식별자 |
| message | text | not null | 피드백 내용 |
| created_at | timestamptz | not null, default now() | 서버 생성 시각 |

작성자 이름, 이메일, 학번, IP 주소를 별도 컬럼으로 수집하지 않는다.

## 3. SQL 초기화

```sql
create extension if not exists pgcrypto;

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null
    check (char_length(trim(message)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists feedback_created_at_desc_idx
  on public.feedback (created_at desc);

alter table public.feedback enable row level security;
```

## 4. 접근 정책 설계
권장 기본 구현은 서버 API가 `SUPABASE_SERVICE_ROLE_KEY`로 읽기·쓰기를 수행하고 브라우저는 Supabase에 직접 연결하지 않는 방식이다.
- Service Role 키는 서버에서만 사용한다.
- RLS는 활성화한다.
- 브라우저의 anon 역할에 직접 INSERT/SELECT 정책을 열지 않는다.
- 서버 API에서만 피드백을 등록·조회한다.
- 서비스 역할 키는 RLS를 우회하므로 서버 API의 입력 검증, 요청 제한, 출력 필터링이 반드시 필요하다.

향후 브라우저에서 Supabase를 직접 호출하도록 바꾸려면 별도 보안 검토 후 최소 권한 RLS 정책을 설계한다. 현재 요구사항에 없는 직접 접근 정책을 임의로 추가하지 않는다.

## 5. 서버 저장 예시 흐름
1. API에서 message가 문자열인지 확인한다.
2. trim 후 길이를 확인한다.
3. Supabase `feedback` 테이블에 message만 insert한다.
4. DB가 생성한 `id`, `created_at`을 반환한다.
5. 오류가 발생하면 서버 로그에는 안전한 오류 코드만 기록하고 사용자에게는 일반 오류를 반환한다.

## 6. 목록 조회 흐름
- `feedback` 테이블에서 `id`, `message`, `created_at`만 선택한다.
- `created_at` 내림차순으로 정렬한다.
- 모든 행을 반환한다.
- 목록이 커져 성능 문제가 발생하면 요구사항 변경으로 페이지네이션을 제안한다.

## 7. 데이터 운영 주의
- 공개 목록이므로 피드백 입력 전에 공개 사실을 알린다.
- 피드백 내용에 개인정보나 민감한 내용을 적지 않도록 안내한다.
- 현재 요구사항에는 사용자 삭제 기능이나 관리자 삭제 도구가 포함되어 있지 않다. 운영상 삭제·신고 기능이 필요해지면 별도 정책과 구현 승인을 받는다.
