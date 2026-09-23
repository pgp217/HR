# AI 역량 검사

직원 대상 AI 역량 검사 → 결과지 파일(CSV) → 업로드 채점까지의 흐름입니다. 서버 없이 브라우저만으로 동작합니다.

```
test.html  ──(응시)──▶  AI역량검사_결과지_홍길동_2026-09-23.csv  ──(업로드)──▶  score.html (점수·결과 리포트)
```

| 파일 | 역할 |
|---|---|
| `items.js` | 문항 30개 (5개 영역 × 자기평가 3 + 객관식 3). 정답은 없음 |
| `sheet.js` | 결과지 CSV 만들기 / 읽기 |
| `scoring.js` | 정답 키, 채점 규칙, 수준 판정, 영역별 추천 |
| `test.html` | 응시 페이지. 제출하면 결과지 파일을 내려받음 |
| `score.html` | 채점 페이지. 결과지 여러 개를 올리면 개인별 리포트, 전체 요약, 요약 CSV를 제공 |
| `test/` | 채점 로직 단위 테스트 (`node --test ai-assessment/test/*.test.js`) |

## 검사 구성

| 영역 | 측정 내용 |
|---|---|
| A. AI 이해 | 작동 원리, 도구 종류, 한계(환각 등) |
| B. 프롬프트 활용 | 구체적 지시, 반복 개선 |
| C. 결과 검증 | 사실 확인, 출처 대조, 편향 점검 |
| D. AI 윤리·보안 | 개인정보·기밀, 저작권, 사내 규정 |
| E. 업무 적용 | 효율화 대상 발굴, 시범 도입, 성과 측정 |

- 자기평가: 5점 척도 (전혀 그렇지 않다 ~ 매우 그렇다)
- 객관식: 4지선다, 정답 1개

## 채점 규칙

- 자기평가 점수 = (응답 평균 − 1) ÷ 4 × 100
- 객관식 점수 = 정답 수 ÷ 3 × 100
- **영역 점수** = 자기평가 × 0.4 + 객관식 × 0.6
- **총점** = 5개 영역 점수의 평균 (0~100)
- 수준: 80 이상 **선도** · 60 이상 **활용** · 40 이상 **기초** · 40 미만 **입문**
- 자기평가와 객관식 점수 차이가 30점 이상이면 과대/과소평가 가능성을 표시합니다.

가중치, 기준 점수, 추천 문구는 `scoring.js` 맨 위에서 바꿀 수 있습니다.

## 결과지 파일 형식 (`AIQ-v1`)

UTF-8(BOM 포함) CSV이며, 엑셀에서 바로 열립니다. `label` 열은 사람이 읽기 위한 설명이고 채점에는 쓰지 않습니다.

```csv
key,value,label
format,AIQ-v1,결과지 형식
name,홍길동,이름
employee_id,E1234,사번
department,인사팀,부서
submitted_at,2026-09-23T10:00:00+09:00,제출 시각
A1,4,나는 생성형 AI가 어떤 원리로 ...      ← 자기평가 1~5
A4,2,대규모 언어모델(LLM)이 답변을 ...      ← 객관식 보기 번호 1~4
...
```

채점할 때 확인하는 것: `format` 버전 일치, 30문항 모두 응답, 응답 값 범위. 문제가 있으면 어느 문항인지 알려 줍니다.

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
  total: 72.5, level: '활용', levelDesc: '...',
  strength: 'AI 윤리·보안', weakness: '프롬프트 활용',   // 모든 영역이 같으면 null
  domains: [{ id: 'A', name: 'AI 이해', score, level, selfScore, testScore,
              correct, choiceCount, wrongItems: ['A5'], gapNote, tip }, ...]
}
```

## 참고

- 정답 키는 `scoring.js`에만 있습니다. 채점 페이지를 응시자에게 공개하면 정답이 노출되므로, 실제 운영 시 채점은 서버에서 하거나 채점 페이지 접근을 제한하세요.
- 결과지는 CSV라 응시자가 엑셀로 수정할 수 있습니다. 위변조 방지가 필요하면 서버 제출 방식이나 서명 추가를 검토하세요.
