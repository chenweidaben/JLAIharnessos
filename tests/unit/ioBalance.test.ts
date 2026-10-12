/**
 * 健澜科技 jlmedaios - 出入量纯函数单测（M17-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { shiftOf, summarize24h, summarizeByShift, summarizeIo } from '../../src/medical-tools/nursing/ioBalance';

describe('ioBalance 汇总/平衡', () => {
  it('intake-output=balance', () => {
    const m = summarizeIo([
      { direction: 'intake', amountMl: 1000, recordTime: '2026-10-12T08:00:00Z' },
      { direction: 'intake', amountMl: 500, recordTime: '2026-10-12T10:00:00Z' },
      { direction: 'output', amountMl: 800, recordTime: '2026-10-12T12:00:00Z' },
    ]);
    expect(m.intakeTotal).toBe(1500);
    expect(m.outputTotal).toBe(800);
    expect(m.balance).toBe(700);
  });
  it('空数组平衡 0', () => {
    expect(summarizeIo([])).toEqual({ intakeTotal: 0, outputTotal: 0, balance: 0 });
  });
});

describe('ioBalance 24h 窗口', () => {
  it('只统计 24h 内', () => {
    const now = new Date('2026-10-12T12:00:00Z');
    const rows = [
      { direction: 'intake' as const, amountMl: 100, recordTime: '2026-10-12T10:00:00Z' },
      { direction: 'intake' as const, amountMl: 999, recordTime: '2026-10-01T10:00:00Z' },
    ];
    expect(summarize24h(rows, now).intakeTotal).toBe(100);
  });
});

describe('ioBalance 班次切分', () => {
  it('shiftOf', () => {
    expect(shiftOf(new Date('2026-10-12T08:00:00'))).toBe('day');
    expect(shiftOf(new Date('2026-10-12T16:00:00'))).toBe('evening');
    expect(shiftOf(new Date('2026-10-12T23:00:00'))).toBe('night');
  });
  it('byShift 分组', () => {
    const rows = [
      { direction: 'intake' as const, amountMl: 100, recordTime: new Date('2026-10-12T08:00:00') },
      { direction: 'output' as const, amountMl: 50, recordTime: new Date('2026-10-12T16:00:00') },
    ];
    const s = summarizeByShift(rows);
    expect(s.day.intakeTotal).toBe(100);
    expect(s.evening.outputTotal).toBe(50);
  });
});
