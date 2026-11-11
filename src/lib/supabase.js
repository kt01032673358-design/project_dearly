// ==============================================================================
// [Dearly 백엔드] src/lib/supabase.js
// 역할: Supabase 데이터베이스 연결 및 클라이언트 초기화 모듈
// 보안 원칙:
// 1. 서버 전용 비밀 키(SUPABASE_SERVICE_ROLE_KEY)를 사용합니다.
// 2. 이 파일은 브라우저(프런트엔드)에 절대 전달되지 않습니다.
// ==============================================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 환경 변수에서 Supabase 설정값 가져오기
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supabase 클라이언트 객체 보관용 변수
let supabaseClient = null;

/**
 * Supabase 클라이언트를 반환하는 함수
 * 환경 변수가 유효한지 검사한 후 싱글톤(단일 인스턴스) 객체를 반환합니다.
 */
function getSupabaseClient() {
  // 이미 생성된 클라이언트가 있다면 재사용
  if (supabaseClient) {
    return supabaseClient;
  }

  // 환경 변수 설정 여부 검증
  if (!supabaseUrl || !supabaseServiceRoleKey || 
      supabaseUrl === 'https://your-project-id.supabase.co' || 
      supabaseServiceRoleKey === 'your_supabase_service_role_key_here') {
    console.error('[Supabase 오류] .env 파일에 올바른 SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.');
    return null;
  }

  try {
    // service_role 키를 사용한 서버용 Supabase 클라이언트 초기화
    // auth 옵션의 persistSession을 false로 두어 서버 환경에 최적화
    supabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseClient;
  } catch (error) {
    console.error('[Supabase 초기화 실패]', error.message);
    return null;
  }
}

module.exports = {
  getSupabaseClient,
};

