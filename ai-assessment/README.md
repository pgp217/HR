# AI 역량 검사

직원 대상 AI 역량 검사 → 결과지 파일(CSV) → 업로드 채점까지의 흐름입니다. 서버 없이 브라우저만으로 동작합니다.

[genai-book 교재](https://zakedu.github.io/genai-book/)를 바탕으로 합니다. 영역은 교재 Part 1~5, 자기평가 문항은 부록 E(자가 진단), 수준 구분은 부록 E의 총점 비율을 따르며, 모든 문항에 출처 챕터가 표시되어 있습니다.

```
test.html  ──(응시)──▶  AI역량검사_결과지_홍길동_2026-09-23.csv  ──(업로드)──▶  score.html (점수·결과 리포트)
```

| 파일 | 역할 |
|---|---|
| `items.js` | 문항 40개 (5개 영역 × 자기평가 4 + 객관식 4), 문항별 출처 챕터와 교재 링크. 정답은 없음 |
| `sheet.js` | 결과지 CSV 만들기 / 읽기 |
| `scoring.js` | 정답 키, 채점 규칙, 수준 판정, 영역별 추천과 복습할 장 |
| `test.html` | 응시 페이지. 제출하면 결과지 파일을 내려받음 |
| `score.html` | 채점 페이지. 결과지 여러 개를 올리면 개인별 리포트, 전체 요약, 요약 CSV를 제공 |
| `test/` | 채점 로직 단위 테스트 (`node --test ai-assessment/test/*.test.mjs`) |

## 검사 구성

| 영역 | 교재 | 측정 내용 |
|---|---|---|
| A. AI 이해 | Part 1 (Ch 1-2) | 다음 토큰 예측, 한계, 토큰·컨텍스트 윈도우, 도구 선택 |
| B. 프롬프트 원리 | Part 2 (Ch 3-5) | 5요소 프레임워크, Few-shot·CoT·역할 부여, 반복 개선 |
| C. 실전 활용 | Part 3 (Ch 6-8) | 학습·연구, 업무 문서, 창작 활용과 그 원칙 |
| D. 위험관리·책임 | Part 4 (Ch 9-11) | 환각 검증, 자동화 편향, 편향·저작권·개인정보, 성실성 선언 |
| E. 미래 역량 | Part 5 (Ch 12-13) | 대체 불가 역량, 인간-AI 협업 모델, 에이전트, 규제 동향 |

- 자기평가: 5점 척도 (전혀 그렇지 않다 ~ 매우 그렇다)
- 객관식: 4지선다, 정답 1개

## 채점 규칙

- 자기평가 점수 = (응답 평균 − 1) ÷ 4 × 100
- 객관식 점수 = 정답 수 ÷ 4 × 100
- **영역 점수** = 자기평가 × 0.4 + 객관식 × 0.6
- **총점** = 5개 영역 점수의 평균 (0~100)
- 수준 (교재 부록 E 기준): 80 이상 **전문가** · 65 이상 **고급** · 50 이상 **중급** · 33 이상 **초급** · 33 미만 **입문**
- **복습할 장**: 영역마다 틀린 객관식 문항과 자기평가 2점 이하 문항의 출처 챕터를 교재 링크로 안내합니다.
- 자기평가와 객관식 점수 차이가 30점 이상이면 과대/과소평가 가능성을 표시합니다.

가중치, 기준 점수, 추천 문구는 `scoring.js` 맨 위에서 바꿀 수 있습니다.

## 결과지 파일 형식 (`AIQ-v2`)

UTF-8(BOM 포함) CSV이며, 엑셀에서 바로 열립니다. `label` 열은 사람이 읽기 위한 설명이고 채점에는 쓰지 않습니다.

```csv
key,value,label
format,AIQ-v2,결과지 형식
name,홍길동,이름
employee_id,E1234,사번
department,인사팀,부서
submitted_at,2026-09-23T10:00:00+09:00,제출 시각
A1,4,나는 생성형 AI가 '다음 토큰 예측'으로 ...   ← 자기평가 1~5
A5,2,AI 기술의 포함 관계를 바르게 ...           ← 객관식 보기 번호 1~4
...
```

채점할 때 확인하는 것: `format` 버전 일치(이전 v1 결과지는 거부), 40문항 모두 응답, 응답 값 범위. 문제가 있으면 어느 문항인지 알려 줍니다.

## 기존 웹 앱에 붙이기

`items.js`, `sheet.js`, `scoring.js`는 의존성 없는 순수 JS이며 브라우저(`<script>` → `window.AIQ_*`)와 Node(`require`) 모두에서 동작합니다.

```js
const def = require('./items.js');
const { readResultSheet } = require('./sheet.js');
const { score } = require('./scoring.js');

const result = score(def, readResultSheet(csvText));
if (!result.ok) console.log(result.errors);
else console.log(result.total, result.level, result.domains);
```

반환값 예시:

```js
{
  ok: true,
  meta: { name, employee_id, department, submitted_at },
  total: 72.5, level: '고급', levelDesc: '...',
  strength: '위험관리·책임', weakness: '프롬프트 원리',   // 모든 영역이 같으면 null
  domains: [{ id: 'A', name: 'AI 이해', part: 'Part 1 이해', score, level, selfScore, testScore,
              correct, choiceCount, wrongItems: ['A5'], gapNote, tip, needsWork,
              review: [{ id: 'ch01', title: 'Chapter 1 생성형 AI란', url: 'https://...' }] }, ...]
}
```

## 참고

- 정답 키는 `scoring.js`에만 있습니다. 채점 페이지를 응시자에게 공개하면 정답이 노출되므로, 실제 운영 시 채점은 서버에서 하거나 채점 페이지 접근을 제한하세요.
- 결과지는 CSV라 응시자가 엑셀로 수정할 수 있습니다. 위변조 방지가 필요하면 서버 제출 방식이나 서명 추가를 검토하세요.
