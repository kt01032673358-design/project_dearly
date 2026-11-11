// ==============================================================================
// [Dearly 백엔드] src/routes/diary.js
// 역할: 영어 일기 교정 API 라우터 (POST /api/correct-diary)
// ==============================================================================

const express = require('express');
const router = express.Router();
const { correctDiaryWithAI } = require('../lib/openai');

/**
 * POST /api/correct-diary
 * 학생이 입력한 영어 일기를 검증하고 AI 교정 결과를 반환합니다.
 */
router.post('/correct-diary', async (req, res) => {
  try {
    const { diary } = req.body;

    // 1. 입력값 유형 검증 (문자열 여부)
    if (typeof diary !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '영어 일기를 텍스트 형식으로 입력해 줘.',
        },
      });
    }

    const trimmedDiary = diary.trim();

    // 2. 빈 입력 및 공백 검증
    if (trimmedDiary.length === 0) {
      return res.status(400).json({
        error: {
          code: 'EMPTY_INPUT',
          message: '영어 일기를 먼저 작성해 줘.',
        },
      });
    }

    // 3. 최대 글자 수 검증 (5,000자 제한)
    if (trimmedDiary.length > 5000) {
      return res.status(400).json({
        error: {
          code: 'MAX_LENGTH_EXCEEDED',
          message: '일기는 5,000자 이내로 작성해 줘.',
        },
      });
    }

    // 4. AI 교정 실행 (OpenAI 호출)
    const result = await correctDiaryWithAI(trimmedDiary);

    // 5. 성공 응답 반환 (PRD 및 API 명세 준수)
    return res.status(200).json({
      data: result,
    });
  } catch (err) {
    // 보안: 일기 원문이나 비밀 키는 서버 로그에 남기지 않습니다.
    console.error('[일기 교정 API 처리 실패]', err.message);

    if (err.message === 'OPENAI_CONFIG_ERROR') {
      return res.status(500).json({
        error: {
          code: 'CONFIG_ERROR',
          message: 'AI 서비스 설정에 문제가 있어. 관리자에게 문의해 줘.',
        },
      });
    }

    return res.status(502).json({
      error: {
        code: 'AI_SERVICE_ERROR',
        message: '지금은 교정 결과를 가져오지 못했어. 잠시 후 다시 시도해 줘.',
      },
    });
  }
});

module.exports = router;

