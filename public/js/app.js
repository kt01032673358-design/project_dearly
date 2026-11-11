// ==============================================================================
// [Dearly 프런트엔드] public/js/app.js
// 역할: 일기/문장 교정 요청, 한국어 해석 및 유사 표현(뉘앙스) 렌더링, 피드백 등록 및 목록 관리
// 보안 원칙: XSS 공격을 원천 방지하기 위해 사용자 입력 및 AI 결과 출력 시 반드시
//           textContent 또는 안전한 DOM 노드 생성 방식을 사용합니다.
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM 요소 참조 ---
  // 1. 일기/문장 작성 관련 요소
  const diaryInput = document.getElementById('diary-input');
  const diaryCharCount = document.getElementById('diary-char-count');
  const correctBtn = document.getElementById('correct-btn');
  const diaryStatus = document.getElementById('diary-status');

  // 2. 결과 카드 관련 요소
  const resultCard = document.getElementById('result-card');
  const originalEnglishEl = document.getElementById('original-english');
  const originalKoreanEl = document.getElementById('original-korean');
  const correctedTextEl = document.getElementById('corrected-text');
  const correctionsListEl = document.getElementById('corrections-list');
  const similarListEl = document.getElementById('similar-list');
  const complimentTextEl = document.getElementById('compliment-text');

  // 3. 피드백 작성 관련 요소
  const feedbackInput = document.getElementById('feedback-input');
  const feedbackCharCount = document.getElementById('feedback-char-count');
  const feedbackSubmitBtn = document.getElementById('feedback-submit-btn');
  const feedbackStatus = document.getElementById('feedback-status');

  // 4. 피드백 목록 관련 요소
  const feedbackItemsEl = document.getElementById('feedback-items');
  const refreshFeedbackBtn = document.getElementById('refresh-feedback-btn');
  const listStatus = document.getElementById('list-status');

  // ============================================================================
  // 유틸리티 함수들
  // ============================================================================

  /** 상태 메시지 표시 함수 */
  function showStatus(element, message, type = 'error') {
    element.textContent = message;
    element.className = `status-message ${type}`;
    element.style.display = 'block';
  }

  /** 상태 메시지 숨김 함수 */
  function hideStatus(element) {
    element.textContent = '';
    element.className = 'status-message';
    element.style.display = 'none';
  }

  /** 날짜 및 시각을 학생이 읽기 편한 한국어 형식으로 포맷팅 */
  function formatDate(isoString) {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '방금 전';
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`;
    } catch {
      return '최근';
    }
  }

  // ============================================================================
  // 1. 글자 수 실시간 카운팅 이벤트
  // ============================================================================
  diaryInput.addEventListener('input', () => {
    diaryCharCount.textContent = diaryInput.value.length;
    if (diaryStatus.style.display === 'block') {
      hideStatus(diaryStatus);
    }
  });

  feedbackInput.addEventListener('input', () => {
    feedbackCharCount.textContent = feedbackInput.value.length;
    if (feedbackStatus.style.display === 'block') {
      hideStatus(feedbackStatus);
    }
  });

  // ============================================================================
  // 2. 영어 일기/문장 분석 및 교정 요청 로직
  // ============================================================================
  correctBtn.addEventListener('click', async () => {
    const rawDiary = diaryInput.value;
    const trimmedDiary = rawDiary.trim();

    // 빈 입력 검증
    if (trimmedDiary.length === 0) {
      showStatus(diaryStatus, '영어 문장이나 일기를 먼저 작성해 줘.', 'error');
      diaryInput.focus();
      return;
    }

    if (trimmedDiary.length > 5000) {
      showStatus(diaryStatus, '문장은 5,000자 이내로 작성해 줘.', 'error');
      return;
    }

    // 로딩 상태 시작 (버튼 비활성화 및 스피너 표시)
    correctBtn.disabled = true;
    correctBtn.classList.add('is-loading');
    correctBtn.querySelector('.btn-text').textContent = 'AI 튜터가 문장을 분석하고 해석하는 중... ✍️';
    hideStatus(diaryStatus);

    try {
      const response = await fetch('/api/correct-diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diary: trimmedDiary }),
      });

      const resData = await response.json();

      if (!response.ok) {
        const errorMsg = resData?.error?.message || '지금은 분석 결과를 가져오지 못했어. 잠시 후 다시 시도해 줘.';
        showStatus(diaryStatus, errorMsg, 'error');
        return;
      }

      // 교정 및 유사 표현 결과 렌더링
      renderAnalysisResult(resData.data, trimmedDiary);

      // 성공 시 결과 카드로 부드럽게 스크롤 이동
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('[문장 분석 통신 오류]', err);
      showStatus(diaryStatus, '네트워크에 문제가 발생했어. 인터넷 연결을 확인하고 다시 시도해 줘.', 'error');
    } finally {
      // 로딩 상태 해제
      correctBtn.disabled = false;
      correctBtn.classList.remove('is-loading');
      correctBtn.querySelector('.btn-text').textContent = '문장 분석 & 교정하기 ✨';
    }
  });

  /**
   * 분석 및 교정 결과 화면 표시 함수
   * 보안: XSS 방지를 위해 모든 텍스트 주입에 textContent와 createElement를 사용합니다.
   */
  function renderAnalysisResult(data, fallbackEnglish) {
    const { original, correctedText, corrections, similarExpressions, compliment } = data;

    // 1. 원문 및 자연스러운 한국어 해석 출력
    const engText = original?.english || fallbackEnglish;
    const korText = original?.korean || '자연스러운 우리말 해석입니다.';
    originalEnglishEl.textContent = engText;
    originalKoreanEl.textContent = korText;

    // 2. 교정된 전체 문장 출력
    correctedTextEl.textContent = correctedText || engText;

    // 3. 수정 사항 목록 출력
    correctionsListEl.innerHTML = '';
    if (!corrections || corrections.length === 0) {
      const noChangeItem = document.createElement('div');
      noChangeItem.className = 'correction-item';
      noChangeItem.textContent = '👏 문법이나 표현이 이미 훌륭해요! 특별히 수정할 부분이 없었어요.';
      correctionsListEl.appendChild(noChangeItem);
    } else {
      corrections.forEach((item) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'correction-item';

        const wordsEl = document.createElement('div');
        wordsEl.className = 'correction-words';

        if (item.original) {
          const origSpan = document.createElement('span');
          origSpan.className = 'word-original';
          origSpan.textContent = item.original;
          wordsEl.appendChild(origSpan);

          const arrowSpan = document.createElement('span');
          arrowSpan.className = 'word-arrow';
          arrowSpan.textContent = '→';
          wordsEl.appendChild(arrowSpan);
        }

        const corrSpan = document.createElement('span');
        corrSpan.className = 'word-corrected';
        corrSpan.textContent = item.corrected;
        wordsEl.appendChild(corrSpan);

        const reasonEl = document.createElement('div');
        reasonEl.className = 'correction-reason';
        reasonEl.textContent = item.reason;

        itemEl.appendChild(wordsEl);
        itemEl.appendChild(reasonEl);
        correctionsListEl.appendChild(itemEl);
      });
    }

    // 4. 유사 표현 (Similar Expressions) 및 뉘앙스 출력
    similarListEl.innerHTML = '';
    if (!similarExpressions || similarExpressions.length === 0) {
      const emptySimilar = document.createElement('div');
      emptySimilar.className = 'section-hint';
      emptySimilar.textContent = '원문과 가장 어울리는 표준 표현입니다.';
      similarListEl.appendChild(emptySimilar);
    } else {
      similarExpressions.forEach((expr, index) => {
        const card = document.createElement('div');
        card.className = 'similar-card';

        // 카드 상단: 번호 및 영/한 짝맞춤
        const header = document.createElement('div');
        header.className = 'similar-header';

        const indexBadge = document.createElement('span');
        indexBadge.className = 'similar-index';
        indexBadge.textContent = String(index + 1);

        const pairDiv = document.createElement('div');
        pairDiv.className = 'similar-pair';

        const enEl = document.createElement('div');
        enEl.className = 'similar-en english-font';
        enEl.textContent = expr.english;

        const krEl = document.createElement('div');
        krEl.className = 'similar-kr';
        krEl.textContent = expr.korean;

        pairDiv.appendChild(enEl);
        pairDiv.appendChild(krEl);

        header.appendChild(indexBadge);
        header.appendChild(pairDiv);
        card.appendChild(header);

        // 카드 하단: 뉘앙스 설명 박스
        if (expr.nuance) {
          const nuanceBox = document.createElement('div');
          nuanceBox.className = 'nuance-box';

          const nuanceLabel = document.createElement('span');
          nuanceLabel.className = 'nuance-label';
          nuanceLabel.textContent = '💡 뉘앙스 차이:';

          const nuanceText = document.createElement('span');
          nuanceText.className = 'nuance-text';
          nuanceText.textContent = expr.nuance;

          nuanceBox.appendChild(nuanceLabel);
          nuanceBox.appendChild(nuanceText);
          card.appendChild(nuanceBox);
        }

        similarListEl.appendChild(card);
      });
    }

    // 5. 따뜻한 칭찬 출력
    complimentTextEl.textContent = compliment ? `"${compliment}"` : '"Keep up the wonderful work!"';

    // 결과 카드 보이기
    resultCard.classList.remove('hidden');
  }

  // ============================================================================
  // 3. 피드백 제출 로직
  // ============================================================================
  feedbackSubmitBtn.addEventListener('click', async () => {
    const rawMessage = feedbackInput.value;
    const trimmedMessage = rawMessage.trim();

    // 유효성 검사
    if (trimmedMessage.length === 0) {
      showStatus(feedbackStatus, '피드백 내용을 입력해 줘.', 'error');
      feedbackInput.focus();
      return;
    }

    if (trimmedMessage.length > 1000) {
      showStatus(feedbackStatus, '피드백은 1,000자 이내로 작성해 줘.', 'error');
      return;
    }

    // 로딩 상태 시작
    feedbackSubmitBtn.disabled = true;
    feedbackSubmitBtn.classList.add('is-loading');
    feedbackSubmitBtn.querySelector('.btn-text').textContent = '보내는 중...';
    hideStatus(feedbackStatus);

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      const resData = await response.json();

      if (!response.ok) {
        const errorMsg = resData?.error?.message || '피드백을 보내지 못했어. 입력 내용은 유지했으니 다시 시도해 줘.';
        showStatus(feedbackStatus, errorMsg, 'error');
        return;
      }

      // 성공 시 입력창 초기화 및 안내
      feedbackInput.value = '';
      feedbackCharCount.textContent = '0';
      showStatus(feedbackStatus, '소중한 피드백 고마워! 아래 목록에 바로 등록되었어. 🎉', 'success');

      // 최신 피드백 목록 새로고침
      await fetchFeedbackList();

    } catch (err) {
      console.error('[피드백 전송 오류]', err);
      showStatus(feedbackStatus, '네트워크에 문제가 발생했어. 잠시 후 다시 시도해 줘.', 'error');
    } finally {
      // 로딩 상태 해제
      feedbackSubmitBtn.disabled = false;
      feedbackSubmitBtn.classList.remove('is-loading');
      feedbackSubmitBtn.querySelector('.btn-text').textContent = '피드백 보내기 🚀';
    }
  });

  // ============================================================================
  // 4. 피드백 목록 조회 로직
  // ============================================================================
  async function fetchFeedbackList() {
    hideStatus(listStatus);
    refreshFeedbackBtn.disabled = true;

    try {
      const response = await fetch('/api/feedback');
      const resData = await response.json();

      if (!response.ok) {
        showStatus(listStatus, '피드백 목록을 불러오지 못했어. 다시 시도해 줘.', 'error');
        return;
      }

      const items = resData.data || [];
      renderFeedbackList(items);

    } catch (err) {
      console.error('[피드백 목록 조회 실패]', err);
      showStatus(listStatus, '피드백 목록을 불러오지 못했어. 다시 시도해 줘.', 'error');
    } finally {
      refreshFeedbackBtn.disabled = false;
    }
  }

  /** 피드백 목록 렌더링 (XSS 원천 차단: createElement & textContent 사용) */
  function renderFeedbackList(items) {
    feedbackItemsEl.innerHTML = ''; // 초기화

    if (items.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.className = 'empty-state';
      emptyEl.textContent = '아직 등록된 피드백이 없어. 첫 의견을 남겨줘! 💌';
      feedbackItemsEl.appendChild(emptyEl);
      return;
    }

    items.forEach((item) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'feedback-item';

      // 피드백 내용
      const bodyEl = document.createElement('div');
      bodyEl.className = 'feedback-body';
      bodyEl.textContent = item.message; // textContent로 안전하게 주입

      // 작성 시각
      const timeEl = document.createElement('div');
      timeEl.className = 'feedback-time';
      timeEl.textContent = formatDate(item.created_at);

      itemEl.appendChild(bodyEl);
      itemEl.appendChild(timeEl);
      feedbackItemsEl.appendChild(itemEl);
    });
  }

  // 새로고침 버튼 클릭 시 목록 갱신
  refreshFeedbackBtn.addEventListener('click', fetchFeedbackList);

  // 페이지 접속 시 자동으로 피드백 목록 1회 불러오기
  fetchFeedbackList();
});
