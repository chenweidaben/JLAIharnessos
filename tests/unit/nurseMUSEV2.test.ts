/**
 * 健澜科技 jlmedaios - Nurse MUSE V2 纯函数单测（M185-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildNurseMUSE,
  type NursingTaskV2,
} from '../../src/bff/aggregators/nurseMUSEV2Aggregator';

describe('buildNurseMUSE', () => {
  it('高优先级任务 → 跌倒风险 high', () => {
    const tasks: NursingTaskV2[] = [
      { taskId: 't1', patientName: '张', taskType: 'infusion', scheduledTime: '09:00', priority: 'high' },
    ];
    const r = buildNurseMUSE('n1', '2026-10-16', tasks);
    expect(r.riskAssessment.fall).toBe('high');
  });

  it('有翻身任务 → 压疮风险 medium', () => {
    const tasks: NursingTaskV2[] = [
      { taskId: 't1', patientName: '张', taskType: 'turnover', scheduledTime: '09:00', priority: 'low' },
    ];
    const r = buildNurseMUSE('n1', '2026-10-16', tasks);
    expect(r.riskAssessment.pressureUlcer).toBe('medium');
  });

  it('高风险时生成知识推荐', () => {
    const tasks: NursingTaskV2[] = [
      { taskId: 't1', patientName: '张', taskType: 'infusion', scheduledTime: '09:00', priority: 'high' },
      { taskId: 't2', patientName: '李', taskType: 'turnover', scheduledTime: '10:00', priority: 'low' },
    ];
    const r = buildNurseMUSE('n1', '2026-10-16', tasks);
    expect(r.knowledgeRecommendations.length).toBeGreaterThan(0);
  });

  it('经验库至少包含1条', () => {
    const r = buildNurseMUSE('n1', '2026-10-16', []);
    expect(r.experienceLibrary.length).toBeGreaterThanOrEqual(1);
  });
});
