/**
 * 健澜科技 jlmedaios - 患者画像学习引擎纯函数单测
 *
 * 覆盖：
 *  - 慢病提取（确诊诊断 ∩ 词典、未确诊不计、跨就诊去重）；
 *  - 药物反应提取（医嘱备注命中关键词 → 药品（反应））；
 *  - 风险标志（危急值 / HH·LL 显著异常 / 多病共存）；
 *  - summarizeVisits 摘要口径；
 *  - 空输入兜底；输出不含姓名 / 身份证号等直接标识符。
 * 全部使用 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  buildPatientProfile,
  summarizeVisits,
  type ProfileLab,
  type ProfileOrder,
  type ProfileVisit,
} from '../../src/bff/aggregators/patientProfileAggregator';

const NOW = '2026-10-15T08:00:00.000Z';

function visit(partial: Partial<ProfileVisit>): ProfileVisit {
  return {
    id: 'v1',
    visitType: 'outpatient',
    department: '心内科',
    chiefComplaint: '胸闷3天',
    admitAt: '2026-10-08T08:00:00.000Z',
    dischargeAt: null,
    diagnoses: [],
    ...partial,
  };
}

describe('慢病提取', () => {
  it('确诊诊断命中词典 → 纳入慢病清单', () => {
    const visits: ProfileVisit[] = [
      visit({ id: 'v1', diagnoses: [
        { name: '高血压2级', code: 'I10', kind: 'outpatient', confirmed: true },
      ] }),
    ];
    const p = buildPatientProfile('P001', visits, [], [], NOW);
    expect(p.chronicConditions).toContain('高血压2级');
  });

  it('未确诊诊断不计入慢病清单', () => {
    const visits: ProfileVisit[] = [
      visit({ diagnoses: [
        { name: '2型糖尿病', code: 'E11', kind: 'outpatient', confirmed: false },
      ] }),
    ];
    const p = buildPatientProfile('P001', visits, [], [], NOW);
    expect(p.chronicConditions).toHaveLength(0);
  });

  it('跨就诊重复诊断去重', () => {
    const visits: ProfileVisit[] = [
      visit({ id: 'v1', diagnoses: [
        { name: '冠心病', code: 'I25', kind: 'outpatient', confirmed: true },
      ] }),
      visit({ id: 'v2', diagnoses: [
        { name: '冠心病', code: 'I25', kind: 'discharge', confirmed: true },
      ] }),
    ];
    const p = buildPatientProfile('P001', visits, [], [], NOW);
    expect(p.chronicConditions.filter((c) => c === '冠心病')).toHaveLength(1);
  });

  it('非慢病诊断不纳入', () => {
    const visits: ProfileVisit[] = [
      visit({ diagnoses: [
        { name: '急性上呼吸道感染', code: 'J06', kind: 'outpatient', confirmed: true },
      ] }),
    ];
    const p = buildPatientProfile('P001', visits, [], [], NOW);
    expect(p.chronicConditions).toHaveLength(0);
  });
});

describe('药物反应提取', () => {
  it('医嘱备注命中反应关键词 → 提取"药品（反应）"', () => {
    const orders: ProfileOrder[] = [
      { content: '注射用头孢曲松钠 2g', orderType: '临时医嘱', status: 'cancelled', note: '用药后皮疹明显，停用', detail: null },
    ];
    const p = buildPatientProfile('P001', [], orders, [], NOW);
    expect(p.drugReactions).toContain('注射用头孢曲松钠 2g（皮疹）');
  });

  it('detail.reaction 字段命中关键词同样提取', () => {
    const orders: ProfileOrder[] = [
      { content: '二甲双胍片 0.5g', orderType: '长期医嘱', status: 'active', note: null, detail: { reaction: '服用后恶心呕吐' } },
    ];
    const p = buildPatientProfile('P001', [], orders, [], NOW);
    expect(p.drugReactions.some((r) => r.includes('恶心'))).toBe(true);
  });

  it('无反应线索的医嘱不产出药物反应', () => {
    const orders: ProfileOrder[] = [
      { content: '生理盐水 100ml 静滴', orderType: '临时医嘱', status: 'completed', note: null, detail: null },
    ];
    const p = buildPatientProfile('P001', [], orders, [], NOW);
    expect(p.drugReactions).toHaveLength(0);
  });
});

describe('风险标志', () => {
  it('危急值检验 → 危急值标志', () => {
    const labs: ProfileLab[] = [
      { itemName: '血钾', itemCode: 'K', numericValue: 6.5, refLow: 3.5, refHigh: 5.3, abnormalFlag: 'HH', isCritical: true, resultTime: NOW, unit: 'mmol/L' },
    ];
    const p = buildPatientProfile('P001', [], [], labs, NOW);
    expect(p.riskFlags.some((f) => f.startsWith('危急值：血钾'))).toBe(true);
  });

  it('HH/LL 显著异常但非危急 → 显著异常标志', () => {
    const labs: ProfileLab[] = [
      { itemName: '血红蛋白', itemCode: 'HGB', numericValue: 90, refLow: 115, refHigh: 150, abnormalFlag: 'L', isCritical: false, resultTime: NOW, unit: 'g/L' },
      { itemName: '血糖', itemCode: 'GLU', numericValue: 15.2, refLow: 3.9, refHigh: 6.1, abnormalFlag: 'HH', isCritical: false, resultTime: NOW, unit: 'mmol/L' },
    ];
    const p = buildPatientProfile('P001', [], [], labs, NOW);
    expect(p.riskFlags).toContain('显著异常：血糖（HH）');
    expect(p.riskFlags.some((f) => f.includes('血红蛋白'))).toBe(false);
  });

  it('≥2 种慢病 → 多病共存标志', () => {
    const visits: ProfileVisit[] = [
      visit({ diagnoses: [
        { name: '高血压2级', code: 'I10', kind: 'outpatient', confirmed: true },
        { name: '2型糖尿病', code: 'E11', kind: 'outpatient', confirmed: true },
      ] }),
    ];
    const p = buildPatientProfile('P001', visits, [], [], NOW);
    expect(p.riskFlags.some((f) => f.includes('多病共存'))).toBe(true);
  });
});

describe('summarizeVisits 摘要', () => {
  it('空就诊 → 固定兜底文案', () => {
    expect(summarizeVisits([])).toBe('暂无就诊记录。');
  });

  it('近12个月就诊 → 聚合科室 + 最近一次', () => {
    const visits: ProfileVisit[] = [
      visit({ id: 'v1', department: '心内科', admitAt: '2026-10-08T08:00:00.000Z', chiefComplaint: '胸闷3天' }),
      visit({ id: 'v2', department: '心内科', admitAt: '2026-09-01T08:00:00.000Z' }),
      visit({ id: 'v3', department: '内分泌科', admitAt: '2026-08-15T08:00:00.000Z' }),
    ];
    const s = summarizeVisits(visits);
    expect(s).toContain('近12个月共就诊3次');
    expect(s).toContain('心内科2次');
    expect(s).toContain('2026-10-08心内科门诊');
    expect(s).toContain('胸闷3天');
  });

  it('超过12个月的历史就诊不计入近12个月统计', () => {
    const visits: ProfileVisit[] = [
      visit({ id: 'v1', admitAt: '2024-01-10T08:00:00.000Z' }),
    ];
    const s = summarizeVisits(visits);
    expect(s).toContain('近12个月无就诊记录');
  });
});

describe('兜底与脱敏', () => {
  it('空输入 → 数组为空、字符串有兜底、不抛错', () => {
    const p = buildPatientProfile('P001', [], [], [], NOW);
    expect(p.patientId).toBe('P001');
    expect(p.chronicConditions).toEqual([]);
    expect(p.drugReactions).toEqual([]);
    expect(p.riskFlags).toEqual([]);
    expect(p.preferredTreatment).toContain('暂无足够就诊数据');
    expect(p.updatedAt).toBe(NOW);
  });

  it('输出不含姓名 / 身份证号等直接标识符', () => {
    const visits: ProfileVisit[] = [
      visit({ chiefComplaint: '患者张三诉胸闷' }),
    ];
    const p = buildPatientProfile('P001', visits, [], [], NOW);
    const serialized = JSON.stringify(p);
    expect(serialized).not.toContain('身份证');
    expect(serialized).not.toMatch(/\d{17}[\dXx]/);
  });
});
