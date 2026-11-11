// ==============================================================================
// [Dearly Vercel Function] api/feedback-list.js
// 역할: Vercel 배포 시 /api/feedback-list 경로를 직접 처리하는 서버리스 함수
// ==============================================================================

const app = require('../src/app');

module.exports = (req, res) => {
  return app(req, res);
};

