/**
 * 健澜科技 jlmedaios - 医保管理纯函数单测（M192-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildInsuranceManagementReport,
  calculateInsuranceSettlement,
  detectInsuranceViolation,
  type InsuranceRecord,
} from '../../src/bff/aggregators/insuranceManagementAggregator';

describe('detectInsuranceViolation', () => {
  it('虚假住院 → 检出', () => {
    const r: InsuranceRecord = { totalCost: 10000, insuranceType: 'employee', itemCount: 20, averageCost: 500, isFakeHospitalization: true, isUpcoding: false };
    expect(detectInsuranceViolation(r).hasViolation).toBe(true);
  });

  it('高套分值 → 检出', () => {
    const r: InsuranceRecord = { totalCost: 10000, insuranceType: 'employee', itemCount: 20, averageCost: 500, isFakeHospitalization: false, isUpcoding: true };
    expect(detectInsuranceViolation(r).types).toContain('高套分值');
  });

  it('正常记录 → 无违规', () => {
    const r: InsuranceRecord = { totalCost: 5000, insuranceType: 'employee', itemCount: 30, averageCost: 200, isFakeHospitalization: false, isUpcoding: false };
    expect(detectInsuranceViolation(r).hasViolation).toBe(false);
  });
});

describe('calculateInsuranceSettlement', () => {
  it('职工医保统筹比例更高', () => {
    const employee: InsuranceRecord = { totalCost: 10000, insuranceType: 'employee', itemCount: 30, averageCost: 300, isFakeHospitalization: false, isUpcoding: false };
    const resident: InsuranceRecord = { totalCost: 10000, insuranceType: 'resident', itemCount: 30, averageCost: 300, isFakeHospitalization: false, isUpcoding: false };
    expect(calculateInsuranceSettlement(employee).pooling).toBeGreaterThan(calculateInsuranceSettlement(resident).pooling);
  });

  it('各项之和 = 总费用', () => {
    const r: InsuranceRecord = { totalCost: 10000, insuranceType: 'employee', itemCount: 30, averageCost: 300, isFakeHospitalization: false, isUpcoding: false };
    const s = calculateInsuranceSettlement(r);
    expect(s.pooling + s.personal + s.selfPay + s.selfExpense).toBe(10000);
  });
});

describe('buildInsuranceManagementReport', () => {
  it('生成政策统计', () => {
    const r = buildInsuranceManagementReport('医保办', '30d');
    expect(r.policies.employee).toBeGreaterThan(0);
  });

  it('生成违规统计', () => {
    const r = buildInsuranceManagementReport('医保办', '30d');
    expect(r.violations.count).toBeGreaterThanOrEqual(0);
  });

  it('生成 DRG 配置', () => {
    const r = buildInsuranceManagementReport('医保办', '30d');
    expect(r.drgConfig.enabled).toBe(true);
  });

  it('生成建议', () => {
    const r = buildInsuranceManagementReport('医保办', '30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
