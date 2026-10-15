/**
 * 健澜科技 jlmedaios - M142-A 健康体检管理纯函数单测（预防保健与患者服务）
 *
 * 覆盖：体检开单（套餐校验/项目校验）、结果记录（自动 flag/通俗解读/异常标红）、
 *       报告生成（一句话总结/异常汇总/总体建议）。纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';
import {
  CheckupError,
  CHECKUP_PACKAGES,
  createCheckupOrder,
  generateCheckupReport,
  recordCheckupResult,
} from '../../src/bff/aggregators/healthCheckupAggregator.js';

describe('M142-A 体检开单 createCheckupOrder', () => {
  it('合法套餐 + 项目清单，返回带 id 的体检单', () => {
    const order = createCheckupOrder('patient-001', '健康体检', ['血压', '空腹血糖', 'BMI']);
    expect(order.id).toBeTruthy();
    expect(order.patientId).toBe('patient-001');
    expect(order.packageName).toBe('健康体检');
    expect(order.items).toEqual(['血压', '空腹血糖', 'BMI']);
    expect(order.status).toBe('ordered');
  });

  it('五种套餐均可开单', () => {
    for (const pkg of CHECKUP_PACKAGES) {
      const order = createCheckupOrder('patient-pkg', pkg, ['血压']);
      expect(order.packageName).toBe(pkg);
    }
  });

  it('非法套餐抛 400', () => {
    expect(() => createCheckupOrder('patient-x', '私人体检' as never, ['血压'])).toThrowError(CheckupError);
  });

  it('空项目清单抛 400', () => {
    expect(() => createCheckupOrder('patient-x', '健康体检', [])).toThrowError(CheckupError);
  });
});

describe('M142-A 结果记录 recordCheckupResult', () => {
  it('数值在参考区间内 → flag=N、不标红', () => {
    const order = createCheckupOrder('patient-002', '健康体检', ['血压']);
    const r = recordCheckupResult(order.id, '收缩压', 118, 'mmHg', '90-140', '');
    expect(r.flag).toBe('N');
    expect(r.abnormal).toBe(false);
    expect(r.plainText).toContain('正常');
  });

  it('数值高于参考区间 → 自动判 H、标红、给低盐+复查建议', () => {
    const order = createCheckupOrder('patient-003', '健康体检', ['血压']);
    const r = recordCheckupResult(order.id, '收缩压', 150, 'mmHg', '90-140', '');
    expect(r.flag).toBe('H');
    expect(r.abnormal).toBe(true);
    expect(r.advice).toContain('低盐');
    expect(r.advice).toContain('复查');
  });

  it('数值低于参考区间 → 自动判 L', () => {
    const order = createCheckupOrder('patient-004', '健康体检', ['血红蛋白']);
    const r = recordCheckupResult(order.id, '血红蛋白', 100, 'g/L', '115-150', '');
    expect(r.flag).toBe('L');
    expect(r.abnormal).toBe(true);
    expect(r.plainText).toContain('贫血');
  });

  it('调用方显式传入 flag 时尊重其结论', () => {
    const order = createCheckupOrder('patient-005', '专项检查', ['白细胞']);
    const r = recordCheckupResult(order.id, '白细胞', 6.0, '10^9/L', '4-10', 'H');
    expect(r.flag).toBe('H');
    expect(r.abnormal).toBe(true);
  });

  it('未知体检单 → 抛 404', () => {
    expect(() => recordCheckupResult('no-such-id', '血压', 120, 'mmHg', '90-140', '')).toThrowError(CheckupError);
  });

  it('非数字 value → 抛 400', () => {
    const order = createCheckupOrder('patient-006', '健康体检', ['血压']);
    expect(() => recordCheckupResult(order.id, '血压', Number.NaN, 'mmHg', '90-140', '')).toThrowError(CheckupError);
  });
});

describe('M142-A 报告生成 generateCheckupReport', () => {
  it('汇总正常/异常项，生成一句话总结与总体建议', () => {
    const order = createCheckupOrder('patient-100', '老年体检', ['收缩压', '空腹血糖', 'BMI']);
    recordCheckupResult(order.id, '收缩压', 152, 'mmHg', '90-140', '');      // H
    recordCheckupResult(order.id, '空腹血糖', 5.2, 'mmol/L', '3.9-6.1', '');    // N
    recordCheckupResult(order.id, 'BMI', 29, 'kg/m²', '18.5-24', '');         // H

    const report = generateCheckupReport(order.id);
    expect(report.checkupId).toBe(order.id);
    expect(report.totalItems).toBe(3);
    expect(report.abnormalCount).toBe(2);
    expect(report.normalCount).toBe(1);
    expect(report.abnormalItems.map((r) => r.item)).toContain('收缩压');
    // “看得懂”：总结是大白话，不只是数字
    expect(report.summary).toContain('需要关注');
    expect(report.overallAdvice).toContain('收缩压');
  });

  it('全部正常时总结为正向鼓励、无异常项', () => {
    const order = createCheckupOrder('patient-101', '入职体检', ['血压']);
    recordCheckupResult(order.id, '收缩压', 120, 'mmHg', '90-140', '');
    const report = generateCheckupReport(order.id);
    expect(report.abnormalCount).toBe(0);
    expect(report.abnormalItems).toHaveLength(0);
    expect(report.summary).toContain('正常');
  });

  it('未知体检单生成报告 → 抛 404', () => {
    expect(() => generateCheckupReport('nope')).toThrowError(CheckupError);
  });
});
