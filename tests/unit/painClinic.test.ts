/**
 * 健澜科技 jlmedaios - 疼痛门诊纯函数测试（M52-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { needsEscalation, suggestRegimen, titrationResponse } from '../../src/medical-tools/nursing/painClinic.js';

describe('titrationResponse 滴定响应', () => {
  it('改善≥2分 → good', () => {
    expect(titrationResponse(8, 5)).toBe('good');
    expect(titrationResponse(8, 6)).toBe('good');
  });
  it('改善1分 → partial', () => {
    expect(titrationResponse(8, 7)).toBe('partial');
  });
  it('未改善/加重 → none', () => {
    expect(titrationResponse(5, 5)).toBe('none');
    expect(titrationResponse(5, 8)).toBe('none');
  });
});

describe('needsEscalation 升级判定', () => {
  it('current>=7 升级', () => {
    expect(needsEscalation(7, 0)).toBe(true);
    expect(needsEscalation(9, 0)).toBe(true);
  });
  it('爆发痛>=3 升级', () => {
    expect(needsEscalation(3, 3)).toBe(true);
    expect(needsEscalation(4, 5)).toBe(true);
  });
  it('低 NRS 且少爆发痛不升级', () => {
    expect(needsEscalation(2, 1)).toBe(false);
  });
});

describe('suggestRegimen 方案建议', () => {
  it('current>=7 → 加量', () => {
    expect(suggestRegimen(8, 0)).toBe('escalate_dose');
  });
  it('爆发痛>=3 且 NRS<7 → 爆发痛补救', () => {
    expect(suggestRegimen(4, 3)).toBe('breakthrough_rescue');
  });
  it('滴定响应非good → 换药', () => {
    expect(suggestRegimen(5, 0, 6)).toBe('switch_drug');
  });
  it('响应good 且稳定 → 维持', () => {
    expect(suggestRegimen(5, 0, 7)).toBe('continue');
  });
});
