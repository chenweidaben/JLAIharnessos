/**
 * 健澜科技 jlmedaios - M170-D 医院数据资产深化聚合器纯函数单测
 *
 * 覆盖：
 *  - 资产清单：四大域 15 类目录、域汇总、demo 标记、汇总指标；
 *  - 价值评估：calculateDataAssetValue 质量/覆盖/新鲜度加权、域战略权重、档位；
 *  - 缺口识别：identifyDataGap 质量/覆盖/陈旧/未治理四类缺口与严重度；
 *  - 治理策略：buildDataGovernancePolicy L1~L4 脱敏/授权/保留/加密动作。
 *
 * 仅测纯函数，不触碰 IO / 时钟（时间戳统一注入 'NOW'）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  ASSET_CATALOG,
  buildDataAssetInventory,
  buildDataGovernancePolicy,
  calculateDataAssetValue,
  identifyDataGap,
  type AssetMeasurement,
  type DataAssetCategory,
  type DataAssetItem,
} from '../../src/bff/aggregators/dataAssetAggregator';

/** 装配一条测试资产 */
function item(overrides: Partial<DataAssetItem> = {}): DataAssetItem {
  return {
    key: 'patient_basic',
    name: '基本信息',
    category: 'patient',
    categoryName: '患者数据',
    description: '',
    ownerDept: '信息科',
    sensitivityLevel: 3,
    retentionYears: 15,
    maskingRequired: true,
    volumeRows: 1000,
    qualityScore: 80,
    coverageRate: 80,
    freshnessDays: 7,
    isGoverned: true,
    ...overrides,
  };
}

/** 一份全部健康的实测指标：质量/覆盖>=90、新鲜、已治理 */
function healthyMeasurements(): Record<string, AssetMeasurement> {
  const m: Record<string, AssetMeasurement> = {};
  for (const e of ASSET_CATALOG) {
    m[e.key] = {
      volumeRows: 10000,
      qualityScore: 95,
      coverageRate: 95,
      freshnessDays: 3,
      isGoverned: true,
    };
  }
  return m;
}

describe('buildDataAssetInventory 资产清单', () => {
  it('目录恒为 15 类、四大域齐全', () => {
    expect(ASSET_CATALOG).toHaveLength(15);
    const inv = buildDataAssetInventory(undefined, 'NOW');
    expect(inv.items).toHaveLength(15);
    expect(inv.categories).toHaveLength(4);
    expect(inv.asOf).toBe('NOW');
  });

  it('无实测输入时打 demo 标记；传入实测后退出 demo', () => {
    expect(buildDataAssetInventory(undefined, 'NOW').demo).toBe(true);
    expect(buildDataAssetInventory(healthyMeasurements(), 'NOW').demo).toBe(false);
  });

  it('目录基线：15 类中 9 类缺口、未治理 5 类（与基线口径一致）', () => {
    const inv = buildDataAssetInventory(undefined, 'NOW');
    // 基线中未治理：patient_medication / med_nursing / op_resource / ai_experience
    expect(inv.summary.ungovernedItems).toBe(4);
    expect(inv.summary.governedItems).toBe(11);
    // patient 1 + medical 2 + operation 3 + ai 3 = 9
    expect(inv.summary.gapCount).toBe(9);
  });

  it('全部健康实测：零缺口、全部已治理', () => {
    const inv = buildDataAssetInventory(healthyMeasurements(), 'NOW');
    expect(inv.gaps).toHaveLength(0);
    expect(inv.summary.ungovernedItems).toBe(0);
    expect(inv.summary.governedItems).toBe(15);
  });

  it('非法输入安全收敛，不抛异常', () => {
    const inv = buildDataAssetInventory(
      { patient_basic: { qualityScore: NaN, coverageRate: -10, freshnessDays: 'xx' as unknown as number } },
      'NOW',
    );
    const basic = inv.items.find((i) => i.key === 'patient_basic');
    expect(basic?.qualityScore).toBe(0);
    expect(basic?.coverageRate).toBe(0);
    expect(basic?.freshnessDays).toBe(0);
  });
});

describe('calculateDataAssetValue 价值评估', () => {
  it('基本信息(质量92/覆盖98/3天)：raw=96.1，patient 权重1.0 → 96.1 核心资产', () => {
    const v = calculateDataAssetValue(
      item({ key: 'patient_basic', category: 'patient', qualityScore: 92, coverageRate: 98, freshnessDays: 3 }),
    );
    expect(v.valueScore).toBeCloseTo(96.1, 1);
    expect(v.grade).toBe('core');
    expect(v.drivers.strategicWeight).toBe(1.0);
  });

  it('AI 数据战略权重 1.1：同指标下 ai 比 operation 价值分更高', () => {
    const base = { qualityScore: 80, coverageRate: 80, freshnessDays: 7 };
    const ai = calculateDataAssetValue(item({ ...base, category: 'ai' }));
    const op = calculateDataAssetValue(item({ ...base, category: 'operation' }));
    expect(ai.drivers.strategicWeight).toBe(1.1);
    expect(op.drivers.strategicWeight).toBe(0.85);
    expect(ai.valueScore).toBeGreaterThan(op.valueScore);
  });

  it('低质量/低覆盖/陈旧 → 待盘活（dormant）', () => {
    const v = calculateDataAssetValue(
      item({ qualityScore: 20, coverageRate: 25, freshnessDays: 400 }),
    );
    expect(v.grade).toBe('dormant');
    expect(v.valueScore).toBeLessThan(40);
  });

  it('新鲜度分档：30天80 / 90天60 / 180天40 / 365天20', () => {
    const mk = (days: number) =>
      calculateDataAssetValue(item({ qualityScore: 50, coverageRate: 50, freshnessDays: days }))
        .drivers.freshnessFactor;
    expect(mk(7)).toBe(100);
    expect(mk(30)).toBe(80);
    expect(mk(90)).toBe(60);
    expect(mk(180)).toBe(40);
    expect(mk(365)).toBe(20);
  });
});

describe('identifyDataGap 缺口识别', () => {
  it('患者数据基线：仅「用药记录未治理」1 条缺口', () => {
    const gaps = identifyDataGap('patient');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].assetKey).toBe('patient_medication');
    expect(gaps[0].gapType).toBe('governance');
  });

  it('医疗数据基线：护理记录质量<60 + 未治理 共 2 条', () => {
    const gaps = identifyDataGap('medical');
    const keys = gaps.map((g) => `${g.assetKey}:${g.gapType}`).sort();
    expect(keys).toEqual(['med_nursing:governance', 'med_nursing:quality']);
  });

  it('运营数据基线：资源利用 质量+覆盖+未治理 共 3 条', () => {
    const gaps = identifyDataGap('operation');
    expect(gaps.filter((g) => g.assetKey === 'op_resource')).toHaveLength(3);
  });

  it('全部健康实测 → 任意域零缺口', () => {
    for (const cat of ['patient', 'medical', 'operation', 'ai'] as DataAssetCategory[]) {
      expect(identifyDataGap(cat, healthyMeasurements())).toHaveLength(0);
    }
  });

  it('质量分 39 → high 严重度；59 → medium', () => {
    const low = healthyMeasurements();
    low.ai_experience = { qualityScore: 39, coverageRate: 90, freshnessDays: 3, isGoverned: true };
    expect(identifyDataGap('ai', low).find((g) => g.assetKey === 'ai_experience' && g.gapType === 'quality')?.severity).toBe('high');

    const mid = healthyMeasurements();
    mid.ai_experience = { qualityScore: 59, coverageRate: 90, freshnessDays: 3, isGoverned: true };
    expect(identifyDataGap('ai', mid).find((g) => g.assetKey === 'ai_experience' && g.gapType === 'quality')?.severity).toBe('medium');
  });
});

describe('buildDataGovernancePolicy 治理策略', () => {
  it('L4 核心机密：双人授权 + 动态脱敏 + 加密 + 每周质检 + 每日备份', () => {
    const p = buildDataGovernancePolicy(item({ sensitivityLevel: 4 }));
    expect(p.accessControl).toBe('dual_auth');
    expect(p.maskingMode).toBe('dynamic_redaction');
    expect(p.encryption).toBe(true);
    expect(p.qualityCheck).toBe('weekly');
    expect(p.backup).toBe('daily');
  });

  it('L1 公开：全员可见、不脱敏、不加密、半年质检', () => {
    const p = buildDataGovernancePolicy(item({ sensitivityLevel: 1, maskingRequired: false }));
    expect(p.accessControl).toBe('public');
    expect(p.maskingMode).toBe('none');
    expect(p.encryption).toBe(false);
    expect(p.qualityCheck).toBe('half_yearly');
  });

  it('病历依法保留 30 年（目录法定年限优先于敏感级别默认值）', () => {
    const p = buildDataGovernancePolicy(
      item({ key: 'med_record', name: '病历', retentionYears: 30 }),
    );
    expect(p.retentionYears).toBe(30);
  });

  it('未治理资产：首条动作是「紧急补登台账」', () => {
    const p = buildDataGovernancePolicy(item({ isGoverned: false }));
    expect(p.actions[0]).toContain('紧急');
  });
});
