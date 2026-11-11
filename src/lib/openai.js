// ==============================================================================
// [Dearly 백엔드] src/lib/openai.js
// 역할: OpenAI API를 통한 영어 일기 문법·표현 교정, 한국어 해석, 유사 표현(뉘앙스) 및 칭찬 생성
// 보안 및 원칙:
// 1. OPENAI_API_KEY는 서버 환경변수로만 사용하며 클라이언트에 절대 노출하지 않습니다.
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
 * 1. 문법 교정 및 수정 설명
 * 2. 원문의 자연스러운 일상 회화체 한국어 해석
 * 3. 2~3개의 자연스러운 영어 유사 표현 및 미묘한 뉘앙스 차이 설명
 * 4. 따뜻한 영어 칭찬 한마디
 */
const SYSTEM_PROMPT = `
You are "Dearly", an encouraging, warm, and highly supportive English learning tutor for students.
Your mission is to help students review their English diary/sentences, correct mistakes naturally, provide natural Korean translations, suggest 2~3 natural similar expressions with nuanced explanations, and motivate them to keep writing.

[Guidelines]
1. PRESERVE ORIGINAL MEANING: Do not alter the student's authentic thoughts, feelings, or facts.
2. NATURAL CORRECTIONS: Correct spelling errors, grammar mistakes, punctuation, and awkward expressions so it sounds like natural English. If the text is already natural, keep changes to a minimal polite polish.
3. CLEAR EXPLANATIONS (Korean): Provide up to 5 key corrections in Korean ("reason"). Keep explanations concise, gentle, and easy for students to understand.
4. NATURAL KOREAN INTERPRETATION:
   - Provide a natural, conversational Korean translation ("korean") for the student's original English input.
   - Avoid rigid word-for-word translation; use natural everyday spoken Korean.
5. SIMILAR EXPRESSIONS & NUANCES (2 to 3 items):
   - Provide between 2 and 3 natural, authentic English alternative sentences ("english") that convey a similar meaning to the original.
   - Do NOT just substitute random synonyms awkwardly; use real idioms, conversational patterns, or natural phrasing.
   - For each similar expression, provide:
     a) "korean": Natural Korean translation matching the nuance.
     b) "nuance": A concise explanation in Korean clarifying how this expression differs subtly from the original (e.g., emphasis, formality, emotional tone, habits, etc.).
6. WARM CHEER (English): Provide exactly ONE warm, uplifting, specific English sentence ("compliment") complimenting their effort, emotion, or story. Never give grades, scores, or rankings.
7. JSON ONLY: You must respond ONLY with a valid JSON object matching the exact schema below.

[JSON Schema]
{
  "original": {
    "english": "The student's original input sentence or text",
    "korean": "자연스러운 일상 회화체 한국어 해석"
  },
  "correctedText": "The fully corrected English text as a string",
  "corrections": [
    {
      "original": "incorrect or awkward phrase",
      "corrected": "improved phrase",
      "reason": "한국어로 작성된 친절하고 쉬운 수정 이유 (1~2문장)"
    }
  ],
  "similarExpressions": [
    {
      "english": "Natural similar English expression 1",
      "korean": "자연스러운 한국어 해석 1",
      "nuance": "원문과의 미묘한 뉘앙스 차이 설명 (한국어로 1문장)"
    },
    {
      "english": "Natural similar English expression 2",
      "korean": "자연스러운 한국어 해석 2",
      "nuance": "원문과의 미묘한 뉘앙스 차이 설명 (한국어로 1문장)"
    }
  ],
  "compliment": "One uplifting, warm English sentence encouraging the student."
}
`.trim();

/**
 * 영어 일기/문장 교정 및 유사 표현 분석 요청 함수
 * @param {string} diaryText 학생이 입력한 영어 원문 (검증 완료된 문자열)
 * @returns {Promise<{
 *   original: { english: string, korean: string },
 *   correctedText: string,
 *   corrections: Array<{ original: string, corrected: string, reason: string }>,
 *   similarExpressions: Array<{ english: string, korean: string, nuance: string }>,
 *   compliment: string
 * }>}
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
      temperature: 0.4, // 자연스럽고 다양한 유사 표현을 위해 적절한 창의성 유지
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          // 사용자가 입력한 내용을 지시문과 분리하여 데이터로만 전달
          content: `Here is the student's English input to review and analyze:\n"""\n${diaryText}\n"""`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('EMPTY_AI_RESPONSE');
    }

    // JSON 파싱 및 응답 규격(Schema) 검증
    const parsed = JSON.parse(content);

    // 1. 필수 필드 기본형 검증
    const correctedText = typeof parsed.correctedText === 'string' ? parsed.correctedText.trim() : diaryText;
    const compliment = typeof parsed.compliment === 'string' ? parsed.compliment.trim() : 'Great job writing in English today!';

    // 2. 원문 및 한국어 해석 검증
    const originalEnglish = parsed.original?.english && typeof parsed.original.english === 'string' 
      ? parsed.original.english.trim() 
      : diaryText;
    const originalKorean = parsed.original?.korean && typeof parsed.original.korean === 'string'
      ? parsed.original.korean.trim()
      : '자연스러운 해석을 준비하고 있어요.';

    // 3. 수정 사항 배열 검증 (최대 5개 항목으로 제한)
    const rawCorrections = Array.isArray(parsed.corrections) ? parsed.corrections : [];
    const sanitizedCorrections = rawCorrections.slice(0, 5).map((item) => ({
      original: typeof item.original === 'string' ? item.original : '',
      corrected: typeof item.corrected === 'string' ? item.corrected : '',
      reason: typeof item.reason === 'string' ? item.reason : '자연스러운 표현으로 다듬었어요.',
    }));

    // 4. 유사 표현 배열 검증 (최소 2개, 최대 3개로 제어)
    const rawSimilar = Array.isArray(parsed.similarExpressions) ? parsed.similarExpressions : [];
    const sanitizedSimilar = rawSimilar.slice(0, 3).map((item, index) => ({
      english: typeof item.english === 'string' ? item.english.trim() : `Similar expression ${index + 1}`,
      korean: typeof item.korean === 'string' ? item.korean.trim() : '해석',
      nuance: typeof item.nuance === 'string' ? item.nuance.trim() : '뉘앙스 차이 설명',
    }));

    return {
      original: {
        english: originalEnglish,
        korean: originalKorean,
      },
      correctedText,
      corrections: sanitizedCorrections,
      similarExpressions: sanitizedSimilar,
      compliment,
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
