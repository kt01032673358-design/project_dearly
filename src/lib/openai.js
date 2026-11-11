// ==============================================================================
// [Dearly 백엔드] src/lib/openai.js
// 역할: OpenAI API를 통한 영어 일기 교정, 한국어 해석, 뉘앙스 분석,
//       한국어 표현 영어 변환, 영어 단어 검색 모듈
// 보안 및 원칙:
// 1. OPENAI_API_KEY는 서버 환경변수로만 사용하며 클라이언트에 절대 노출하지 않습니다.
// 2. 학생의 입력은 지시문과 분리하여 데이터로만 취급합니다(Prompt Injection 방어).
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

// ==============================================================================
// 1. 영어 일기 교정 및 분석 (강화된 교정 원칙 적용)
// ==============================================================================
const DIARY_SYSTEM_PROMPT = `
You are "Dearly", an encouraging, supportive English learning tutor for students.
Your mission is to review the student's English diary, correct mistakes accurately while respecting their original voice, provide Korean translation, offer similar expressions, and motivate them.

[CRITICAL POLICIES]
1. DO NOT CHANGE CORRECT ENGLISH:
   - If a sentence is already grammatically and idiomatically correct, DO NOT rewrite it.
   - Do not replace natural beginner/intermediate words with overly advanced or literary synonyms (e.g. do not change "I went" to "I ventured" or "I proceeded").
   - If the student's sentence is correct, keep "correctedText" identical to the original sentence.
2. CORRECT ONLY REAL ERRORS:
   - Correct actual spelling mistakes, grammatical errors (tenses, subject-verb agreement, prepositions, articles), and clearly broken English.
   - Maintain the student's original tone, feelings, and factual meaning.
3. HANDLE KOREAN & MIXED INPUT:
   - If the input is in Korean or a mixture of Korean and English, naturally translate and complete the full English diary.
   - Reflect the student's intended emotion and context naturally.
4. PRESERVE PUNCTUATION, LINE BREAKS & EMOJIS:
   - Do NOT delete emojis, special symbols, exclamation marks, quotation marks, or line breaks.
   - Preserve line breaks and paragraph structure in "correctedText".
5. CHANGES ARRAY (FOR ACCURATE HIGHLIGHTING):
   - For every corrected part, include an object in "changes":
     - "before": The exact original word or phrase that had the mistake.
     - "after": The exact replacement word or phrase as it appears in "correctedText".
     - "reason": A brief, friendly explanation in Korean (1 sentence).
   - If no correction was needed, "changes" should be an empty array [].
6. NATURAL KOREAN INTERPRETATION:
   - "original.korean": Provide a warm, natural everyday conversational Korean translation of the input.
7. SIMILAR EXPRESSIONS (2 to 3 items):
   - Provide 2 or 3 natural alternative English expressions conveying a similar meaning.
   - For each: "english", "korean", and "nuance" (explaining the subtle difference in tone/emphasis).
8. WARM CHEER:
   - Exactly ONE uplifting English sentence ("compliment") encouraging the student.

[JSON Schema]
{
  "original": {
    "english": "Original input text",
    "korean": "자연스러운 일상 회화체 한국어 해석"
  },
  "correctedText": "The fully corrected English text (preserving line breaks and correct sentences)",
  "changes": [
    {
      "before": "original erroneous word/phrase",
      "after": "corrected replacement word/phrase in correctedText",
      "reason": "수정한 이유 (한국어로 친절하게 1문장)"
    }
  ],
  "corrections": [
    {
      "original": "original erroneous word/phrase",
      "corrected": "improved phrase",
      "reason": "수정한 이유 설명"
    }
  ],
  "similarExpressions": [
    {
      "english": "Natural similar English expression",
      "korean": "한국어 해석",
      "nuance": "원문과의 뉘앙스 차이 설명"
    }
  ],
  "compliment": "One warm, uplifting English compliment sentence."
}
`.trim();

/**
 * 영어 일기 교정 및 분석 함수
 */
async function correctDiaryWithAI(diaryText) {
  const client = getOpenAIClient();
  if (!client) {
    const error = new Error('OPENAI_CONFIG_ERROR');
    error.status = 500;
    throw error;
  }

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [
        { role: 'system', content: DIARY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Here is the student's diary entry to review:\n"""\n${diaryText}\n"""`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('EMPTY_AI_RESPONSE');
    }

    const parsed = JSON.parse(content);

    const correctedText = typeof parsed.correctedText === 'string' ? parsed.correctedText : diaryText;
    const compliment = typeof parsed.compliment === 'string' ? parsed.compliment.trim() : 'Great job writing today!';

    const originalEnglish = parsed.original?.english && typeof parsed.original.english === 'string'
      ? parsed.original.english
      : diaryText;
    const originalKorean = parsed.original?.korean && typeof parsed.original.korean === 'string'
      ? parsed.original.korean.trim()
      : '자연스러운 해석입니다.';

    // 변화 사항(changes) 리스트 검증
    const rawChanges = Array.isArray(parsed.changes) ? parsed.changes : [];
    const sanitizedChanges = rawChanges.map((c) => ({
      before: typeof c.before === 'string' ? c.before : '',
      after: typeof c.after === 'string' ? c.after : '',
      reason: typeof c.reason === 'string' ? c.reason : '자연스럽게 수정했어요.',
    }));

    // 기존 호환용 corrections
    const rawCorrections = Array.isArray(parsed.corrections) ? parsed.corrections : sanitizedChanges.map(c => ({
      original: c.before,
      corrected: c.after,
      reason: c.reason
    }));
    const sanitizedCorrections = rawCorrections.slice(0, 5).map((item) => ({
      original: typeof item.original === 'string' ? item.original : '',
      corrected: typeof item.corrected === 'string' ? item.corrected : '',
      reason: typeof item.reason === 'string' ? item.reason : '자연스럽게 수정했어요.',
    }));

    // 유사 표현 리스트 (2~3개)
    const rawSimilar = Array.isArray(parsed.similarExpressions) ? parsed.similarExpressions : [];
    const sanitizedSimilar = rawSimilar.slice(0, 3).map((item, index) => ({
      english: typeof item.english === 'string' ? item.english.trim() : `Similar expression ${index + 1}`,
      korean: typeof item.korean === 'string' ? item.korean.trim() : '해석',
      nuance: typeof item.nuance === 'string' ? item.nuance.trim() : '뉘앙스 설명',
    }));

    return {
      original: {
        english: originalEnglish,
        korean: originalKorean,
      },
      correctedText,
      changes: sanitizedChanges,
      corrections: sanitizedCorrections,
      similarExpressions: sanitizedSimilar,
      compliment,
    };
  } catch (err) {
    console.error('[OpenAI 일기 교정 오류]', err.name || 'Error');
    const customError = new Error('AI_PROCESSING_FAILED');
    customError.status = err.status || 502;
    throw customError;
  }
}

// ==============================================================================
// 2. 신규 기능 ①: 한국어 단어/문장 영어 변환
// ==============================================================================
const TRANSLATE_SYSTEM_PROMPT = `
You are "Dearly", a helpful English learning tutor.
The student is writing an English diary and wants to translate a Korean word or short phrase/sentence into natural English.

[Guidelines]
1. Provide 2 to 3 natural, authentic English expressions for the Korean input.
2. The expressions should be suitable for a student's diary (conversational, clear, not overly complex).
3. For each expression, provide:
   - "english": The English expression or sentence.
   - "korean": Natural Korean meaning.
   - "tip": A brief tip on when or how to use it (in Korean, 1 short sentence).
4. Return ONLY a valid JSON object matching the schema below.

[JSON Schema]
{
  "koreanInput": "The input text",
  "expressions": [
    {
      "english": "I was so tired today.",
      "korean": "오늘은 너무 피곤했다.",
      "tip": "일상에서 가장 자주 쓰는 자연스러운 표현이에요."
    }
  ]
}
`.trim();

/**
 * 한국어 단어/문장 영어 변환 함수
 */
async function translateExpressionWithAI(koreanText) {
  const client = getOpenAIClient();
  if (!client) {
    const error = new Error('OPENAI_CONFIG_ERROR');
    error.status = 500;
    throw error;
  }

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [
        { role: 'system', content: TRANSLATE_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Convert this Korean expression into natural English for a diary:\n"""\n${koreanText}\n"""`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('EMPTY_AI_RESPONSE');
    }

    const parsed = JSON.parse(content);
    const expressions = Array.isArray(parsed.expressions) ? parsed.expressions : [];

    return {
      koreanInput: koreanText,
      expressions: expressions.slice(0, 3).map((item) => ({
        english: typeof item.english === 'string' ? item.english.trim() : '',
        korean: typeof item.korean === 'string' ? item.korean.trim() : '',
        tip: typeof item.tip === 'string' ? item.tip.trim() : '',
      })),
    };
  } catch (err) {
    console.error('[OpenAI 표현 변환 오류]', err.name || 'Error');
    const customError = new Error('TRANSLATE_FAILED');
    customError.status = err.status || 502;
    throw customError;
  }
}

// ==============================================================================
// 3. 신규 기능 ②: 영어/한국어 단어 검색 (단어사전)
// ==============================================================================
const DICTIONARY_SYSTEM_PROMPT = `
You are "Dearly", an English-Korean dictionary tutor for students writing diaries.
The user enters a Korean word (e.g. '피곤하다') OR an English word (e.g. 'excited').

[Guidelines]
1. Identify the query language and search intent.
2. Provide between 2 and 4 of the most relevant, high-frequency word results / synonyms.
3. For each result item, provide:
   - "word": The English word or key phrase.
   - "partOfSpeech": Part of speech in Korean (e.g., 형용사, 동사, 명사, 숙어).
   - "meaning": Natural Korean definition/meaning.
   - "example": A simple, relatable English sentence suitable for a student's diary.
   - "exampleMeaning": Korean translation of the example sentence.
4. Return ONLY a valid JSON object matching the schema below.

[JSON Schema]
{
  "query": "search query",
  "results": [
    {
      "word": "tired",
      "partOfSpeech": "형용사",
      "meaning": "피곤한, 지친",
      "example": "I felt tired after running in gym class.",
      "exampleMeaning": "체육 시간에 달리고 나서 피곤함을 느꼈다."
    }
  ]
}
`.trim();

/**
 * 단어 검색 함수 (한영/영한 사전)
 */
async function lookupWordWithAI(query) {
  const client = getOpenAIClient();
  if (!client) {
    const error = new Error('OPENAI_CONFIG_ERROR');
    error.status = 500;
    throw error;
  }

  try {
    const response = await client.chat.completions.create({
      model: modelName,
      response_format: { type: 'json_object' },
      temperature: 0.2,
      messages: [
        { role: 'system', content: DICTIONARY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Look up this word/phrase for a student writing a diary:\n"""\n${query}\n"""`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('EMPTY_AI_RESPONSE');
    }

    const parsed = JSON.parse(content);
    const results = Array.isArray(parsed.results) ? parsed.results : [];

    return {
      query,
      results: results.slice(0, 4).map((r) => ({
        word: typeof r.word === 'string' ? r.word.trim() : '',
        partOfSpeech: typeof r.partOfSpeech === 'string' ? r.partOfSpeech.trim() : '',
        meaning: typeof r.meaning === 'string' ? r.meaning.trim() : '',
        example: typeof r.example === 'string' ? r.example.trim() : '',
        exampleMeaning: typeof r.exampleMeaning === 'string' ? r.exampleMeaning.trim() : '',
      })),
    };
  } catch (err) {
    console.error('[OpenAI 단어 검색 오류]', err.name || 'Error');
    const customError = new Error('LOOKUP_FAILED');
    customError.status = err.status || 502;
    throw customError;
  }
}

module.exports = {
  correctDiaryWithAI,
  translateExpressionWithAI,
  lookupWordWithAI,
};
