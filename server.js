// ==============================================================================
// [Dearly 백엔드] server.js
// 역할: 로컬 Node.js 서버 실행 엔트리포인트
// 실행 방법: npm run dev 또는 node server.js
// ==============================================================================

const app = require('./src/app');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`✨ Dearly 서비스 서버가 포트 ${PORT}에서 정상 실행되었습니다!`);
  console.log(`👉 브라우저 접속 주소: http://localhost:${PORT}`);
  console.log(`====================================================`);
});

