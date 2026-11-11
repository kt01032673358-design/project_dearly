# 01. 프로젝트 생성 및 실행 지침

## 1. 권장 폴더 구조

```text
dearly/
├─ api/
│  ├─ correct-diary.js
│  ├─ feedback.js
│  └─ feedback-list.js
├─ public/
│  ├─ index.html
│  ├─ css/
│  │  └─ styles.css
│  └─ js/
│     └─ app.js
├─ src/
│  ├─ app.js
│  ├─ routes/
│  │  ├─ diary.js
│  │  └─ feedback.js
│  └─ lib/
│     ├─ openai.js
│     └─ supabase.js
├─ supabase/
│  └─ schema.sql
├─ docs/
├─ AGENTS.md
├─ PRD.md
├─ package.json
├─ vercel.json
└─ .env.example
```

구조는 구현 편의를 위한 권장안이다. Vercel에서 `/api` 디렉터리를 Serverless Function으로 직접 사용할 경우 `src/app.js`와 Express 서버를 중복 구성하지 않는다. 에이전트는 한 가지 방식만 선택하고 API 명세를 유지한다. 권장 기본 방식은 `api/`의 Vercel Function이며, Express는 로컬 개발용으로만 사용하거나 Vercel 호환 핸들러로 연결한다.

## 2. 시작 순서
1. Node.js LTS가 설치되어 있는지 확인한다.
2. 프로젝트 루트에서 `npm init -y`로 프로젝트를 초기화한다.
3. 서버 실행에 필요한 `express`, `@supabase/supabase-js`, `openai`, `cors`, `express-rate-limit`, `dotenv` 등을 설치한다. 실제 배포 방식에 맞지 않는 패키지는 추가하지 않는다.
4. `public/`에 정적 화면을 만들고 `/api`에 서버 함수를 만든다.
5. `.env.example`을 복사해 로컬 `.env`를 만들고 실제 키를 입력한다.
6. Supabase SQL Editor에서 `supabase/schema.sql`을 실행한다.
7. 로컬 서버에서 API와 화면을 확인한다.
8. Vercel에 저장소를 연결하고 환경 변수를 등록한다.

## 3. 환경 변수

`.env.example`에 변수 이름만 기록하고 실제 값은 커밋하지 않는다.

```dotenv
OPENAI_API_KEY=
OPENAI_MODEL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ALLOWED_ORIGIN=
```

- `OPENAI_MODEL`: 프로젝트에서 사용 가능한 모델명을 명시적으로 설정한다. 모델명을 코드에 여러 군데 하드코딩하지 않는다.
- `SUPABASE_SERVICE_ROLE_KEY`: 서버 전용. 브라우저로 전달하지 않는다.
- `ALLOWED_ORIGIN`: 필요한 경우 운영 도메인만 허용한다.
- 환경 변수 누락 시 서버 시작 또는 API 요청 단계에서 명확한 서버 로그를 남기되 키 값은 절대 출력하지 않는다.

## 4. 실행 스크립트 예시

```json
{
  "scripts": {
    "dev": "node server.js",
    "start": "node server.js"
  }
}
```

실제 진입 파일에 맞춰 스크립트를 조정한다. Vercel 배포용 정적 파일은 `public/`을 기준으로 설정하고, 존재하지 않는 `build` 스크립트를 Vercel Build Command로 지정하지 않는다.

## 5. 로컬 확인
- 정적 화면이 정상적으로 열리는지 확인한다.
- 개발자 도구 Network 탭에서 API 요청 주소와 응답을 확인한다.
- 서버 로그에 비밀 키나 일기 원문이 출력되지 않는지 확인한다.
- Supabase에 테스트 피드백이 저장되고 목록 조회에 나타나는지 확인한다.

## 6. Git 관리
`.gitignore`에 `node_modules/`, `.env`, `.vercel/`, 로그 파일을 추가한다. `.env.example`은 커밋 가능하지만 실제 키를 넣지 않는다.
