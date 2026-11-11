# Dearly (디어리) ✨
> **학생들을 위한 따뜻한 AI 영어 일기 문법 교정, 자연스러운 해석 및 유사 표현(뉘앙스) 학습 서비스**

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=flat&logo=vercel)](https://vercel.com)
[![Node.js Version](https://img.shields.io/badge/Node.js-18+-green?style=flat&logo=node.js)](https://nodejs.org/)
[![Database](https://img.shields.io/badge/Database-Supabase-emerald?style=flat&logo=supabase)](https://supabase.com/)
[![OpenAI](https://img.shields.io/badge/AI-OpenAI%20GPT--4o--mini-blue?style=flat&logo=openai)](https://platform.openai.com/)

---

## 📖 1. 프로젝트 개요 (Overview)

**Dearly**는 영어 일기나 문장 쓰기를 연습하는 학생들이 자신의 글을 부담 없이 점검하고, 작은 성취감과 학습 의욕을 느낄 수 있도록 돕는 웹 서비스입니다.

- **로그인 없는 편안한 사용**: 복잡한 회원가입이나 계정 생성 없이 누구나 바로 일기나 문장을 입력하고 맞춤형 피드백을 받을 수 있습니다.
- **자연스러운 한국어 해석 (Original & Meaning)**: 직역이 아닌 일상 회화체로 원문의 자연스러운 우리말 뜻을 제공합니다.
- **다정한 맞춤형 문법 교정 (Corrected Text)**: 문법과 철자 오류를 매끄럽게 바로잡고, 학생 눈높이에 맞춘 간결한 한국어 수정 설명을 제공합니다.
- **뉘앙스별 유사 표현 학습 (Similar Expressions & Nuance)**: 원문과 의미가 통하는 2~3개의 자연스러운 영어 표현을 한국어 해석과 함께 짝지어 보여주고, 원문과의 미묘한 뉘앙스 차이(강조, 어조, 격식 등)를 친절히 설명합니다.
- **자신감을 키워주는 따뜻한 칭찬 (A Little Cheer)**: 점수나 등급을 매기지 않고, 학생의 노력과 생각을 존중하는 영어 칭찬 한마디를 선물합니다.
- **열린 피드백 공간**: 학생들이 자유롭게 서비스 이용 후기를 남기고 서로의 응원을 나누는 익명 피드백 게시판이 함께 운영됩니다.

---

## 💡 2. 주요 기능 및 결과 화면 구성

사용자가 영어 문장(예: `When I was young, I was tired too.`)을 입력하면 다음과 같은 체계적인 분석 카드가 제공됩니다:

```text
1. Original & Meaning (원문 및 자연스러운 해석)
   - EN: When I was young, I was tired too.
   - KO: 어렸을 때, 나도 피곤했어.

2. Corrected Text (교정된 문장)
   - When I was young, I was tired as well.

3. What changed (수정 이유 설명)
   - "tired too" → "tired as well" : 문어체에서 더욱 자연스러운 연결 표현으로 다듬었어요.

4. Similar Expressions & Nuance (유사 표현 및 뉘앙스)
   - [1] When I was a child, I often felt tired.
         (어렸을 때, 나는 자주 피곤함을 느꼈어.)
         💡 뉘앙스: 'often'이 추가되어 반복적으로 피곤했던 빈도를 강조해요.
   - [2] In my youth, I experienced fatigue as well.
         (젊었을 때, 나도 피로를 느꼈어.)
         💡 뉘앙스: 격식 있는 어휘(fatigue)를 사용하여 차분한 톤으로 표현해요.

5. A Little Cheer for You (따뜻한 영어 칭찬)
   - "Your reflection on your childhood is heartfelt and relatable!"
```

---

## 🛠️ 3. 기술 스택 (Tech Stack)

| 구분 | 사용 기술 | 설명 |
|---|---|---|
| **Front-End** | HTML5, CSS3, Vanilla JavaScript | 별도의 복잡한 빌드 도구 없이 가볍고 빠른 반응형 웹 구현 (XSS 방지 textContent 렌더링) |
| **Back-End** | Node.js, Express | RESTful API 서버, 요청 크기 제한(Rate Limiting), Vercel Serverless 호환 |
| **AI Engine** | OpenAI API (`gpt-4o-mini`) | 프롬프트 인젝션 방어, 구조화된 JSON 응답 및 스키마 검증 |
| **Database** | Supabase (PostgreSQL) | 피드백 저장 및 최신순 조회, 행 수준 보안(RLS) 적용 |
| **Deployment** | Vercel | 글로벌 엣지 네트워크 기반의 무중단 서버리스 배포 |

---

## 🔒 4. 보안 및 개인정보 보호 원칙 (Security & Privacy)

1. **일기/문장 원문 DB 미저장 (Zero-Storage)**:
   - 학생이 작성한 영어 문장 및 일기 원문은 AI 분석 처리용으로만 1회성 사용되며, 데이터베이스에 저장되거나 서버 로그에 남지 않고 즉시 메모리에서 폐기됩니다.
2. **개인정보 수집 배제**:
   - 학생의 이름, 이메일, 학번, IP 주소 등 민감한 개인정보를 요구하거나 저장하지 않습니다.
3. **비밀 키 은닉**:
   - `OPENAI_API_KEY`와 `SUPABASE_SERVICE_ROLE_KEY`는 백엔드 서버 환경 변수로만 안전하게 관리되며 브라우저 클라이언트에 노출되지 않습니다.
4. **XSS(교차 사이트 스크립팅) 원천 차단**:
   - 피드백 출력 및 교정 결과 렌더링 시 HTML을 직접 삽입하지 않고 브라우저의 안전한 `textContent` 렌더링을 적용합니다.

---

## 📂 5. 프로젝트 폴더 구조 (Project Structure)

```text
dearly/
├─ api/                          # Vercel Serverless Function 핸들러
│  ├─ correct-diary.js
│  ├─ feedback.js
│  └─ feedback-list.js
├─ public/                       # 프런트엔드 정적 웹 리소스
│  ├─ index.html                 # 단일 페이지 웹 애플리케이션
│  ├─ css/
│  │  └─ styles.css              # 아이보리 & 라벤더 톤 반응형 스타일
│  └─ js/
│     └─ app.js                  # 비동기 API 통신 및 UI 상태 제어
├─ src/                          # 백엔드 핵심 비즈니스 로직
│  ├─ app.js                     # Express 애플리케이션 및 미들웨어
│  ├─ routes/                    # API 라우터 (일기/문장 교정 및 피드백)
│  │  ├─ diary.js
│  │  └─ feedback.js
│  └─ lib/                       # 외부 서비스 연동 모듈
│     ├─ openai.js               # OpenAI 클라이언트 및 스키마 검증
│     └─ supabase.js             # Supabase 서버 클라이언트
├─ supabase/
│  └─ migrations/
│     └─ 001_create_feedback_table.sql # DB 테이블 생성 및 RLS 쿼리
├─ server.js                     # 로컬 개발 서버 진입점
├─ vercel.json                   # Vercel 배포 설정 파일
├─ .env.example                  # 환경 변수 템플릿
├─ .gitignore                    # 민감 정보 및 모듈 제외 설정
├─ README.md                     # 프로젝트 전체 문서
└─ package.json                  # 프로젝트 종속성 및 실행 스크립트
```

---

## 🚀 6. 로컬 실행 방법 (Getting Started)

### 1) 저장소 클론 및 패키지 설치
```bash
git clone https://github.com/kt01032673358-design/project_dearly.git
cd project_dearly
npm install
```

### 2) 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 아래 설정값을 입력합니다:

```dotenv
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
PORT=3000
ALLOWED_ORIGIN=*
```

### 3) Supabase 데이터베이스 마이그레이션
Supabase 대시보드의 **SQL Editor**에서 [`supabase/migrations/001_create_feedback_table.sql`](supabase/migrations/001_create_feedback_table.sql) 파일의 내용을 실행하여 `feedback` 테이블을 생성합니다.

### 4) 로컬 서버 실행
```bash
node server.js
```
브라우저에서 `http://localhost:3000`으로 접속하여 서비스를 이용합니다.

---

## 🌐 7. Vercel 배포 안내 (Deployment)

1. [Vercel](https://vercel.com)에 로그인하고 `project_dearly` 저장소를 **Import**합니다.
2. **Environment Variables** 항목에 아래 4개 환경 변수를 등록합니다:
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. **Deploy** 버튼을 누르면 배포가 완료되며 고유 웹사이트 주소가 발급됩니다.

---

## 📜 8. 라이선스 및 안내
- 본 프로젝트의 AI 분석 및 교정 결과는 학생들의 영어 학습을 돕기 위한 참고 자료이며, 완벽한 정답을 보장하지 않습니다.
- License: ISC
