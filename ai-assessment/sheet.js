/*
 * 결과지 파일(CSV) 만들기/읽기.
 *
 * 형식 (UTF-8 BOM, 3열: key,value,label — label 은 사람이 읽기 위한 설명이며 채점에 쓰지 않는다)
 *   key,value,label
 *   format,AIQ-v1,결과지 형식
 *   name,홍길동,이름
 *   employee_id,E1234,사번
 *   department,인사팀,부서
 *   submitted_at,2026-09-23T10:00:00+09:00,제출 시각
 *   A1,4,<문항 내용>          <- 자기평가: 1~5
 *   A4,2,<문항 내용>          <- 객관식: 선택한 보기 번호 1~4
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.AIQ_SHEET = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  var META_FIELDS = [
    ['name', '이름'],
    ['employee_id', '사번'],
    ['department', '부서'],
    ['submitted_at', '제출 시각']
  ];

  function csvCell(v) {
    var s = v == null ? '' : String(v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  // RFC 4180 CSV 파서 (따옴표, 줄바꿈 포함 셀, CRLF 지원)
  function parseCsv(text) {
    var rows = [], row = [], cell = '', i = 0, q = false;
    for (; i < text.length; i++) {
      var ch = text[i];
      if (q) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cell += '"'; i++; } else q = false;
        } else cell += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  // meta: {name, employee_id, department, submitted_at}, responses: {A1: 4, A4: 2, ...}
  function buildResultSheet(itemsDef, meta, responses) {
    var lines = [['key', 'value', 'label'], ['format', itemsDef.version, '결과지 형식']];
    META_FIELDS.forEach(function (f) { lines.push([f[0], meta[f[0]] || '', f[1]]); });
    itemsDef.items.forEach(function (it) {
      lines.push([it.id, responses[it.id] == null ? '' : responses[it.id], it.text]);
    });
    return '﻿' + lines.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n') + '\r\n';
  }

  // 반환: { format, meta: {...}, responses: {id: number|null} }. 형식이 틀리면 Error.
  function readResultSheet(text) {
    text = String(text).replace(/^﻿/, '');
    var rows = parseCsv(text).filter(function (r) { return r.some(function (c) { return c.trim() !== ''; }); });
    if (!rows.length) throw new Error('빈 파일입니다.');
    if (rows[0][0].trim().toLowerCase() === 'key') rows.shift();

    var map = {};
    rows.forEach(function (r) {
      var k = (r[0] || '').trim();
      if (k) map[k] = (r[1] || '').trim();
    });
    if (!map.format) throw new Error('AI 역량 검사 결과지가 아닙니다 (format 항목 없음).');

    var meta = {};
    META_FIELDS.forEach(function (f) { meta[f[0]] = map[f[0]] || ''; });

    var responses = {};
    Object.keys(map).forEach(function (k) {
      if (k === 'format' || meta.hasOwnProperty(k)) return;
      var v = map[k];
      responses[k] = v === '' ? null : Number(v);
    });
    return { format: map.format, meta: meta, responses: responses };
  }

  return { buildResultSheet: buildResultSheet, readResultSheet: readResultSheet, parseCsv: parseCsv, csvCell: csvCell };
});
