/**
 * 健澜AI原生医院操作系统OS - P3-2 智能预问诊+智慧导诊 单测
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, test } from 'bun:test';
import {
  __resetStore, TriageError,
  createQuestionnaire, submitQuestionnaire, reviewQuestionnaire, getQuestionnaire, listQuestionnaires,
  runTriage, listSymptoms, SYMPTOM_RULES,
} from '../../src/bff/aggregators/smartTriageV2Aggregator';

beforeEach(() => { __resetStore(); });

function mkQ(patientId = 'P1') {
  return createQuestionnaire({
    patientId, chiefComplaint: '胸痛 1 天', presentIllness: '活动后压榨样胸痛',
    pastHistory: ['高血压'], allergyHistory: ['青霉素'], currentMeds: ['氨氯地平'],
    symptomTags: ['chest-pain'], durationDays: 1, severity: 'moderate',
  });
}

describe('P3-2 问卷 CRUD', () => {
  test('创建 draft + get', () => {
    const q = mkQ();
    expect(q.status).toBe('draft');
    expect(getQuestionnaire(q.questionnaireId).patientId).toBe('P1');
  });
  test('chiefComplaint 必填', () => {
    expect(() => createQuestionnaire({ patientId: 'P1', chiefComplaint: '', presentIllness: '', symptomTags: ['fever'], durationDays: 1, severity: 'mild' })).toThrow(/chiefComplaint/);
  });
  test('chiefComplaint >500 字 → 400', () => {
    expect(() => createQuestionnaire({ patientId: 'P1', chiefComplaint: 'x'.repeat(501), presentIllness: '', symptomTags: ['fever'], durationDays: 1, severity: 'mild' })).toThrow(/500/);
  });
  test('symptomTags 空 → 400', () => {
    expect(() => createQuestionnaire({ patientId: 'P1', chiefComplaint: 'x', presentIllness: '', symptomTags: [], durationDays: 1, severity: 'mild' })).toThrow(/symptomTags/);
  });
  test('severity 非法 → 400', () => {
    expect(() => createQuestionnaire({ patientId: 'P1', chiefComplaint: 'x', presentIllness: '', symptomTags: ['fever'], durationDays: 1, severity: 'unknown' as any })).toThrow(/severity/);
  });
});

describe('P3-2 submit/review 状态机', () => {
  test('submit 生成 aiSummary', () => {
    const q = mkQ();
    const s = submitQuestionnaire(q.questionnaireId);
    expect(s.status).toBe('submitted');
    expect(s.aiSummary).toContain('主诉：胸痛 1 天');
    expect(s.aiSummary).toContain('症状标签：chest-pain');
  });
  test('重复 submit → 409', () => {
    const q = mkQ();
    submitQuestionnaire(q.questionnaireId);
    expect(() => submitQuestionnaire(q.questionnaireId)).toThrow(/重复提交/);
  });
  test('review 未 submit → 409', () => {
    const q = mkQ();
    expect(() => reviewQuestionnaire(q.questionnaireId)).toThrow(/未提交/);
  });
  test('review submitted → reviewed-by-doctor', () => {
    const q = mkQ();
    submitQuestionnaire(q.questionnaireId);
    const r = reviewQuestionnaire(q.questionnaireId);
    expect(r.status).toBe('reviewed-by-doctor');
    expect(r.reviewedAt).toBeTruthy();
  });
  test('listQuestionnaires 按 patientId 过滤', () => {
    mkQ('P1'); mkQ('P2');
    expect(listQuestionnaires('P1').length).toBe(1);
    expect(listQuestionnaires().length).toBe(2);
  });
});

describe('P3-2 智慧导诊', () => {
  test('chest-pain → cardiology + emergency=true', () => {
    const r = runTriage('P1', ['chest-pain']);
    expect(r.emergency).toBe(true);
    expect(r.recommendedDepartments[0].departmentId).toBe('emergency');
    expect(r.recommendedDepartments.some((d) => d.departmentId === 'cardiology')).toBe(true);
  });
  test('cough → respiratory', () => {
    const r = runTriage('P1', ['cough']);
    expect(r.emergency).toBe(false);
    expect(r.recommendedDepartments[0].departmentId).toBe('respiratory');
  });
  test('多症状聚合 top3（headache+dizziness+chest-pain）', () => {
    const r = runTriage('P1', ['headache', 'dizziness', 'chest-pain']);
    // neurology 累计 score=2（headache+dizziness），应排前面
    const neu = r.recommendedDepartments.find((d) => d.departmentId === 'neurology');
    expect(neu?.score).toBe(2);
  });
  test('无匹配 → 全科兜底', () => {
    const r = runTriage('P1', ['weird-symptom']);
    expect(r.recommendedDepartments[0].departmentId).toBe('general');
  });
  test('symptomTags 空数组 → 400', () => {
    expect(() => runTriage('P1', [])).toThrow(/不能为空/);
  });
  test('symptoms 字典返回 >=15 条', () => {
    expect(listSymptoms().length).toBeGreaterThanOrEqual(15);
    expect(SYMPTOM_RULES.length).toBeGreaterThanOrEqual(15);
  });
});
