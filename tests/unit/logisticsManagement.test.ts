/**
 * 健澜科技 jlmedaios - 后勤管理纯函数单测（M192-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildLogisticsManagementReport,
  calculateEnergyEfficiency,
  predictLogisticsNeed,
  type EnergyData,
} from '../../src/bff/aggregators/logisticsManagementAggregator';

describe('calculateEnergyEfficiency', () => {
  it('单位面积能耗 > 0', () => {
    const data: EnergyData = { waterUsage: 10000, electricityUsage: 100000, gasUsage: 1000, steamUsage: 500, buildingArea: 10000, patientVolume: 5000 };
    expect(calculateEnergyEfficiency(data).perArea).toBeGreaterThan(0);
  });

  it('人均能耗 > 0', () => {
    const data: EnergyData = { waterUsage: 10000, electricityUsage: 100000, gasUsage: 1000, steamUsage: 500, buildingArea: 10000, patientVolume: 5000 };
    expect(calculateEnergyEfficiency(data).perPatient).toBeGreaterThan(0);
  });

  it('空数据 → 0', () => {
    const data: EnergyData = { waterUsage: 0, electricityUsage: 0, gasUsage: 0, steamUsage: 0, buildingArea: 0, patientVolume: 0 };
    expect(calculateEnergyEfficiency(data).perArea).toBe(0);
  });
});

describe('predictLogisticsNeed', () => {
  it('门诊量越大需要人员越多', () => {
    const small = predictLogisticsNeed(1000);
    const large = predictLogisticsNeed(5000);
    expect(large.housekeeping).toBeGreaterThan(small.housekeeping);
  });

  it('返回四类后勤岗位', () => {
    const r = predictLogisticsNeed(1000);
    expect(r.housekeeping).toBeGreaterThan(0);
    expect(r.security).toBeGreaterThan(0);
    expect(r.catering).toBeGreaterThan(0);
    expect(r.linen).toBeGreaterThan(0);
  });
});

describe('buildLogisticsManagementReport', () => {
  it('生成物业数据', () => {
    const r = buildLogisticsManagementReport('后勤处', '30d');
    expect(r.housekeeping.satisfaction).toBeGreaterThan(0);
  });

  it('生成能源数据', () => {
    const r = buildLogisticsManagementReport('后勤处', '30d');
    expect(r.energy.electricity).toBeGreaterThan(0);
  });

  it('生成预测需求', () => {
    const r = buildLogisticsManagementReport('后勤处', '30d');
    expect(r.predictedNeed.housekeeping).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildLogisticsManagementReport('后勤处', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
