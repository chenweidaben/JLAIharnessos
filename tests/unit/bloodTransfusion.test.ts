/**
 * 健澜科技 jlmedaios - 输血管理纯函数单测（M190-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildBloodTransfusionReport,
  checkBloodUseRationality,
  detectBloodTransfusionReaction,
  type BloodOrder,
  type TransfusionRecord,
} from '../../src/bff/aggregators/bloodTransfusionAggregator';

describe('detectBloodTransfusionReaction', () => {
  it('无反应 → none', () => {
    const r: TransfusionRecord = { bloodType: 'A', product: 'RBC', volume: 200, preTransfusionHb: 70, postTransfusionHb: 85 };
    expect(detectBloodTransfusionReaction(r).severity).toBe('none');
  });

  it('发热 → mild', () => {
    const r: TransfusionRecord = { bloodType: 'A', product: 'RBC', volume: 200, preTransfusionHb: 70, postTransfusionHb: 85, reaction: 'fever' };
    expect(detectBloodTransfusionReaction(r).severity).toBe('mild');
  });

  it('溶血 → severe', () => {
    const r: TransfusionRecord = { bloodType: 'A', product: 'RBC', volume: 200, preTransfusionHb: 70, postTransfusionHb: 85, reaction: 'hemolysis' };
    expect(detectBloodTransfusionReaction(r).severity).toBe('severe');
  });
});

describe('checkBloodUseRationality', () => {
  it('Hb≥100 贫血 → 不合理', () => {
    const o: BloodOrder = { bloodType: 'A', product: 'RBC', volume: 200, patientHb: 110, indication: 'anemia' };
    expect(checkBloodUseRationality(o).rational).toBe(false);
  });

  it('单次>800ml → 不合理', () => {
    const o: BloodOrder = { bloodType: 'A', product: 'RBC', volume: 1000, patientHb: 60, indication: 'anemia' };
    expect(checkBloodUseRationality(o).rational).toBe(false);
  });

  it('合理输血 → rational', () => {
    const o: BloodOrder = { bloodType: 'A', product: 'RBC', volume: 200, patientHb: 60, indication: 'anemia' };
    expect(checkBloodUseRationality(o).rational).toBe(true);
  });
});

describe('buildBloodTransfusionReport', () => {
  it('生成输血例次', () => {
    const r = buildBloodTransfusionReport('输血科', '30d');
    expect(r.totalTransfusions).toBeGreaterThan(0);
  });

  it('生成库存列表', () => {
    const r = buildBloodTransfusionReport('输血科', '30d');
    expect(r.inventory.length).toBeGreaterThan(0);
  });

  it('生成预警', () => {
    const r = buildBloodTransfusionReport('输血科', '30d');
    expect(r.alerts.length).toBeGreaterThan(0);
  });
});
