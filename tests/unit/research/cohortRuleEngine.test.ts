/**
 * 健澜科技 jlmedaios - 科研队列匹配规则引擎单元测试（M5-B）
 *
 * 纯函数、确定性：覆盖年龄/性别/诊断/标签/检验纳入与排除逻辑。
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { describe, expect, it } from 'bun:test';
import {
  evaluateCohort,
  type CohortCriteria,
  type ResearchProfile,
} from '../../../src/medical-tools/research/cohortRuleEngine.js';

function makeProfile(over: Partial<ResearchProfile> = {}): ResearchProfile {
  return {
    patientId: 'p1',
    gender: '男',
    age: 55,
    tags: [],
    diagnoses: [],
    labResults: [],
    ...over,
  };
}

function makeCriteria(over: Partial<CohortCriteria> = {}): CohortCriteria {
  return {
    include: {},
    exclude: {},
    ...over,
  };
}

describe('M5-B 科研队列规则引擎（纯函数）', () => {
  it('空标准：任何患者都符合', () => {
    const r = evaluateCohort(makeProfile(), makeCriteria());
    expect(r.eligible).toBe(true);
    expect(r.matchedRules).toHaveLength(0);
  });

  it('minAge 满足 → 纳入', () => {
    const r = evaluateCohort(
      makeProfile({ age: 55 }),
      makeCriteria({ include: { minAge: 40 } }),
    );
    expect(r.eligible).toBe(true);
    expect(r.matchedRules).toContain('年龄≥40');
  });

  it('minAge 不满足 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({ age: 30 }),
      makeCriteria({ include: { minAge: 40 } }),
    );
    expect(r.eligible).toBe(false);
  });

  it('年龄未知但有 minAge → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({ age: null }),
      makeCriteria({ include: { minAge: 40 } }),
    );
    expect(r.eligible).toBe(false);
  });

  it('maxAge 满足 → 纳入', () => {
    const r = evaluateCohort(
      makeProfile({ age: 70 }),
      makeCriteria({ include: { maxAge: 75 } }),
    );
    expect(r.eligible).toBe(true);
  });

  it('maxAge 不满足 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({ age: 80 }),
      makeCriteria({ include: { maxAge: 75 } }),
    );
    expect(r.eligible).toBe(false);
  });

  it('性别匹配 → 纳入', () => {
    const r = evaluateCohort(
      makeProfile({ gender: '女' }),
      makeCriteria({ include: { gender: '女' } }),
    );
    expect(r.eligible).toBe(true);
  });

  it('性别不匹配 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({ gender: '男' }),
      makeCriteria({ include: { gender: '女' } }),
    );
    expect(r.eligible).toBe(false);
  });

  it('诊断名称命中 → 纳入', () => {
    const r = evaluateCohort(
      makeProfile({
        diagnoses: [{ name: '2型糖尿病', code: 'E11', confirmed: true }],
      }),
      makeCriteria({ include: { diagnoses: ['2型糖尿病'] } }),
    );
    expect(r.eligible).toBe(true);
  });

  it('诊断 ICD 编码命中 → 纳入', () => {
    const r = evaluateCohort(
      makeProfile({
        diagnoses: [{ name: '某病', code: 'E11.9', confirmed: true }],
      }),
      makeCriteria({ include: { diagnoses: ['E11.9'] } }),
    );
    expect(r.eligible).toBe(true);
  });

  it('诊断未命中 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({
        diagnoses: [{ name: '高血压', code: 'I10', confirmed: true }],
      }),
      makeCriteria({ include: { diagnoses: ['2型糖尿病'] } }),
    );
    expect(r.eligible).toBe(false);
  });

  it('标签命中 → 纳入', () => {
    const r = evaluateCohort(
      makeProfile({ tags: ['糖尿病', '高血压'] }),
      makeCriteria({ include: { tags: ['糖尿病'] } }),
    );
    expect(r.eligible).toBe(true);
  });

  it('标签未命中 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({ tags: ['高血压'] }),
      makeCriteria({ include: { tags: ['糖尿病'] } }),
    );
    expect(r.eligible).toBe(false);
  });

  it('检验条件 gt 满足 → 纳入', () => {
    const r = evaluateCohort(
      makeProfile({
        labResults: [
          { itemCode: 'GLU', itemName: '空腹血糖', numericValue: 8.2, abnormalFlag: 'H' },
        ],
      }),
      makeCriteria({ include: { labs: [{ itemCode: 'GLU', op: 'gt', value: 7 }] } }),
    );
    expect(r.eligible).toBe(true);
  });

  it('检验条件 gt 不满足 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({
        labResults: [
          { itemCode: 'GLU', itemName: '空腹血糖', numericValue: 6.0, abnormalFlag: 'N' },
        ],
      }),
      makeCriteria({ include: { labs: [{ itemCode: 'GLU', op: 'gt', value: 7 }] } }),
    );
    expect(r.eligible).toBe(false);
  });

  it('多个检验条件全部满足 → 纳入', () => {
    const r = evaluateCohort(
      makeProfile({
        labResults: [
          { itemCode: 'GLU', itemName: '血糖', numericValue: 8.2, abnormalFlag: 'H' },
          { itemCode: 'HBA1C', itemName: '糖化血红蛋白', numericValue: 7.5, abnormalFlag: 'H' },
        ],
      }),
      makeCriteria({
        include: {
          labs: [
            { itemCode: 'GLU', op: 'gt', value: 7 },
            { itemCode: 'HBA1C', op: 'gte', value: 7 },
          ],
        },
      }),
    );
    expect(r.eligible).toBe(true);
  });

  it('多个检验条件有一个不满足 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({
        labResults: [
          { itemCode: 'GLU', itemName: '血糖', numericValue: 8.2, abnormalFlag: 'H' },
          { itemCode: 'HBA1C', itemName: '糖化', numericValue: 6.0, abnormalFlag: 'N' },
        ],
      }),
      makeCriteria({
        include: {
          labs: [
            { itemCode: 'GLU', op: 'gt', value: 7 },
            { itemCode: 'HBA1C', op: 'gte', value: 7 },
          ],
        },
      }),
    );
    expect(r.eligible).toBe(false);
  });

  it('检验项目无数值 → 条件不成立', () => {
    const r = evaluateCohort(
      makeProfile({
        labResults: [
          { itemCode: 'GLU', itemName: '血糖', numericValue: null, abnormalFlag: null },
        ],
      }),
      makeCriteria({ include: { labs: [{ itemCode: 'GLU', op: 'gt', value: 7 }] } }),
    );
    expect(r.eligible).toBe(false);
  });

  it('排除诊断命中 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({
        diagnoses: [{ name: '1型糖尿病', code: 'E10', confirmed: true }],
      }),
      makeCriteria({ include: {}, exclude: { diagnoses: ['1型糖尿病'] } }),
    );
    expect(r.eligible).toBe(false);
    expect(r.exclusionReasons).toContain('排除诊断命中');
  });

  it('排除标签命中 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({ tags: ['妊娠'] }),
      makeCriteria({ include: {}, exclude: { tags: ['妊娠'] } }),
    );
    expect(r.eligible).toBe(false);
  });

  it('排除检验命中 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({
        labResults: [
          { itemCode: 'EGFR', itemName: 'eGFR', numericValue: 25, abnormalFlag: 'L' },
        ],
      }),
      makeCriteria({
        include: {},
        exclude: { labs: [{ itemCode: 'EGFR', op: 'lt', value: 30 }] },
      }),
    );
    expect(r.eligible).toBe(false);
  });

  it('排除优先于纳入：符合纳入但命中排除 → 不纳入', () => {
    const r = evaluateCohort(
      makeProfile({
        diagnoses: [
          { name: '2型糖尿病', code: 'E11', confirmed: true },
          { name: '妊娠', code: 'Z34', confirmed: true },
        ],
      }),
      makeCriteria({
        include: { diagnoses: ['2型糖尿病'] },
        exclude: { diagnoses: ['妊娠'] },
      }),
    );
    expect(r.eligible).toBe(false);
    expect(r.exclusionReasons).toContain('排除诊断命中');
  });
});
