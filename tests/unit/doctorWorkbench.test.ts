/**
 * 健澜科技 jlmedaios - 医生站工作台纯函数测试（M79-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import { riskLevel, summarize, todoCount } from '../../src/medical-tools/nursing/doctorWorkbench.js';

describe('riskLevel', () => {
  it('red：感染率高', () => {
    expect(riskLevel(6, 10)).toBe('red');
  });
  it('red：DDDs 高', () => {
    expect(riskLevel(1, 60)).toBe('red');
  });
  it('yellow：接近阈值', () => {
    expect(riskLevel(4, 45)).toBe('yellow');
  });
  it('green：正常', () => {
    expect(riskLevel(1, 20)).toBe('green');
  });
});

describe('todoCount', () => {
  it('返回待办/未读/高优待办', () => {
    expect(todoCount(5, 3, 2)).toEqual({ openTasks: 5, unread: 3, critical: 2 });
  });
});

describe('summarize', () => {
  it('汇总告警/随访/KPI', () => {
    expect(summarize({ urgentAlerts: 2, followupsToday: 4, kpiBlocks: 3 }))
      .toEqual({ urgentAlerts: 2, followupsToday: 4, kpis: 3 });
  });
});
