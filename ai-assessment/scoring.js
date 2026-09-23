/*
 * AI 역량 검사 채점 엔진. 정답 키와 채점 규칙은 이 파일에만 있다.
 *
 * 영역 점수(0~100) = 자기평가 점수 × 0.4 + 객관식 점수 × 0.6
 *   - 자기평가 점수 = (응답 평균 - 1) / 4 × 100
 *   - 객관식 점수   = 정답 수 / 문항 수 × 100
 * 총점 = 5개 영역 점수의 평균
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.AIQ_SCORING = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var ANSWER_KEY = {
    A4: 2, A5: 1, A6: 3,
    B4: 3, B5: 2, B6: 3,
    C4: 4, C5: 1, C6: 3,
    D4: 2, D5: 4, D6: 1,
    E4: 4, E5: 1, E6: 3
  };
  var WEIGHTS = { likert: 0.4, choice: 0.6 };
  // 자기평가가 객관식보다 이만큼 이상 높거나 낮으면 인식 차이로 표시
  var GAP_THRESHOLD = 30;

  var LEVELS = [
    { min: 80, name: '선도', desc: 'AI를 능숙하게 활용하며 동료에게 확산할 수 있는 수준' },
    { min: 60, name: '활용', desc: 'AI를 업무에 안정적으로 활용하는 수준' },
    { min: 40, name: '기초', desc: '기본 개념은 알지만 활용 경험을 넓혀야 하는 수준' },
    { min: 0, name: '입문', desc: 'AI 기본 개념부터 체계적으로 익혀야 하는 수준' }
  ];

  var TIPS = {
    A: '생성형 AI의 작동 원리와 한계(환각, 최신 정보 부족 등)를 다루는 입문 교육을 권장합니다.',
    B: '역할·목적·형식·조건을 담은 프롬프트 작성법과 반복 개선 실습을 권장합니다.',
    C: 'AI 결과물의 사실 확인, 출처 대조, 편향 점검 체크리스트를 업무에 적용해 보세요.',
    D: '사내 AI 사용 가이드라인과 개인정보·기밀 비식별화 교육을 우선 이수하세요.',
    E: '반복 업무 한 가지를 골라 AI로 시범 개선하고 성과를 측정·공유해 보세요.'
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
      var wrong = choice.filter(function (it) { return sheet.responses[it.id] !== ANSWER_KEY[it.id]; })
        .map(function (it) { return it.id; });
      var correct = choice.length - wrong.length;
      var testScore = correct / choice.length * 100;
      var total = selfScore * WEIGHTS.likert + testScore * WEIGHTS.choice;

      var gap = selfScore - testScore;
      var gapNote = gap >= GAP_THRESHOLD ? '자기평가가 실제 문제 풀이보다 높습니다 (과대평가 가능성).'
        : gap <= -GAP_THRESHOLD ? '실제 역량에 비해 자기평가가 낮습니다 (자신감 보완 필요).' : '';

      var score = round1(total);
      return {
        id: d.id, name: d.name, desc: d.desc,
        score: score, level: levelOf(score).name,
        selfScore: round1(selfScore), testScore: round1(testScore),
        correct: correct, choiceCount: choice.length, wrongItems: wrong,
        gapNote: gapNote, tip: TIPS[d.id]
      };
    });

    var total = round1(domains.reduce(function (s, d) { return s + d.score; }, 0) / domains.length);
    var sorted = domains.slice().sort(function (a, b) { return b.score - a.score; });
    var lvl = levelOf(total);

    return {
      ok: true,
      meta: sheet.meta,
      total: total,
      level: lvl.name,
      levelDesc: lvl.desc,
      domains: domains,
      // 모든 영역 점수가 같으면 강점/보완점을 따로 두지 않는다
      strength: sorted[0].score === sorted[sorted.length - 1].score ? null : sorted[0].name,
      weakness: sorted[0].score === sorted[sorted.length - 1].score ? null : sorted[sorted.length - 1].name
    };
  }

  return { score: score, validate: validate, levelOf: levelOf, LEVELS: LEVELS, ANSWER_KEY: ANSWER_KEY };
});
