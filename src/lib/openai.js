// ==============================================================================
// [Dearly 백엔드] src/lib/openai.js
// 역할: OpenAI API를 통한 영어 일기 문법·표현 교정 및 따뜻한 영어 칭찬 생성
// 보안 및 원칙:
// 1. OPENAI_API_KEY는 서버 환경변수로만 사용하며 클라이언트에 노출하지 않습니다.
// 2. 학생의 일기 원문은 프롬프트 지시문과 분리하여 데이터로만 취급합니다(Prompt Injection 방어).
// 3. 일기 원문은 AI 요청 후 어디에도 저장하거나 로그로 남기지 않습니다.
// ==============================================================================

const OpenAI = require('openai');
require('dotenv').config();

// OpenAI 클라이언트 초기화
const apiKey = process.env.OPENAI_API_KEY;
const modelName = process.env.OPENAI_MODEL || 'gpt-4o-mini';

let openaiClient = null;

function getOpenAIClient() {
  if (openaiClient) {
    return openaiClient;
  }

  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.error('[OpenAI 오류] .env 파일에 올바른 OPENAI_API_KEY가 설정되지 않았습니다.');
    return null;
  }

  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

/**
 * AI에게 전달할 시스템 지시문(System Prompt)
 * 학생의 자존감을 지켜주고 격려하는 교정 원칙을 담고 있습니다.
 */
const SYSTEM_PROMPT = `
You are "Dearly", an encouraging, warm, and highly supportive English learning tutor for students.
Your mission is to help students review their English diary, correct mistakes naturally, and motivate them to keep writing.

[Guidelines]
1. PRESERVE ORIGINAL MEANING: Do not alter the student's authentic thoughts, feelings, or facts.
2. NATURAL CORRECTIONS: Correct spelling errors, grammar mistakes, punctuation, and awkward expressions so it sounds like natural English. If the text is already natural, keep changes to a minimal polite polish.
3. CLEAR EXPLANATIONS (Korean): Provide up to 5 key corrections in Korean ("reason"). Keep explanations concise, gentle, and easy for students to understand.
4. WARM CHEER (English): Provide exactly ONE warm, uplifting, specific English sentence ("compliment") complimenting their effort, emotion, or story. Never give grades, scores, or rankings.
5. JSON ONLY: You must respond ONLY with a valid JSON object matching the exact schema below.

[JSON Schema]
{
  "correctedText": "The fully corrected English diary as a string",
  "corrections": [
    {
      "original": "incorrect or awkward phrase",
      "corrected": "improved phrase",
      "reason": "한국어로 작성된 친절하고 쉬운 수정 이유 (1~2문장)"
    }
  ],
  "compliment": "One uplifting, warm English sentence encouraging the student."
}
`.trim();

/**
 * 영어 일기 교정 요청 함수
 * @param {string} diaryText 학생이 입력한 영어 일기 원문 (검증 완료된 문자열)
 * @returns {Promise<{correctedText: string, corrections: Array, compliment: string}>}
 */
async function correctDiaryWithAI(diaryText) {
  const client = getOpenAIClient();
  if (!client) {
    const error = new Error('OPENAI_CONFIG_ERROR');
    error.status = 500;
    throw error;
  }

  try {
    // OpenAI Chat Completions API 호출
    const response = await client.chat.completions.create({
      model: modelName,
      response_format: { type: 'json_object' }, // JSON 출력 강제
      temperature: 0.3, // 일관되고 정확한 교정을 위해 낮은 온도 설정
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          // 사용자가 입력한 내용을 명령어가 아닌 순수 일기 데이터로 명확히 분리
          content: `Here is the student's English diary entry to review:\n"""\n${diaryText}\n"""`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('EMPTY_AI_RESPONSE');
    }

    // JSON 파싱 및 응답 규격(Schema) 검증
    const parsed = JSON.parse(content);

    // 필수 필드 검증
    if (typeof parsed.correctedText !== 'string' || typeof parsed.compliment !== 'string') {
      throw new Error('INVALID_AI_SCHEMA');
    }

    // 수정 사항 배열 검증 (최대 5개 항목으로 제한)
    const rawCorrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];
    const sanitizedCorrections = rawCorrections.slice(0, 5).map((item) => ({
      original: typeof item.original === 'string' ? item.original : '',
      corrected: typeof item.corrected === 'string' ? item.corrected : '',
      reason: typeof item.reason === 'string' ? item.reason : '자연스러운 표현으로 다듬었어요.',
    }));

    return {
      correctedText: parsed.correctedText.trim(),
      corrections: sanitizedCorrections,
      compliment: parsed.compliment.trim(),
    };
  } catch (err) {
    // 보안을 위해 원문이나 API 키는 에러 로그에 노출하지 않습니다.
    console.error('[OpenAI 호출 오류]', err.name || 'Error');
    const customError = new Error('AI_PROCESSING_FAILED');
    customError.status = err.status || 502;
    throw customError;
  }
}

module.exports = {
  correctDiaryWithAI,
};

