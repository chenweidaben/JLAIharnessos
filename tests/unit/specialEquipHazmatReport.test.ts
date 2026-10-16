/**
 * 健澜科技 jlmedaios - 特种设备与危化品纯函数单测（M229-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildSpecialEquipHazmatReport,
  handleHazmatLeak,
  inspectSpecialEquip,
} from '../../src/bff/aggregators/specialEquipHazmatReportAggregator';

describe('inspectSpecialEquip', () => {
  it('50台设备 → 49台合格 98%', () => {
    const r = inspectSpecialEquip(50);
    expect(r.passed).toBe(49);
    expect(r.rate).toBe(98);
  });
});

describe('handleHazmatLeak', () => {
  it('腐蚀性泄漏 → 紧急疏散', () => {
    expect(handleHazmatLeak('腐蚀性液体泄漏').emergency).toBe(true);
  });

  it('普通泄漏 → 常规清理', () => {
    expect(handleHazmatLeak('普通液体泄漏').emergency).toBe(false);
  });
});

describe('buildSpecialEquipHazmatReport', () => {
  it('生成设备数据', () => {
    const r = buildSpecialEquipHazmatReport('30d');
    expect(r.equipment.elevators).toBeGreaterThan(0);
  });

  it('生成医用气体数据', () => {
    const r = buildSpecialEquipHazmatReport('30d');
    expect(r.medicalGas.oxygen).toBe(true);
  });

  it('生成建议', () => {
    const r = buildSpecialEquipHazmatReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
