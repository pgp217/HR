// 실행: node --test ai-assessment/test/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import def from '../items.js';
import sheet from '../sheet.js';
import scoring from '../scoring.js';

const META = { name: '홍길동', employee_id: 'E001', department: '인사팀', submitted_at: '2026-09-23T10:00:00+09:00' };

function responses(likert, allCorrect) {
  const r = {};
  def.items.forEach((it) => {
    if (it.type === 'likert') r[it.id] = likert;
    else r[it.id] = allCorrect ? scoring.ANSWER_KEY[it.id] : (scoring.ANSWER_KEY[it.id] % 4) + 1;
  });
  return r;
}

function roundTrip(resp, meta = META) {
  return scoring.score(def, sheet.readResultSheet(sheet.buildResultSheet(def, meta, resp)));
}

test('every choice item has a valid answer key and every key maps to an item', () => {
  const choice = def.items.filter((it) => it.type === 'choice');
  assert.equal(Object.keys(scoring.ANSWER_KEY).length, choice.length);
  choice.forEach((it) => {
    const k = scoring.ANSWER_KEY[it.id];
    assert.ok(Number.isInteger(k) && k >= 1 && k <= it.options.length, it.id);
  });
});

test('every item cites an existing book chapter and each domain has 4 self + 4 choice items', () => {
  def.items.forEach((it) => assert.ok(def.chapters[it.ch], it.id + ' -> ' + it.ch));
  def.domains.forEach((d) => {
    const its = def.items.filter((it) => it.domain === d.id);
    assert.equal(its.filter((it) => it.type === 'likert').length, 4, d.id);
    assert.equal(its.filter((it) => it.type === 'choice').length, 4, d.id);
  });
  Object.values(def.chapters).forEach((c) => assert.match(c.url, /^https:\/\/zakedu\.github\.io\/genai-book\/part\d\/ch\d\d-[a-z-]+\/$/));
});

test('answer positions are spread evenly across options', () => {
  const counts = [0, 0, 0, 0];
  Object.values(scoring.ANSWER_KEY).forEach((k) => counts[k - 1]++);
  assert.deepEqual(counts, [5, 5, 5, 5]);
});

test('perfect answers score 100, 전문가', () => {
  const r = roundTrip(responses(5, true));
  assert.equal(r.ok, true);
  assert.equal(r.total, 100);
  assert.equal(r.level, '전문가');
  r.domains.forEach((d) => assert.deepEqual(d.review, []));
  assert.equal(r.strength, null);
  assert.deepEqual(r.meta, META);
});

test('lowest answers score 0, 입문', () => {
  const r = roundTrip(responses(1, false));
  assert.equal(r.total, 0);
  assert.equal(r.level, '입문');
});

test('domain score weights self-assessment 40% and test 60%', () => {
  const resp = responses(3, true); // self 50, test 100 => 80
  resp.A5 = 1; // A: 3/4 correct => 50*0.4 + 75*0.6 = 65
  const r = roundTrip(resp);
  const a = r.domains.find((d) => d.id === 'A');
  assert.equal(a.score, 65);
  assert.deepEqual(a.wrongItems, ['A5']);
  assert.equal(r.domains.find((d) => d.id === 'B').score, 80);
  assert.equal(r.total, 77);
  assert.equal(r.weakness, 'AI 이해');
});

test('flags over-estimation when self score far exceeds test score', () => {
  const r = roundTrip(responses(5, false));
  assert.match(r.domains[0].gapNote, /과대평가/);
});

test('Korean names, commas and quotes survive the CSV round trip', () => {
  const meta = { ...META, name: '김 "AI", 박', department: '인사,총무팀' };
  const r = roundTrip(responses(4, true), meta);
  assert.equal(r.meta.name, meta.name);
  assert.equal(r.meta.department, meta.department);
});

test('accepts a sheet re-saved by Excel (no BOM, LF endings, blank lines)', () => {
  const text = sheet.buildResultSheet(def, META, responses(4, true)).replace(/^﻿/, '').replace(/\r\n/g, '\n') + '\n\n';
  assert.equal(scoring.score(def, sheet.readResultSheet(text)).ok, true);
});

test('reports missing and out-of-range answers', () => {
  const resp = responses(4, true);
  resp.A1 = null;
  resp.B4 = 7;
  const r = roundTrip(resp);
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 2);
  assert.match(r.errors[0], /A1/);
  assert.match(r.errors[1], /B4/);
});

test('rejects files that are not result sheets', () => {
  assert.throws(() => sheet.readResultSheet(''), /빈 파일/);
  assert.throws(() => sheet.readResultSheet('이름,점수\n홍길동,90\n'), /결과지가 아닙니다/);
});

test('rejects a sheet from a different test version', () => {
  const text = sheet.buildResultSheet(def, META, responses(4, true)).replace(def.version, 'AIQ-v0');
  const r = scoring.score(def, sheet.readResultSheet(text));
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /버전/);
});

test('recommends chapters for wrong answers and low self-ratings, in book order', () => {
  const resp = responses(4, true);
  resp.D8 = 1; // ch10 오답
  resp.D1 = 2; // ch09 자기평가 낮음
  const r = roundTrip(resp);
  const d = r.domains.find((x) => x.id === 'D');
  assert.deepEqual(d.review.map((c) => c.id), ['ch09', 'ch10']);
  assert.equal(d.review[1].url, 'https://zakedu.github.io/genai-book/part4/ch10-ethics/');
  assert.equal(d.needsWork, true);
  assert.equal(r.domains.find((x) => x.id === 'A').needsWork, false);
});

test('levels follow the book appendix E thresholds', () => {
  assert.deepEqual([90, 80, 70, 65, 55, 50, 40, 33, 20].map((s) => scoring.levelOf(s).name),
    ['전문가', '전문가', '고급', '고급', '중급', '중급', '초급', '초급', '입문']);
});
