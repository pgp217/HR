/*
 * AI 역량 검사 채점 엔진. 정답 키와 채점 규칙은 이 파일에만 있다.
 *
 * 영역 점수(0~100) = 자기평가 점수 × 0.4 + 객관식 점수 × 0.6
 *   - 자기평가 점수 = (응답 평균 - 1) / 4 × 100
 *   - 객관식 점수   = 정답 수 / 문항 수 × 100
 * 총점 = 5개 영역 점수의 평균
 * 수준 구분은 교재 부록 E(자가 진단)의 총점 비율(50/61, 40/61, 30/61, 20/61)을 따른다.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.AIQ_SCORING = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var ANSWER_KEY = {
    A5: 2, A6: 1, A7: 4, A8: 3,
    B5: 2, B6: 4, B7: 1, B8: 3,
    C5: 2, C6: 3, C7: 1, C8: 4,
    D5: 4, D6: 2, D7: 1, D8: 3,
    E5: 1, E6: 2, E7: 3, E8: 4
  };
  var WEIGHTS = { likert: 0.4, choice: 0.6 };
  // 자기평가가 객관식보다 이만큼 이상 높거나 낮으면 인식 차이로 표시
  var GAP_THRESHOLD = 30;
  // 자기평가 응답이 이 값 이하인 문항의 챕터는 복습 대상에 넣는다
  var LOW_LIKERT = 2;

  var LEVELS = [
    { min: 80, name: '전문가', desc: 'AI 활용에 능숙하며 다른 사람을 가르칠 준비가 된 수준입니다.' },
    { min: 65, name: '고급', desc: '실전에서 AI를 효과적으로 활용할 수 있는 수준입니다.' },
    { min: 50, name: '중급', desc: '기본기는 갖췄으나 심화 학습이 필요한 수준입니다.' },
    { min: 33, name: '초급', desc: '핵심 챕터를 다시 복습해야 하는 수준입니다.' },
    { min: 0, name: '입문', desc: '교재를 처음부터 차근차근 학습해야 하는 수준입니다.' }
  ];
  // 이 점수 미만인 영역은 보완 필요로 본다
  var NEEDS_WORK_BELOW = 50;

  // 교재 부록 E '영역별 취약점 보완' 기준
  var TIPS = {
    A: '다음 토큰 예측과 환각의 원리, 도구별 특징과 선택 기준을 복습하세요.',
    B: '5요소 프레임워크(맥락·역할·과업·제약·형식)와 Few-shot, 반복 개선 방법을 실습하세요.',
    C: "'초안은 AI, 최종은 사람' 원칙으로 자기 업무 한 가지에 AI를 적용해 보세요.",
    D: "환각 검증 5단계와 '의심한 부분 3가지' 기법, 입력 전 보안 체크리스트를 습관화하세요.",
    E: '비판적 사고 워크플로우와 인간-AI 협업 모델을 익히고, 월 1회 자가 점검을 권장합니다.'
  };

  function levelOf(score) {
    for (var i = 0; i < LEVELS.length; i++) if (score >= LEVELS[i].min) return LEVELS[i];
    return LEVELS[LEVELS.length - 1];
  }

  function round1(x) { return Math.round(x * 10) / 10; }

  // 응답 값 검증. 반환: 오류 메시지 배열 (없으면 빈 배열)
  function validate(itemsDef, sheet) {
    var errors = [];
    if (sheet.format !== itemsDef.version) {
      errors.push('결과지 형식(' + sheet.format + ')이 현재 검사 버전(' + itemsDef.version + ')과 다릅니다.');
    }
    itemsDef.items.forEach(function (it) {
      var v = sheet.responses[it.id];
      var max = it.type === 'likert' ? 5 : it.options.length;
      if (v == null) errors.push(it.id + ' 문항에 응답이 없습니다.');
      else if (!(Number.isInteger(v) && v >= 1 && v <= max)) {
        errors.push(it.id + ' 문항의 응답(' + v + ')이 1~' + max + ' 범위를 벗어났습니다.');
      }
    });
    return errors;
  }

  // sheet: AIQ_SHEET.readResultSheet() 결과. 오류가 있으면 { ok: false, errors }
  function score(itemsDef, sheet) {
    var errors = validate(itemsDef, sheet);
    if (errors.length) return { ok: false, errors: errors, meta: sheet.meta };

    var domains = itemsDef.domains.map(function (d) {
      var its = itemsDef.items.filter(function (it) { return it.domain === d.id; });
      var likert = its.filter(function (it) { return it.type === 'likert'; });
      var choice = its.filter(function (it) { return it.type === 'choice'; });

      var likertAvg = likert.reduce(function (s, it) { return s + sheet.responses[it.id]; }, 0) / likert.length;
      var selfScore = (likertAvg - 1) / 4 * 100;
      var wrong = choice.filter(function (it) { return sheet.responses[it.id] !== ANSWER_KEY[it.id]; });
      var correct = choice.length - wrong.length;
      var testScore = correct / choice.length * 100;
      var total = round1(selfScore * WEIGHTS.likert + testScore * WEIGHTS.choice);

      var gap = selfScore - testScore;
      var gapNote = gap >= GAP_THRESHOLD ? '자기평가가 실제 문제 풀이보다 높습니다 (과대평가 가능성).'
        : gap <= -GAP_THRESHOLD ? '실제 역량에 비해 자기평가가 낮습니다 (자신감 보완 필요).' : '';

      // 오답 문항과 자기평가가 낮은 문항의 출처 챕터 (교재 순서대로, 중복 제거)
      var weakItems = wrong.concat(likert.filter(function (it) { return sheet.responses[it.id] <= LOW_LIKERT; }));
      var review = Object.keys(itemsDef.chapters).filter(function (ch) {
        return weakItems.some(function (it) { return it.ch === ch; });
      }).map(function (ch) {
        return { id: ch, title: itemsDef.chapters[ch].title, url: itemsDef.chapters[ch].url };
      });

      return {
        id: d.id, name: d.name, part: d.part, desc: d.desc,
        score: total, level: levelOf(total).name,
        selfScore: round1(selfScore), testScore: round1(testScore),
        correct: correct, choiceCount: choice.length,
        wrongItems: wrong.map(function (it) { return it.id; }),
        gapNote: gapNote, tip: TIPS[d.id], review: review
      };
    });

    var total = round1(domains.reduce(function (s, d) { return s + d.score; }, 0) / domains.length);
    var sorted = domains.slice().sort(function (a, b) { return b.score - a.score; });
    var flat = sorted[0].score === sorted[sorted.length - 1].score;
    var weakness = flat ? null : sorted[sorted.length - 1].name;
    domains.forEach(function (d) { d.needsWork = d.score < NEEDS_WORK_BELOW || d.name === weakness; });
    var lvl = levelOf(total);

    return {
      ok: true,
      meta: sheet.meta,
      total: total,
      level: lvl.name,
      levelDesc: lvl.desc,
      domains: domains,
      // 모든 영역 점수가 같으면 강점/보완점을 따로 두지 않는다
      strength: flat ? null : sorted[0].name,
      weakness: weakness
    };
  }

  return { score: score, validate: validate, levelOf: levelOf, LEVELS: LEVELS, ANSWER_KEY: ANSWER_KEY };
});
