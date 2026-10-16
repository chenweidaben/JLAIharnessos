/**
 * 健澜科技 jlmedaios - Pharma MUSE V2 纯函数单测（M185-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPharmaMUSE,
  checkDrugInteraction,
  type DrugInventoryV2,
} from '../../src/bff/aggregators/pharmaMUSEV2Aggregator';

describe('checkDrugInteraction', () => {
  it('华法林+阿司匹林 → 禁忌联用', () => {
    const alerts = checkDrugInteraction(['warfarin', 'aspirin']);
    expect(alerts.some((a) => a.severity === 'contraindicated')).toBe(true);
  });

  it('无相互作用返回空', () => {
    const alerts = checkDrugInteraction(['paracetamol', 'omeprazole']);
    expect(alerts.length).toBe(0);
  });

  it('两种他汀 → caution', () => {
    const alerts = checkDrugInteraction(['atorvastatin', 'rosuvastatin']);
    expect(alerts.some((a) => a.severity === 'caution')).toBe(true);
  });
});

describe('buildPharmaMUSE', () => {
  it('严重低库存生成 high 预警', () => {
    const inv: DrugInventoryV2[] = [
      { drugName: '药A', currentStock: 1, minStock: 20, expiryMonths: 6 },
    ];
    const r = buildPharmaMUSE('p1', '2026-10-16', [], inv);
    expect(r.inventoryAlerts.some((a) => a.level === 'high')).toBe(true);
  });

  it('近效期生成 low 预警', () => {
    const inv: DrugInventoryV2[] = [
      { drugName: '药B', currentStock: 100, minStock: 20, expiryMonths: 2 },
    ];
    const r = buildPharmaMUSE('p1', '2026-10-16', [], inv);
    expect(r.inventoryAlerts.some((a) => a.reason.includes('近效期'))).toBe(true);
  });

  it('禁忌联用时生成咨询推荐', () => {
    const r = buildPharmaMUSE('p1', '2026-10-16', ['warfarin', 'aspirin'], []);
    expect(r.consultRecommendations.length).toBeGreaterThan(0);
  });
});
