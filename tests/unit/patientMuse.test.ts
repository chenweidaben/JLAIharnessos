/**
 * 健澜科技 jlmedaios - 患者 Personal Agent（Patient MUSE）聚合器单测（M117-A）
 *
 * 覆盖：
 *  - 画像聚合：chronicConditions 仅取 chronic=true、allergies 仅取 allergy=true、去重；
 *  - 偏好提取：derivePreferenceTags 关键词命中 / 复诊依从 / 多药共管；
 *  - 健康提醒：过敏 critical / 慢病 warning / 用药 info / 复诊逾期 warning / 空画像引导；
 *  - 角色差异：resolvePatientMuseTarget——doctor 看任意 / patient 看本人 / 越权拒绝；
 *  - 空数据兜底：null / undefined / 空数组一律零值视图，绝不抛错。
 *
 * 注意：纯函数测试，不连接 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatientMuse,
  derivePreferenceTags,
  FOLLOWUP_DUE_DAYS,
  type PatientHistoryEntry,
  type PatientMedication,
  type PatientVisit,
} from '../../src/bff/aggregators/patientMuseAggregator.js';
import { resolvePatientMuseTarget } from '../../src/bff/routes/patientMuse.js';

describe('buildPatientMuse - 画像聚合', () => {
  it('chronicConditions 仅收录 chronic=true 的诊断名并去重', () => {
    const history: PatientHistoryEntry[] = [
      { condition: '2型糖尿病', chronic: true },
      { condition: '上呼吸道感染', chronic: false },
      { condition: '2型糖尿病', chronic: true }, // 重复
      { condition: ' 原发性高血压 ', chronic: true },
    ];
    const view = buildPatientMuse('p1', history, [], []);
    expect(view.chronicConditions).toEqual(['2型糖尿病', '原发性高血压']);
  });

  it('allergies 仅收录 allergy=true 的药物名并去重', () => {
    const meds: PatientMedication[] = [
      { drugName: '阿司匹林', allergy: true },
      { drugName: '二甲双胍', allergy: false },
      { drugName: '阿司匹林', allergy: true },
    ];
    const view = buildPatientMuse('p1', [], meds, []);
    expect(view.allergies).toEqual(['阿司匹林']);
  });
});

describe('derivePreferenceTags - 偏好提取', () => {
  it('关键词命中：糖尿病→血糖管理、高血压→血压监测', () => {
    const tags = derivePreferenceTags({
      chronicConditions: ['2型糖尿病', '原发性高血压'],
      lastSummary: '',
      revisitCount: 0,
      activeMedCount: 0,
    });
    expect(tags).toContain('血糖管理');
    expect(tags).toContain('血压监测');
  });

  it('复诊次数≥2 → 追加「复诊依从」', () => {
    const tags = derivePreferenceTags({
      chronicConditions: [],
      lastSummary: '',
      revisitCount: 2,
      activeMedCount: 0,
    });
    expect(tags).toContain('复诊依从');
  });

  it('活跃用药≥3 → 追加「多药共管」', () => {
    const tags = derivePreferenceTags({
      chronicConditions: [],
      lastSummary: '',
      revisitCount: 0,
      activeMedCount: 3,
    });
    expect(tags).toContain('多药共管');
  });

  it('结果去重保序', () => {
    const tags = derivePreferenceTags({
      chronicConditions: ['糖尿病', '糖尿病'],
      lastSummary: '糖尿病随访',
      revisitCount: 0,
      activeMedCount: 0,
    });
    expect(tags.filter((t) => t === '血糖管理').length).toBe(1);
  });
});

describe('buildPatientMuse - 健康提醒', () => {
  it('有过敏史 → 产出 critical 级提醒且排最前', () => {
    const history: PatientHistoryEntry[] = [{ condition: '高血压', chronic: true }];
    const meds: PatientMedication[] = [{ drugName: '青霉素', allergy: true, status: 'stopped' }];
    const view = buildPatientMuse('p1', history, meds, []);
    expect(view.healthReminders[0].type).toBe('allergy');
    expect(view.healthReminders[0].level).toBe('critical');
    expect(view.healthReminders[0].message).toContain('青霉素');
  });

  it('有慢病 → 产出 warning 级慢病随访提醒', () => {
    const history: PatientHistoryEntry[] = [{ condition: '冠心病', chronic: true }];
    const view = buildPatientMuse('p1', history, [], []);
    expect(view.healthReminders.some((r) => r.type === 'chronic-care' && r.level === 'warning')).toBe(true);
  });

  it('有活跃用药 → 产出 info 级配药提醒', () => {
    const meds: PatientMedication[] = [
      { drugName: '二甲双胍', allergy: false, status: 'active' },
    ];
    const view = buildPatientMuse('p1', [], meds, []);
    expect(view.healthReminders.some((r) => r.type === 'refill' && r.level === 'info')).toBe(true);
  });

  it('距上次就诊超过 FOLLOWUP_DUE_DAYS 天 → 产出复诊预约提醒', () => {
    const old = new Date(Date.now() - (FOLLOWUP_DUE_DAYS + 30) * 86_400_000).toISOString();
    const visits: PatientVisit[] = [{ visitType: '复诊', visitDate: old, summary: '随访' }];
    const view = buildPatientMuse('p1', [], [], visits);
    expect(view.healthReminders.some((r) => r.type === 'followup' && r.level === 'warning')).toBe(true);
  });
});

describe('resolvePatientMuseTarget - 角色差异', () => {
  it('doctor：可查看任意患者', () => {
    const r = resolvePatientMuseTarget({ id: 'doc_1', roles: ['doctor'] }, 'p_99');
    expect('allowed' in r && r.allowed).toBe('p_99');
  });

  it('patient：仅可查看本人', () => {
    const r = resolvePatientMuseTarget({ id: 'p_1', roles: ['patient'] }, 'p_1');
    expect('allowed' in r && r.allowed).toBe('p_1');
  });

  it('patient 查看他人：拒绝（403 语义）', () => {
    const r = resolvePatientMuseTarget({ id: 'p_1', roles: ['patient'] }, 'p_2');
    expect('forbidden' in r).toBe(true);
  });

  it('未知角色：拒绝', () => {
    const r = resolvePatientMuseTarget({ id: 'u_1', roles: ['guest'] }, 'p_1');
    expect('forbidden' in r).toBe(true);
  });

  it('空 patientId：拒绝', () => {
    const r = resolvePatientMuseTarget({ id: 'doc_1', roles: ['doctor'] }, '   ');
    expect('forbidden' in r).toBe(true);
  });
});

describe('buildPatientMuse - 空数据兜底', () => {
  it('全 null 入参：零值视图 + 一条「完善档案」引导，绝不抛错', () => {
    const view = buildPatientMuse('p1', null, null, null);
    expect(view.chronicConditions).toEqual([]);
    expect(view.allergies).toEqual([]);
    expect(view.preferenceTags).toEqual([]);
    expect(view.healthReminders.length).toBe(1);
    expect(view.healthReminders[0].type).toBe('profile');
  });

  it('空数组入参：与 null 一致兜底', () => {
    const view = buildPatientMuse('p1', [], [], []);
    expect(view.chronicConditions).toEqual([]);
    expect(view.healthReminders[0].type).toBe('profile');
  });

  it('脏数据（无 condition / 非数组字段）：归一为空，不崩', () => {
    // @ts-expect-error 故意喂脏数据，验证防御
    const view = buildPatientMuse('p1', [{ condition: 123, chronic: 'yes' }], null, null);
    expect(view.chronicConditions).toEqual([]);
  });
});
