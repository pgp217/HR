/*
 * AI 역량 검사 문항 정의 (정답 키는 scoring.js 에만 둔다).
 * 교재: genai-book https://zakedu.github.io/genai-book/
 *   - 영역은 교재 Part 1~5, 자기평가 문항은 부록 E(자가 진단)를 바탕으로 한다.
 *   - 모든 문항에 출처 챕터(ch)를 표시한다.
 * 브라우저에서는 window.AIQ_ITEMS, Node 에서는 require() 로 사용한다.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.AIQ_ITEMS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var LIKERT = ['전혀 그렇지 않다', '그렇지 않다', '보통이다', '그렇다', '매우 그렇다'];
  var BOOK_URL = 'https://zakedu.github.io/genai-book/';

  var chapters = {
    ch01: { title: 'Chapter 1 생성형 AI란', path: 'part1/ch01-what-is-genai/' },
    ch02: { title: 'Chapter 2 주요 도구와 생태계', path: 'part2/ch02-tools-ecosystem/' },
    ch03: { title: 'Chapter 3 프롬프트의 구조', path: 'part2/ch03-prompt-structure/' },
    ch04: { title: 'Chapter 4 고급 프롬프팅 기법', path: 'part2/ch04-advanced-prompting/' },
    ch05: { title: 'Chapter 5 반복 개선의 방법론', path: 'part2/ch05-iteration/' },
    ch06: { title: 'Chapter 6 학습과 연구', path: 'part3/ch06-learning-research/' },
    ch07: { title: 'Chapter 7 업무와 비즈니스', path: 'part3/ch07-business/' },
    ch08: { title: 'Chapter 8 창작과 콘텐츠', path: 'part3/ch08-creative/' },
    ch09: { title: 'Chapter 9 환각의 이해와 대응', path: 'part4/ch09-hallucination/' },
    ch10: { title: 'Chapter 10 윤리적 사용과 책임', path: 'part4/ch10-ethics/' },
    ch11: { title: 'Chapter 11 책임 있는 AI 사용', path: 'part4/ch11-responsible-use/' },
    ch12: { title: 'Chapter 12 AI 시대의 핵심 역량', path: 'part5/ch12-core-competencies/' },
    ch13: { title: 'Chapter 13 기술 트렌드와 전망', path: 'part5/ch13-future-trends/' }
  };
  Object.keys(chapters).forEach(function (k) { chapters[k].url = BOOK_URL + chapters[k].path; });

  var domains = [
    { id: 'A', name: 'AI 이해', part: 'Part 1 이해', desc: '생성형 AI의 작동 원리와 한계, 도구별 특징을 이해하는 정도' },
    { id: 'B', name: '프롬프트 원리', part: 'Part 2 원리', desc: '5요소 프롬프트, 고급 기법, 반복 개선으로 원하는 결과를 얻는 능력' },
    { id: 'C', name: '실전 활용', part: 'Part 3 활용', desc: '학습·연구, 업무, 창작에 AI를 실제로 적용하는 능력' },
    { id: 'D', name: '위험관리·책임', part: 'Part 4 위험관리', desc: '환각 검증, 편향·저작권·개인정보 대응, 책임 있는 사용' },
    { id: 'E', name: '미래 역량', part: 'Part 5 미래', desc: '비판적 사고, 인간-AI 협업 설계, 기술·규제 변화에 대한 지속 학습' }
  ];

  var items = [
    // A. AI 이해 (Chapter 1-2)
    { id: 'A1', domain: 'A', ch: 'ch01', type: 'likert', text: "나는 생성형 AI가 '다음 토큰 예측'으로 답변을 만든다는 것을 동료에게 설명할 수 있다." },
    { id: 'A2', domain: 'A', ch: 'ch01', type: 'likert', text: "나는 AI가 '사실을 아는 것'과 '그럴듯한 텍스트를 생성하는 것'의 차이를 이해하고 있다." },
    { id: 'A3', domain: 'A', ch: 'ch02', type: 'likert', text: '나는 토큰과 컨텍스트 윈도우가 무엇이고 왜 중요한지 알고 있다.' },
    { id: 'A4', domain: 'A', ch: 'ch02', type: 'likert', text: '나는 작업 목적에 맞는 AI 도구를 골라 쓸 수 있다.' },
    { id: 'A5', domain: 'A', ch: 'ch01', type: 'choice', text: 'AI 기술의 포함 관계를 바르게 나타낸 것은?',
      options: ['생성형 AI ⊃ 딥러닝 ⊃ 머신러닝 ⊃ AI', 'AI ⊃ 머신러닝 ⊃ 딥러닝 ⊃ 생성형 AI', '머신러닝 ⊃ AI ⊃ 생성형 AI ⊃ 딥러닝', 'AI ⊃ 생성형 AI ⊃ 머신러닝 ⊃ 딥러닝'] },
    { id: 'A6', domain: 'A', ch: 'ch01', type: 'choice', text: '대규모 언어 모델(LLM)에 대한 설명으로 가장 적절한 것은?',
      options: ['학습한 패턴을 바탕으로 다음 토큰을 확률적으로 예측해 텍스트를 생성한다', '질문마다 데이터베이스에서 검증된 사실을 찾아 그대로 답한다', '사실 여부를 스스로 판단하는 장치가 있어 틀린 답을 하지 않는다', '사용자의 개인 일정과 파일 내용을 자동으로 알고 있다'] },
    { id: 'A7', domain: 'A', ch: 'ch01', type: 'choice', text: '생성형 AI의 근본적인 한계에 해당하지 않는 것은?',
      options: ['학습 시점 이후의 정보를 모를 수 있다', '여러 단계의 복잡한 계산에서 오류가 날 수 있다', '상관관계와 인과관계를 혼동할 수 있다', '문서 요약이나 형식 변환을 할 수 없다'] },
    { id: 'A8', domain: 'A', ch: 'ch02', type: 'choice', text: '100페이지가 넘는 계약서 전체를 나누지 않고 한 번에 분석하려 한다. 도구를 고를 때 가장 먼저 따져야 할 것은?',
      options: ['도구의 전체 사용자 수', '이미지 생성 기능이 있는지', '컨텍스트 윈도우(한 번에 처리할 수 있는 텍스트 길이)', '앱 화면 디자인'] },

    // B. 프롬프트 원리 (Chapter 3-5)
    { id: 'B1', domain: 'B', ch: 'ch03', type: 'likert', text: '나는 맥락·역할·과업·제약·형식의 5요소를 갖춘 프롬프트를 쓸 수 있다.' },
    { id: 'B2', domain: 'B', ch: 'ch04', type: 'likert', text: '나는 상황에 따라 Zero-shot(지시만)과 Few-shot(예시 제공)을 골라 쓴다.' },
    { id: 'B3', domain: 'B', ch: 'ch04', type: 'likert', text: '나는 복잡한 문제에 단계별 추론(Chain of Thought)이나 프롬프트 체이닝을 활용한다.' },
    { id: 'B4', domain: 'B', ch: 'ch05', type: 'likert', text: '나는 응답이 불만족스러우면 원인을 분석하고 구체적인 피드백으로 반복 개선한다.' },
    { id: 'B5', domain: 'B', ch: 'ch03', type: 'choice', text: '다음 프롬프트에서 5요소 중 빠진 것은? "당신은 10년 경력의 HR 담당자입니다. 신입사원 온보딩 안내 메일을 작성해 주세요. 300자 이내, 친근한 톤으로."',
      options: ['역할과 과업', '맥락과 형식', '과업과 제약', '역할과 제약'] },
    { id: 'B6', domain: 'B', ch: 'ch04', type: 'choice', text: "고객 문의를 '칭찬/불만/문의' 중 하나로 분류하게 했는데 결과 형식이 매번 달라진다. 가장 효과적인 개선 방법은?",
      options: ['"정확하게 분류해"라고 강조한다', '역할을 "분류 전문가"로 바꾼다', 'Temperature를 최대로 올린다', '유형별로 형식이 일관된 분류 예시를 2~3개씩 넣는다(Few-shot)'] },
    { id: 'B7', domain: 'B', ch: 'ch04', type: 'choice', text: '"당신은 노무사입니다"처럼 AI에 역할을 부여했을 때에 대한 설명으로 옳은 것은?',
      options: ['답변의 톤과 관점은 바뀌지만 실제 전문 지식이 생기는 것은 아니므로 중요한 내용은 전문가 검토가 필요하다', '해당 자격을 갖춘 전문가 수준의 정확성이 보장된다', '역할을 부여하면 환각이 사라진다', '역할 부여는 결과에 아무런 영향을 주지 않는다'] },
    { id: 'B8', domain: 'B', ch: 'ch05', type: 'choice', text: 'AI가 만든 보고서 초안이 기대와 다를 때 가장 효과적인 후속 요청은?',
      options: ['"별로야, 다시 해"라고만 한다', '떠오르는 수정 사항을 한 번에 모두 몰아서 요청한다', '무엇이(What) 왜(Why) 문제인지, 어떻게(How) 바꿀지 구체적으로 알려 준다', '새 대화창을 열어 처음 프롬프트를 그대로 다시 입력한다'] },

    // C. 실전 활용 (Chapter 6-8)
    { id: 'C1', domain: 'C', ch: 'ch06', type: 'likert', text: '나는 AI로 어려운 개념을 내 수준에 맞게 설명받거나 긴 문서를 목적에 맞게 요약할 수 있다.' },
    { id: 'C2', domain: 'C', ch: 'ch07', type: 'likert', text: '나는 이메일·보고서·회의록 같은 업무 문서의 초안 작성에 AI를 활용한다.' },
    { id: 'C3', domain: 'C', ch: 'ch07', type: 'likert', text: '나는 AI가 만든 업무 결과물의 최종 책임이 나에게 있음을 알고 직접 검토한 뒤 사용한다.' },
    { id: 'C4', domain: 'C', ch: 'ch08', type: 'likert', text: '나는 AI 결과물을 시작점으로만 쓰고 나만의 관점과 표현을 더한다.' },
    { id: 'C5', domain: 'C', ch: 'ch07', type: 'choice', text: '팀장이 "다음 주 임원 보고용 분기 실적 보고서를 AI로 빨리 만들어 달라"고 했다. 업무 활용 원칙에 가장 맞는 방법은?',
      options: ['미공개 재무 수치를 외부 AI에 그대로 넣어 완성본을 받는다', '공개 가능한 정보로 구조와 초안을 AI에 맡기고, 수치 확인과 최종 문장은 직접 마무리한다', 'AI가 만든 보고서를 그대로 올리고 문제가 생기면 AI의 오류라고 설명한다', 'AI는 믿을 수 없으니 처음부터 전부 직접 작성한다'] },
    { id: 'C6', domain: 'C', ch: 'ch06', type: 'choice', text: "조사·연구에 AI를 쓸 때 '안전한 활용'에 해당하는 것은?",
      options: ['AI가 추천한 논문을 확인 없이 참고문헌에 넣는다', 'AI가 알려 준 통계를 검증 없이 보고서에 인용한다', '검색 키워드를 넓히거나 낯선 개념을 이해하는 데 활용한다', 'AI 답변을 그대로 결과물로 제출한다'] },
    { id: 'C7', domain: 'C', ch: 'ch07', type: 'choice', text: '외부 AI 서비스로 회의록을 정리하려 한다. 입력하기 전에 가장 먼저 할 일은?',
      options: ['참석자 연락처, 미공개 계약 조건 같은 민감 정보를 지우거나 가명 처리한다', '회의록을 최대한 길게 늘려 맥락을 충분히 준다', '여러 AI 도구에 같은 원본을 모두 넣어 결과를 비교한다', 'AI를 사용한다는 사실을 참석자에게 알리지 않는다'] },
    { id: 'C8', domain: 'C', ch: 'ch08', type: 'choice', text: 'AI로 사내 캠페인 문구와 이미지를 만들 때 창작 원칙에 맞지 않는 것은?',
      options: ['필요한 경우 AI 활용 사실을 밝힌다', 'AI 결과물을 시작점으로 삼아 우리 조직의 목소리로 다듬는다', '도구의 이용약관과 상업적 이용 가능 범위를 확인한다', '특정 작가 이름을 프롬프트에 넣어 그 화풍을 그대로 따라 한 이미지를 쓴다'] },

    // D. 위험관리·책임 (Chapter 9-11)
    { id: 'D1', domain: 'D', ch: 'ch09', type: 'likert', text: '나는 AI 답변의 수치·인용·출처를 독립적인 출처 2개 이상으로 교차 검증한다.' },
    { id: 'D2', domain: 'D', ch: 'ch10', type: 'likert', text: '나는 개인정보나 회사 기밀을 외부 AI 서비스에 입력하지 않는다.' },
    { id: 'D3', domain: 'D', ch: 'ch10', type: 'likert', text: '나는 AI 출력에 성별·연령·문화적 편향이 있는지 의식적으로 점검한다.' },
    { id: 'D4', domain: 'D', ch: 'ch11', type: 'likert', text: '나는 필요한 경우 AI를 사용했다는 사실과 검증 방법을 밝힌다.' },
    { id: 'D5', domain: 'D', ch: 'ch09', type: 'choice', text: '다음 중 환각(Hallucination) 위험이 가장 높은 요청은?',
      options: ['"제2차 세계대전은 언제 끝났어?"', '"이 이메일 문장을 더 정중하게 다듬어 줘"', '"워크숍 아이디어 10개를 브레인스토밍해 줘"', '"2023년 3분기 A사 ○○공장의 월별 불량률과 근거 논문을 알려 줘"'] },
    { id: 'D6', domain: 'D', ch: 'ch09', type: 'choice', text: 'AI 결과물이 세련되고 그럴듯할수록 사람이 비판 없이 받아들이게 되는 경향을 무엇이라 하는가?',
      options: ['확증 편향', '자동화 편향', '선택 편향', '생존자 편향'] },
    { id: 'D7', domain: 'D', ch: 'ch10', type: 'choice', text: '과거 10년간 합격자 데이터로 학습한 채용 AI가 특정 성별 지원자에게 낮은 점수를 주었다. 원인으로 가장 적절한 것은?',
      options: ['과거 채용 데이터에 담긴 역사적 편향을 AI가 그대로 학습했다', 'AI가 스스로 차별하기로 판단했다', '프롬프트가 너무 길었다', '해당 성별 지원자의 역량이 실제로 낮았다'] },
    { id: 'D8', domain: 'D', ch: 'ch10', type: 'choice', text: 'AI를 활용해 만든 보고서에 첨부하는 성실성 선언(Diligence Statement)의 3요소는?',
      options: ['사용 요금, 사용 시간, 사용 도구', 'AI 도구 추천, 경쟁사 비교, 향후 계획', 'AI 역할 인정, 검증 방법, 최종 책임 선언', '작성자 서명, 결재선, 보안 등급'] },

    // E. 미래 역량 (Chapter 12-13)
    { id: 'E1', domain: 'E', ch: 'ch12', type: 'likert', text: '나는 AI 출력에 "사실일까? 출처는 믿을 만한가?" 같은 검증 질문을 습관적으로 던진다.' },
    { id: 'E2', domain: 'E', ch: 'ch12', type: 'likert', text: '나는 복잡한 업무를 사람과 AI의 역할로 나눈 워크플로우로 설계할 수 있다.' },
    { id: 'E3', domain: 'E', ch: 'ch12', type: 'likert', text: '나는 동료에게 AI 활용법을 알려 줄 수 있다.' },
    { id: 'E4', domain: 'E', ch: 'ch13', type: 'likert', text: '나는 AI 에이전트, 멀티모달 같은 새 기술과 AI 규제 동향을 꾸준히 학습한다.' },
    { id: 'E5', domain: 'E', ch: 'ch12', type: 'choice', text: "AI 시대 역량 분류에서 AI가 대체하기 가장 어려운 '대체 불가 역량'에 해당하는 것은?",
      options: ['윤리적 판단과 공감', '단순 데이터 입력', '정형화된 보고서 작성', '기본 번역'] },
    { id: 'E6', domain: 'E', ch: 'ch13', type: 'choice', text: '목표를 받으면 스스로 계획을 세우고 도구를 사용해 여러 단계 작업을 수행하는 AI 에이전트에 대한 설명으로 옳은 것은?',
      options: ['자율성이 높을수록 사람의 감독은 필요 없어진다', '자율성이 높을수록 사람의 감독 품질이 더 중요해진다', '질문 하나에 답변 하나만 하는 반응형 AI다', '웹 검색이나 코드 실행 같은 도구는 사용할 수 없다'] },
    { id: 'E7', domain: 'E', ch: 'ch12', type: 'choice', text: "인간-AI 협업 모델 중 'AI 제안형'에 해당하는 것은?",
      options: ['사람이 기획하고 AI가 초안을 쓰면 사람이 완성한다', '사람은 창의적 판단, AI는 분석적 처리를 맡아 계속 주고받는다', 'AI가 여러 안을 제시하면 사람이 선택하고 함께 발전시킨다', 'AI가 모든 결정을 내리고 사람은 결과만 받는다'] },
    { id: 'E8', domain: 'E', ch: 'ch13', type: 'choice', text: 'AI 규제 동향에 대한 설명으로 옳은 것은?',
      options: ['모든 나라가 동일한 AI 규제를 시행하고 있다', 'AI 규제는 기업에만 해당하므로 직원 개인의 AI 사용과는 무관하다', 'AI로 만든 콘텐츠는 어떤 경우에도 표시 의무가 없다', 'EU AI Act는 금지 조항부터 단계적으로 시행되며, 고위험 시스템에는 더 엄격한 의무가 적용된다'] }
  ];

  return { version: 'AIQ-v2', bookUrl: BOOK_URL, likertLabels: LIKERT, chapters: chapters, domains: domains, items: items };
});
