/**
 * 健澜科技 jlmedaios - 给药三查七对前端 utils 单测（M17-B）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { describe, expect, it } from 'vitest';
import {
  medStatusLabel,
  medErrorLabel,
  medStatusColor,
  previewHighRisk,
} from '@/utils/medAdmin';

describe('M17-B utils 标签', () => {
  it('状态中文', () => {
    expect(medStatusLabel('given')).toBe('已给药');
    expect(medStatusLabel('held')).toBe('暂缓');
    expect(medStatusLabel('waste')).toBe('报损');
  });
  it('差错中文', () => {
    expect(medErrorLabel('wrong_patient')).toBe('错患者');
    expect(medErrorLabel(null)).toBe('无差错');
    expect(medErrorLabel('adr')).toBe('不良反应(ADR)');
  });
  it('状态色', () => {
    expect(medStatusColor('given')).toBe('green');
    expect(medStatusColor('cancelled')).toBe('default');
  });
  it('高危药预估', () => {
    expect(previewHighRisk('盐酸吗啡')).toBe(true);
    expect(previewHighRisk('维生素C')).toBe(false);
    expect(previewHighRisk('')).toBe(false);
  });
});
