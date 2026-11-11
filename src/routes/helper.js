// ==============================================================================
// [Dearly 백엔드] src/routes/helper.js
// 역할: 일기 작성 보조 도구 라우터 (한국어 표현 영어 변환 및 단어 사전 검색)
// ==============================================================================

const express = require('express');
const router = express.Router();
const { translateExpressionWithAI, lookupWordWithAI } = require('../lib/openai');

/**
 * POST /api/translate-expression
 * 한국어 단어 또는 짧은 문장을 자연스러운 영어 표현 2~3개로 변환
 */
router.post('/translate-expression', async (req, res) => {
  try {
    const { text } = req.body;

    if (typeof text !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '변환할 한국어 내용을 입력해 줘.',
        },
      });
    }

    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return res.status(400).json({
        error: {
          code: 'EMPTY_INPUT',
          message: '변환할 단어나 문장을 먼저 입력해 줘.',
        },
      });
    }

    if (trimmed.length > 300) {
      return res.status(400).json({
        error: {
          code: 'MAX_LENGTH_EXCEEDED',
          message: '표현 변환은 300자 이내로 입력해 줘.',
        },
      });
    }

    const result = await translateExpressionWithAI(trimmed);
    return res.status(200).json({ data: result });
  } catch (err) {
    console.error('[표현 변환 API 오류]', err.message);
    return res.status(502).json({
      error: {
        code: 'TRANSLATE_ERROR',
        message: '표현을 변환하지 못했어. 잠시 후 다시 시도해 줘.',
      },
    });
  }
});

/**
 * POST /api/lookup-word
 * 한영 / 영한 단어 검색 (품사, 뜻, 예문, 유의어 반환)
 */
router.post('/lookup-word', async (req, res) => {
  try {
    const { word } = req.body;

    if (typeof word !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '검색할 단어를 입력해 줘.',
        },
      });
    }

    const trimmed = word.trim();
    if (trimmed.length === 0) {
      return res.status(400).json({
        error: {
          code: 'EMPTY_INPUT',
          message: '검색할 단어를 먼저 입력해 줘.',
        },
      });
    }

    if (trimmed.length > 100) {
      return res.status(400).json({
        error: {
          code: 'MAX_LENGTH_EXCEEDED',
          message: '단어 검색은 100자 이내로 입력해 줘.',
        },
      });
    }

    const result = await lookupWordWithAI(trimmed);
    return res.status(200).json({ data: result });
  } catch (err) {
    console.error('[단어 검색 API 오류]', err.message);
    return res.status(502).json({
      error: {
        code: 'LOOKUP_ERROR',
        message: '단어 검색에 실패했어. 잠시 후 다시 시도해 줘.',
      },
    });
  }
});

module.exports = router;

