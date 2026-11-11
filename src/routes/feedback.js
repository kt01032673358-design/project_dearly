// ==============================================================================
// [Dearly 백엔드] src/routes/feedback.js
// 역할: 피드백 등록 및 최신순 피드백 목록 조회 API 라우터
// ==============================================================================

const express = require('express');
const router = express.Router();
const { getSupabaseClient } = require('../lib/supabase');

/**
 * POST /api/feedback
 * 학생들의 서비스 피드백을 등록합니다. (로그인 불필요, 익명성 보장)
 */
router.post('/feedback', async (req, res) => {
  try {
    const { message } = req.body;

    // 1. 입력값 유형 검증
    if (typeof message !== 'string') {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '피드백 내용을 올바르게 입력해 줘.',
        },
      });
    }

    const trimmedMessage = message.trim();

    // 2. 글자 수 검증 (1자 이상 1,000자 이하)
    if (trimmedMessage.length === 0) {
      return res.status(400).json({
        error: {
          code: 'EMPTY_INPUT',
          message: '피드백 내용을 입력해 줘.',
        },
      });
    }

    if (trimmedMessage.length > 1000) {
      return res.status(400).json({
        error: {
          code: 'MAX_LENGTH_EXCEEDED',
          message: '피드백은 1,000자 이내로 작성해 줘.',
        },
      });
    }

    // 3. Supabase 클라이언트 획득
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({
        error: {
          code: 'DB_CONFIG_ERROR',
          message: '데이터베이스 설정에 문제가 있어. 잠시 후 다시 이용해 줘.',
        },
      });
    }

    // 4. Supabase DB에 저장 (개인정보는 받지 않고 message만 저장)
    const { data, error } = await supabase
      .from('feedback')
      .insert([{ message: trimmedMessage }])
      .select('id, message, created_at')
      .single();

    if (error) {
      console.error('[피드백 저장 실패]', error.message);
      return res.status(500).json({
        error: {
          code: 'DB_INSERT_FAILED',
          message: '피드백을 보내지 못했어. 입력 내용은 유지했으니 다시 시도해 줘.',
        },
      });
    }

    // 5. 성공 응답 (HTTP 201 Created)
    return res.status(201).json({
      data: {
        id: data.id,
        message: data.message,
        created_at: data.created_at,
      },
    });
  } catch (err) {
    console.error('[피드백 API 서버 오류]', err.message);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '서버에 문제가 발생했어. 잠시 후 다시 시도해 줘.',
      },
    });
  }
});

/**
 * 피드백 목록 조회 로직 (GET /api/feedback 및 GET /api/feedback-list 공통 처리)
 */
async function handleGetFeedbackList(req, res) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return res.status(500).json({
        error: {
          code: 'DB_CONFIG_ERROR',
          message: '데이터베이스 설정에 문제가 있어. 잠시 후 다시 이용해 줘.',
        },
      });
    }

    // 최신 작성 순(created_at 내림차순)으로 id, message, created_at만 조회
    const { data, error } = await supabase
      .from('feedback')
      .select('id, message, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[피드백 목록 조회 실패]', error.message);
      return res.status(500).json({
        error: {
          code: 'DB_FETCH_FAILED',
          message: '피드백 목록을 불러오지 못했어. 다시 시도해 줘.',
        },
      });
    }

    // 조회 성공: 빈 목록이어도 빈 배열([]) 반환
    return res.status(200).json({
      data: data || [],
    });
  } catch (err) {
    console.error('[피드백 목록 API 오류]', err.message);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '피드백 목록을 불러오지 못했어. 다시 시도해 줘.',
      },
    });
  }
}

// 명세서 호환을 위해 두 경로 모두 지원
router.get('/feedback', handleGetFeedbackList);
router.get('/feedback-list', handleGetFeedbackList);

module.exports = router;

