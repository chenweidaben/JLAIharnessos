/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * format 工具函数测试：日期时间 / 数字 / 百分比 / 医疗数据
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelative,
  formatNumber,
  formatPercent,
  formatMedicalValue,
  formatBloodPressure,
} from '@/utils/format';

afterEach(() => {
  vi.useRealTimers();
});

describe('formatDate', () => {
  it('格式化 Date 对象为 YYYY-MM-DD', () => {
    expect(formatDate(new Date('2026-09-16T08:30:00'))).toBe('2026-09-16');
  });

  it('格式化时间戳', () => {
    expect(formatDate(new Date('2026-01-01T00:00:00').getTime())).toBe('2026-01-01');
  });

  it('格式化日期字符串', () => {
    expect(formatDate('2026-09-16')).toBe('2026-09-16');
  });
});

describe('formatDateTime', () => {
  it('输出 YYYY-MM-DD HH:mm', () => {
    expect(formatDateTime(new Date('2026-09-16T14:05:00'))).toBe('2026-09-16 14:05');
  });
});

describe('formatTime', () => {
  it('输出 HH:mm:ss', () => {
    expect(formatTime(new Date('2026-09-16T14:05:09'))).toBe('14:05:09');
  });
});

describe('formatRelative', () => {
  it('1 分钟内显示"刚刚"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T10:00:00'));
    expect(formatRelative(new Date('2026-09-16T10:00:30'))).toBe('刚刚');
  });

  it('小于 60 分钟显示"N分钟前"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T10:30:00'));
    expect(formatRelative(new Date('2026-09-16T10:10:00'))).toBe('20分钟前');
  });

  it('小于 24 小时显示"N小时前"', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T15:00:00'));
    expect(formatRelative(new Date('2026-09-16T08:00:00'))).toBe('7小时前');
  });

  it('超过 24 小时显示日期', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-16T15:00:00'));
    expect(formatRelative(new Date('2026-09-14T08:00:00'))).toBe('2026-09-14');
  });
});

describe('formatNumber', () => {
  it('千分位格式化数字', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('字符串数字转千分位', () => {
    expect(formatNumber('86400')).toBe('86,400');
  });

  it('NaN 输入返回原值', () => {
    expect(formatNumber('abc')).toBe('abc');
  });
});

describe('formatPercent', () => {
  it('小数转百分比（默认 1 位小数）', () => {
    expect(formatPercent(0.856)).toBe('85.6%');
  });

  it('自定义小数位', () => {
    expect(formatPercent(0.8567, 2)).toBe('85.67%');
  });

  it('0 值', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });
});

describe('formatMedicalValue', () => {
  it('正常数值带单位', () => {
    expect(formatMedicalValue(8.6, 'mmol/L', 1)).toBe('8.6 mmol/L');
  });

  it('无单位时仅返回数值', () => {
    expect(formatMedicalValue(98.6, undefined, 1)).toBe('98.6');
  });

  it('undefined 返回 "--"', () => {
    expect(formatMedicalValue(undefined)).toBe('--');
  });

  it('NaN 返回 "--"', () => {
    expect(formatMedicalValue(NaN)).toBe('--');
  });

  it('自定义小数位', () => {
    expect(formatMedicalValue(12.345, 'mmHg', 2)).toBe('12.35 mmHg');
  });
});

describe('formatBloodPressure', () => {
  it('正常血压', () => {
    expect(formatBloodPressure(128, 82)).toBe('128/82 mmHg');
  });

  it('收缩压缺失返回 "--"', () => {
    expect(formatBloodPressure(undefined, 82)).toBe('--');
  });

  it('舒张压缺失返回 "--"', () => {
    expect(formatBloodPressure(128, undefined)).toBe('--');
  });
});
