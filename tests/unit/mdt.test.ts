/**
 * 健澜科技 jlmedaios - MDT 纯函数测试（M66-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { isUrgent, needsTreatmentPlan, nextStatus } from '../../src/medical-tools/nursing/mdt.js';

describe('nextStatus', () => {
  it('requested -> scheduled/cancelled', () => {
    expect(nextStatus('requested')).toEqual(['scheduled', 'cancelled']);
  });
  it('concluded 无后继', () => {
    expect(nextStatus('concluded')).toEqual([]);
  });
});

describe('isUrgent', () => {
  it('reason 含急', () => {
    expect(isUrgent('急会诊', '肿瘤')).toBe(true);
  });
  it('常规不紧急', () => {
    expect(isUrgent('常规讨论', '肺癌术后')).toBe(false);
  });
});

describe('needsTreatmentPlan', () => {
  it('concluded 需要转治疗方案', () => {
    expect(needsTreatmentPlan('concluded')).toBe(true);
  });
  it('requested 不需要', () => {
    expect(needsTreatmentPlan('requested')).toBe(false);
  });
});
