-- ==============================================================================
-- [Dearly 프로젝트] 001_create_feedback_table.sql
-- 목적: 사용자 피드백을 저장하기 위한 Supabase 테이블 생성 및 보안(RLS) 설정
-- 실행 방법: Supabase 대시보드(SQL Editor)에 이 파일의 내용을 복사하여 붙여넣고 Run을 실행하세요.
-- ==============================================================================

-- 1. UUID(고유 식별자) 생성을 위한 pgcrypto 확장 기능 활성화 (이미 있는 경우 건너뜀)
create extension if not exists pgcrypto;

-- 2. feedback 테이블 생성
-- - id: 각 피드백의 고유한 식별자 (자동으로 랜덤 UUID 생성)
-- - message: 피드백 내용 (공백 제외 1자 이상 1000자 이하 검증)
-- - created_at: 피드백이 등록된 시각 (기본값: 현재 시각)
-- * 주의: 개인정보 보호를 위해 이름, 이메일, 학번, IP 등은 일절 저장하지 않습니다.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  message text not null
    check (char_length(trim(message)) between 1 and 1000),
  created_at timestamptz not null default now()
);

-- 3. 최신순 정렬 조회를 위한 인덱스 생성
-- 피드백 목록을 '최신 작성 순(created_at 내림차순)'으로 빠르게 불러오기 위한 색인(인덱스)입니다.
create index if not exists feedback_created_at_desc_idx
  on public.feedback (created_at desc);

-- 4. 행 수준 보안(Row Level Security, RLS) 활성화
-- 기본적으로 브라우저(익명 사용자)가 데이터베이스에 직접 접근하지 못하도록 보호합니다.
-- 서버(Express)는 'service_role' 비밀 키를 사용하여 안전하게 데이터를 처리합니다.
alter table public.feedback enable row level security;

