/**
 * 健澜科技 jlmedaios - 设备物资管理纯函数单测（M191-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildEquipmentMaterialReport,
  calculateEquipmentROI,
  type EquipmentData,
} from '../../src/bff/aggregators/equipmentMaterialAggregator';

describe('calculateEquipmentROI', () => {
  it('ROI = 年净收入/初始成本', () => {
    const data: EquipmentData = { initialCost: 1000000, annualRevenue: 300000, annualMaintenanceCost: 50000, expectedLifeYears: 8 };
    const r = calculateEquipmentROI(data);
    expect(r.roi).toBe(25);
  });

  it('回收期 = 初始成本/年净收入', () => {
    const data: EquipmentData = { initialCost: 1000000, annualRevenue: 300000, annualMaintenanceCost: 50000, expectedLifeYears: 8 };
    const r = calculateEquipmentROI(data);
    expect(r.paybackYears).toBe(4);
  });

  it('负收益 → 回收期 99', () => {
    const data: EquipmentData = { initialCost: 1000000, annualRevenue: 50000, annualMaintenanceCost: 100000, expectedLifeYears: 8 };
    expect(calculateEquipmentROI(data).paybackYears).toBe(99);
  });
});

describe('buildEquipmentMaterialReport', () => {
  it('生成设备台账', () => {
    const r = buildEquipmentMaterialReport('设备科', '30d');
    expect(r.ledger.large).toBeGreaterThan(0);
  });

  it('生成使用指标', () => {
    const r = buildEquipmentMaterialReport('设备科', '30d');
    expect(r.utilization.uptimeRate).toBeGreaterThan(0);
  });

  it('生成 ROI 列表', () => {
    const r = buildEquipmentMaterialReport('设备科', '30d');
    expect(r.rois.length).toBeGreaterThan(0);
  });

  it('生成预警', () => {
    const r = buildEquipmentMaterialReport('设备科', '30d');
    expect(r.alerts.length).toBeGreaterThan(0);
  });
});
