// ==============================================================================
// [Dearly 프런트엔드] public/js/app.js
// 역할: 일기/문장 교정 요청, 한국어 표현 변환, 단어 사전 검색,
//       교정 하이라이트 & 전후 비교 뷰, 피드백 등록 및 최신 목록 관리
// 보안 원칙: XSS 공격을 원천 방지하기 위해 사용자 입력 및 AI 결과 출력 시
//           textContent 또는 안전한 DOM 노드 생성 방식을 철저히 사용합니다.
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM 요소 참조 ---
  // 1. 일기/문장 작성 관련 요소
  const diaryInput = document.getElementById('diary-input');
  const diaryCharCount = document.getElementById('diary-char-count');
  const correctBtn = document.getElementById('correct-btn');
  const diaryStatus = document.getElementById('diary-status');

  // 1-1. 신규 기능 ①: 한국어 표현 영어 변환 관련 요소
  const toggleTranslateBtn = document.getElementById('toggle-translate-btn');
  const translatePanel = document.getElementById('translate-panel');
  const closeTranslatePanelBtn = document.getElementById('close-translate-panel-btn');
  const translateInput = document.getElementById('translate-input');
  const translateSubmitBtn = document.getElementById('translate-submit-btn');
  const translateStatus = document.getElementById('translate-status');
  const translateResults = document.getElementById('translate-results');

  // 1-2. 신규 기능 ②: 영어 단어 검색창 관련 요소
  const toggleDictBtn = document.getElementById('toggle-dict-btn');
  const dictPanel = document.getElementById('dict-panel');
  const closeDictPanelBtn = document.getElementById('close-dict-panel-btn');
  const dictInput = document.getElementById('dict-input');
  const dictSubmitBtn = document.getElementById('dict-submit-btn');
  const dictStatus = document.getElementById('dict-status');
  const dictResults = document.getElementById('dict-results');

  // 2. 결과 카드 관련 요소
  const resultCard = document.getElementById('result-card');
  const originalEnglishEl = document.getElementById('original-english');
  const originalKoreanEl = document.getElementById('original-korean');
  const correctedTextEl = document.getElementById('corrected-text');
  const correctionsListEl = document.getElementById('corrections-list');
  const similarListEl = document.getElementById('similar-list');
  const complimentTextEl = document.getElementById('compliment-text');

  // 2-1. 신규 기능 ③: 교정 하이라이트 & 전후 비교 탭 관련 요소
  const viewHighlightTab = document.getElementById('view-highlight-tab');
  const viewCompareTab = document.getElementById('view-compare-tab');
  const highlightView = document.getElementById('highlight-view');
  const compareView = document.getElementById('compare-view');
  const compareOriginalEl = document.getElementById('compare-original');
  const compareCorrectedEl = document.getElementById('compare-corrected');

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

  /**
   * 일기 작성 textarea의 현재 커서(선택) 위치에 텍스트를 자연스럽게 삽입하는 함수
   * 사용자가 작성 중이던 기존 일기는 100% 보존됩니다.
   */
  function insertAtCursor(textToInsert) {
    const startPos = diaryInput.selectionStart;
    const endPos = diaryInput.selectionEnd;
    const currentVal = diaryInput.value;

    // 앞뒤 공백 자동 보정 (단어 사이에 자연스럽게 들어가도록)
    let insertText = textToInsert;
    if (startPos > 0 && currentVal[startPos - 1] !== ' ' && currentVal[startPos - 1] !== '\n') {
      insertText = ' ' + insertText;
    }
    if (endPos < currentVal.length && currentVal[endPos] !== ' ' && currentVal[endPos] !== '\n') {
      insertText = insertText + ' ';
    }

    // 커서 위치에 텍스트 합치기
    diaryInput.value = currentVal.substring(0, startPos) + insertText + currentVal.substring(endPos);

    // 커서를 삽입된 텍스트 바로 뒤로 이동시키고 포커스
    const newPos = startPos + insertText.length;
    diaryInput.selectionStart = newPos;
    diaryInput.selectionEnd = newPos;
    diaryInput.focus();

    // 글자 수 카운터 업데이트
    diaryCharCount.textContent = diaryInput.value.length;

    // 사용자에게 부드러운 피드백 알림
    showStatus(diaryStatus, `입력창에 "${textToInsert}" 표현을 쏙 넣었어요! ✨`, 'success');
    setTimeout(() => {
      if (diaryStatus.textContent.includes('쏙 넣었어요')) {
        hideStatus(diaryStatus);
      }
    }, 2500);
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
  // 2. 신규 기능 ①: 한국어 표현 영어 변환 로직
  // ============================================================================
  toggleTranslateBtn.addEventListener('click', () => {
    const isHidden = translatePanel.classList.contains('hidden');
    // 단어 사전 패널은 닫아주고 표현 변환 패널 토글
    dictPanel.classList.add('hidden');
    toggleDictBtn.classList.remove('active');

    if (isHidden) {
      translatePanel.classList.remove('hidden');
      toggleTranslateBtn.classList.add('active');
      translateInput.focus();
    } else {
      translatePanel.classList.add('hidden');
      toggleTranslateBtn.classList.remove('active');
    }
  });

  closeTranslatePanelBtn.addEventListener('click', () => {
    translatePanel.classList.add('hidden');
    toggleTranslateBtn.classList.remove('active');
  });

  // 엔터 키 입력 시 자동 변환 실행
  translateInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      translateSubmitBtn.click();
    }
  });

  translateSubmitBtn.addEventListener('click', async () => {
    const text = translateInput.value.trim();
    if (!text) {
      showStatus(translateStatus, '변환할 한국어 단어나 문장을 먼저 입력해 줘.', 'error');
      translateInput.focus();
      return;
    }

    translateSubmitBtn.disabled = true;
    translateSubmitBtn.classList.add('is-loading');
    translateSubmitBtn.querySelector('.btn-text').textContent = '변환 중...';
    hideStatus(translateStatus);
    translateResults.innerHTML = '';

    try {
      const response = await fetch('/api/translate-expression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const resData = await response.json();

      if (!response.ok) {
        const errorMsg = resData?.error?.message || '표현 변환에 실패했어. 다시 시도해 줘.';
        showStatus(translateStatus, errorMsg, 'error');
        return;
      }

      const expressions = resData.data?.expressions || [];
      if (expressions.length === 0) {
        showStatus(translateStatus, '알맞은 영어 표현을 찾지 못했어. 다른 표현으로 입력해 봐!', 'error');
        return;
      }

      // 변환 결과 카드 렌더링
      expressions.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'helper-result-card';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'helper-result-info';

        const enEl = document.createElement('div');
        enEl.className = 'helper-result-en english-font';
        enEl.textContent = item.english;

        const krEl = document.createElement('div');
        krEl.className = 'helper-result-kr';
        krEl.textContent = item.korean;

        infoDiv.appendChild(enEl);
        infoDiv.appendChild(krEl);

        if (item.tip) {
          const tipEl = document.createElement('div');
          tipEl.className = 'helper-result-tip';
          tipEl.textContent = `💡 ${item.tip}`;
          infoDiv.appendChild(tipEl);
        }

        const insertBtn = document.createElement('button');
        insertBtn.className = 'btn-insert';
        insertBtn.type = 'button';
        insertBtn.textContent = '본문에 넣기 ✍️';
        insertBtn.addEventListener('click', () => {
          insertAtCursor(item.english);
        });

        card.appendChild(infoDiv);
        card.appendChild(insertBtn);
        translateResults.appendChild(card);
      });

    } catch (err) {
      console.error('[표현 변환 통신 오류]', err);
      showStatus(translateStatus, '네트워크에 문제가 발생했어. 다시 시도해 줘.', 'error');
    } finally {
      translateSubmitBtn.disabled = false;
      translateSubmitBtn.classList.remove('is-loading');
      translateSubmitBtn.querySelector('.btn-text').textContent = '변환하기';
    }
  });

  // ============================================================================
  // 3. 신규 기능 ②: 영어/한국어 단어 검색 로직
  // ============================================================================
  toggleDictBtn.addEventListener('click', () => {
    const isHidden = dictPanel.classList.contains('hidden');
    // 표현 변환 패널은 닫아주고 단어 사전 패널 토글
    translatePanel.classList.add('hidden');
    toggleTranslateBtn.classList.remove('active');

    if (isHidden) {
      dictPanel.classList.remove('hidden');
      toggleDictBtn.classList.add('active');
      dictInput.focus();
    } else {
      dictPanel.classList.add('hidden');
      toggleDictBtn.classList.remove('active');
    }
  });

  closeDictPanelBtn.addEventListener('click', () => {
    dictPanel.classList.add('hidden');
    toggleDictBtn.classList.remove('active');
  });

  dictInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      dictSubmitBtn.click();
    }
  });

  dictSubmitBtn.addEventListener('click', async () => {
    const word = dictInput.value.trim();
    if (!word) {
      showStatus(dictStatus, '검색할 단어를 먼저 입력해 줘.', 'error');
      dictInput.focus();
      return;
    }

    dictSubmitBtn.disabled = true;
    dictSubmitBtn.classList.add('is-loading');
    dictSubmitBtn.querySelector('.btn-text').textContent = '검색 중...';
    hideStatus(dictStatus);
    dictResults.innerHTML = '';

    try {
      const response = await fetch('/api/lookup-word', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      const resData = await response.json();

      if (!response.ok) {
        const errorMsg = resData?.error?.message || '단어 검색에 실패했어. 다시 시도해 줘.';
        showStatus(dictStatus, errorMsg, 'error');
        return;
      }

      const results = resData.data?.results || [];
      if (results.length === 0) {
        showStatus(dictStatus, '검색 결과가 없어. 다른 단어로 검색해 봐!', 'error');
        return;
      }

      // 검색 결과 카드 렌더링
      results.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'helper-result-card';

        const infoDiv = document.createElement('div');
        infoDiv.className = 'helper-result-info';

        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.alignItems = 'center';

        const wordEl = document.createElement('span');
        wordEl.className = 'helper-result-en english-font';
        wordEl.textContent = item.word;
        topRow.appendChild(wordEl);

        if (item.partOfSpeech) {
          const posEl = document.createElement('span');
          posEl.className = 'helper-pos-tag';
          posEl.textContent = item.partOfSpeech;
          topRow.appendChild(posEl);
        }

        const meaningEl = document.createElement('div');
        meaningEl.className = 'helper-result-kr';
        meaningEl.textContent = item.meaning;

        infoDiv.appendChild(topRow);
        infoDiv.appendChild(meaningEl);

        if (item.example) {
          const exBox = document.createElement('div');
          exBox.className = 'helper-example-box english-font';
          exBox.textContent = `예문: ${item.example}`;
          if (item.exampleMeaning) {
            const exMean = document.createElement('div');
            exMean.style.color = '#777';
            exMean.style.fontSize = '0.78rem';
            exMean.textContent = item.exampleMeaning;
            exBox.appendChild(exMean);
          }
          infoDiv.appendChild(exBox);
        }

        const insertBtn = document.createElement('button');
        insertBtn.className = 'btn-insert';
        insertBtn.type = 'button';
        insertBtn.textContent = '단어 삽입 📥';
        insertBtn.addEventListener('click', () => {
          insertAtCursor(item.word);
        });

        card.appendChild(infoDiv);
        card.appendChild(insertBtn);
        dictResults.appendChild(card);
      });

    } catch (err) {
      console.error('[단어 검색 통신 오류]', err);
      showStatus(dictStatus, '네트워크에 문제가 발생했어. 다시 시도해 줘.', 'error');
    } finally {
      dictSubmitBtn.disabled = false;
      dictSubmitBtn.classList.remove('is-loading');
      dictSubmitBtn.querySelector('.btn-text').textContent = '검색하기';
    }
  });

  // ============================================================================
  // 4. 신규 기능 ③: 교정 하이라이트 & 전후 비교 탭 전환 이벤트
  // ============================================================================
  viewHighlightTab.addEventListener('click', () => {
    viewHighlightTab.classList.add('active');
    viewHighlightTab.setAttribute('aria-selected', 'true');
    viewCompareTab.classList.remove('active');
    viewCompareTab.setAttribute('aria-selected', 'false');

    highlightView.classList.remove('hidden');
    compareView.classList.add('hidden');
  });

  viewCompareTab.addEventListener('click', () => {
    viewCompareTab.classList.add('active');
    viewCompareTab.setAttribute('aria-selected', 'true');
    viewHighlightTab.classList.remove('active');
    viewHighlightTab.setAttribute('aria-selected', 'false');

    compareView.classList.remove('hidden');
    highlightView.classList.add('hidden');
  });

  // ============================================================================
  // 5. 영어 일기/문장 분석 및 교정 요청 로직
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

    // 로딩 상태 시작
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

      console.log('[Dearly 수신 데이터]', resData.data);

      // 교정 및 시각적 하이라이트 렌더링
      renderAnalysisResult(resData.data, trimmedDiary);

      // 성공 시 결과 카드로 부드럽게 스크롤 이동
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('[문장 분석 통신 오류]', err);
      showStatus(diaryStatus, '네트워크에 문제가 발생했어. 인터넷 연결을 확인하고 다시 시도해 줘.', 'error');
    } finally {
      correctBtn.disabled = false;
      correctBtn.classList.remove('is-loading');
      correctBtn.querySelector('.btn-text').textContent = '문장 분석 & 교정하기 ✨';
    }
  });

  /**
   * HTML 특수문자 이스케이프 함수 (XSS 방지)
   */
  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 신규 기능 ③: 교정된 텍스트에서 바뀐 부분을 시각적으로 안전하게 하이라이트하는 함수
   * 줄바꿈과 문단을 완벽히 보존하며, 툴팁에 수정 전 원래 단어(before)를 표시합니다.
   */
  function buildHighlightedHtml(correctedText, changes) {
    if (!changes || changes.length === 0) {
      // 수정된 부분이 없으면 순수 이스케이프 텍스트 반환
      return escapeHtml(correctedText).replace(/\n/g, '<br>');
    }

    // 텍스트를 순차적으로 탐색하며 안전하게 하이라이트 스팬 삽입
    let remaining = correctedText;
    let resultHtml = '';

    // 긴 어구부터 먼저 매칭되도록 정렬
    const sortedChanges = [...changes].sort((a, b) => (b.after || '').length - (a.after || '').length);

    // 단순 정규식 대신 안전한 토큰 치환 방식
    // 각 change에 고유 마커 부여
    const markers = [];
    let markedText = correctedText;

    sortedChanges.forEach((change, idx) => {
      const target = change.after;
      if (!target) return;
      const markerId = `___DEARLY_HIGHLIGHT_${idx}___`;
      const pos = markedText.indexOf(target);
      if (pos !== -1) {
        // 첫 번째 매칭 위치에 마커 삽입
        markedText = markedText.substring(0, pos) + markerId + markedText.substring(pos + target.length);
        markers.push({
          id: markerId,
          before: change.before,
          after: target,
          reason: change.reason,
        });
      }
    });

    // 기본 HTML 이스케이프 및 줄바꿈 처리
    let finalHtml = escapeHtml(markedText).replace(/\n/g, '<br>');

    // 마커들을 실제 <mark> 태그로 안전하게 복원
    markers.forEach((m) => {
      const tooltipAttr = escapeHtml(m.before || '수정 전');
      const innerText = escapeHtml(m.after);
      const highlightSpan = `<mark class="correction-highlight" data-tooltip="${tooltipAttr}" title="${tooltipAttr} ➔ ${innerText}">${innerText}</mark>`;
      finalHtml = finalHtml.replace(m.id, highlightSpan);
    });

    return finalHtml;
  }

  /**
   * 원문과 교정문 나란히 비교 HTML 생성
   */
  function buildCompareHtml(originalText, correctedText, changes) {
    let origHtml = escapeHtml(originalText);
    let corrHtml = escapeHtml(correctedText);

    if (changes && changes.length > 0) {
      changes.forEach((c) => {
        if (c.before && origHtml.includes(c.before)) {
          origHtml = origHtml.replace(c.before, `<del>${escapeHtml(c.before)}</del>`);
        }
        if (c.after && corrHtml.includes(c.after)) {
          corrHtml = corrHtml.replace(c.after, `<ins>${escapeHtml(c.after)}</ins>`);
        }
      });
    }

    return {
      originalHtml: origHtml.replace(/\n/g, '<br>'),
      correctedHtml: corrHtml.replace(/\n/g, '<br>'),
    };
  }

  /**
   * 분석 및 교정 결과 전체 렌더링 함수
   */
  function renderAnalysisResult(data, fallbackEnglish) {
    if (!data) return;

    // 1. 원문 및 자연스러운 한국어 해석 매핑
    const engText = data.original?.english || fallbackEnglish;
    const korText = data.original?.korean || data.original?.translation || '자연스러운 우리말 해석입니다.';
    originalEnglishEl.textContent = engText;
    originalKoreanEl.textContent = korText;

    // 2. 신규 기능 ③: 교정된 텍스트 시각적 하이라이트 렌더링
    const correctedText = data.correctedText || engText;
    const changes = Array.isArray(data.changes) ? data.changes : [];
    
    // 2-1. 하이라이트 뷰 HTML 주입
    correctedTextEl.innerHTML = buildHighlightedHtml(correctedText, changes);

    // 2-2. 전후 비교 뷰 HTML 주입
    const compareObj = buildCompareHtml(engText, correctedText, changes);
    compareOriginalEl.innerHTML = compareObj.originalHtml;
    compareCorrectedEl.innerHTML = compareObj.correctedHtml;

    // 3. 수정 사항 목록 출력 (What changed)
    correctionsListEl.innerHTML = '';
    const corrections = (data.corrections && data.corrections.length > 0) 
      ? data.corrections 
      : changes.map(c => ({ original: c.before, corrected: c.after, reason: c.reason }));

    if (corrections.length === 0) {
      const noChangeItem = document.createElement('div');
      noChangeItem.className = 'correction-item';
      noChangeItem.textContent = '👏 문법이나 표현이 이미 훌륭해요! 수정한 부분 없이 원래 표현을 그대로 살렸어요.';
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
    const similarList = Array.isArray(data.similarExpressions) ? data.similarExpressions : [];

    if (similarList.length === 0) {
      const emptySimilar = document.createElement('div');
      emptySimilar.className = 'section-hint';
      emptySimilar.textContent = '원문과 가장 어울리는 표준 표현입니다.';
      similarListEl.appendChild(emptySimilar);
    } else {
      similarList.forEach((expr, index) => {
        const card = document.createElement('div');
        card.className = 'similar-card';

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

    // 5. 따뜻한 영어 칭찬 출력
    complimentTextEl.textContent = data.compliment ? `"${data.compliment}"` : '"Keep up the wonderful work!"';

    // 결과 카드 보이기
    resultCard.classList.remove('hidden');
  }

  // ============================================================================
  // 6. 피드백 제출 로직
  // ============================================================================
  feedbackSubmitBtn.addEventListener('click', async () => {
    const rawMessage = feedbackInput.value;
    const trimmedMessage = rawMessage.trim();

    if (trimmedMessage.length === 0) {
      showStatus(feedbackStatus, '피드백 내용을 입력해 줘.', 'error');
      feedbackInput.focus();
      return;
    }

    if (trimmedMessage.length > 1000) {
      showStatus(feedbackStatus, '피드백은 1,000자 이내로 작성해 줘.', 'error');
      return;
    }

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

      feedbackInput.value = '';
      feedbackCharCount.textContent = '0';
      showStatus(feedbackStatus, '소중한 피드백 고마워! 아래 목록에 바로 등록되었어. 🎉', 'success');

      await fetchFeedbackList();

    } catch (err) {
      console.error('[피드백 전송 오류]', err);
      showStatus(feedbackStatus, '네트워크에 문제가 발생했어. 잠시 후 다시 시도해 줘.', 'error');
    } finally {
      feedbackSubmitBtn.disabled = false;
      feedbackSubmitBtn.classList.remove('is-loading');
      feedbackSubmitBtn.querySelector('.btn-text').textContent = '피드백 보내기 🚀';
    }
  });

  // ============================================================================
  // 7. 피드백 목록 조회 로직
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

  function renderFeedbackList(items) {
    feedbackItemsEl.innerHTML = '';

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

      const bodyEl = document.createElement('div');
      bodyEl.className = 'feedback-body';
      bodyEl.textContent = item.message;

      const timeEl = document.createElement('div');
      timeEl.className = 'feedback-time';
      timeEl.textContent = formatDate(item.created_at);

      itemEl.appendChild(bodyEl);
      itemEl.appendChild(timeEl);
      feedbackItemsEl.appendChild(itemEl);
    });
  }

  refreshFeedbackBtn.addEventListener('click', fetchFeedbackList);
  fetchFeedbackList();
});
