// ==============================================================================
// [Dearly 백엔드] src/app.js
// 역할: Express 애플리케이션 초기화, 미들웨어 등록, 라우터 연결
// ==============================================================================

const path = require('path');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const diaryRouter = require('./routes/diary');
const feedbackRouter = require('./routes/feedback');

const app = express();

// 1. CORS(교차 출처 리소스 공유) 설정
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(
  cors({
    origin: allowedOrigin === '*' ? true : allowedOrigin,
    methods: ['GET', 'POST'],
  })
);

// 1-1. 파비콘(favicon.ico) 브라우저 요청 자동 처리 (콘솔 에러 방지)
app.get('/favicon.ico', (req, res) => res.status(204).end());

// 2. 요청 본문(JSON) 크기 제한 (1MB 초과 시 413 방어)
app.use(express.json({ limit: '1mb' }));

// 3. API 요청 제한 (Rate Limiting) - 과도한 API 남용 방지
// 1분(60초) 동안 동일 IP에서 최대 20회의 요청만 허용
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: '요청이 너무 많아. 잠시 후 1분 뒤에 다시 시도해 줘.',
    },
  },
});

// API 경로에 Rate Limiter 적용
app.use('/api', apiLimiter);

// 4. API 라우터 연결
app.use('/api', diaryRouter);
app.use('/api', feedbackRouter);

// 5. 프런트엔드 정적 파일 서빙 (public 폴더)
app.use(express.static(path.join(__dirname, '..', 'public')));

// 6. JSON 요청 크기 초과 에러 핸들러 (413)
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: '전송된 데이터가 너무 커. 본문 크기를 줄여줘.',
      },
    });
  }
  next(err);
});

module.exports = app;

