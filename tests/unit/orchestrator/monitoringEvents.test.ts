/**
 * 健澜AI原生医院操作系统OS - S-05 阶段① 监控事件字段与实例摘要聚合测试
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, expect, it } from 'bun:test';
import { ExecutionRecorder, ExecutionEventType } from '@/orchestrator/engine/recorder.js';
import { WorkflowState } from '@/orchestrator/dsl/types.js';

describe('监控事件负载补齐', () => {
  it('节点耗时、模型/知识/提示词版本、备用模型切换与降级动作进入事件负载', () => {
    const recorder = new ExecutionRecorder('inst-mon-001', 'wf-demo', 'trace-mon-001');
    recorder.record(ExecutionEventType.NODE_STARTED, { attempt: 1, type: 'llm' }, 'llm1');
    recorder.record(
      ExecutionEventType.NODE_COMPLETED,
      {
        output: { text: '离线合成结果' },
        tokens: { input: 12, output: 8 },
        durationMs: 36,
        modelId: 'demo-model',
        modelVersion: '1.0.0',
        knowledgeVersion: ['clinical-v1'],
        promptVersion: 'prompt-v1',
        fallbackModelSwitched: false,
        degradationAction: 'none',
      },
      'llm1',
    );

    const completed = recorder.getEvents().find((event) => event.type === ExecutionEventType.NODE_COMPLETED);
    expect(completed?.nodeId).toBe('llm1');
    expect(completed?.payload).toMatchObject({
      durationMs: 36,
      modelId: 'demo-model',
      modelVersion: '1.0.0',
      knowledgeVersion: ['clinical-v1'],
      promptVersion: 'prompt-v1',
      fallbackModelSwitched: false,
      degradationAction: 'none',
    });
  });

  it('人工干预点与动作进入事件负载', () => {
    const recorder = new ExecutionRecorder('inst-mon-002', 'wf-demo', 'trace-mon-002');
    recorder.record(ExecutionEventType.HUMAN_TASK_CREATED, { humanInterventionPoint: 'review', humanAction: 'pending', taskId: 'h1' }, 'review');
    recorder.record(
      ExecutionEventType.HUMAN_TASK_RESOLVED,
      { humanInterventionPoint: 'review', humanAction: 'modified', reviewerId: 'doctor-demo-001', comment: '人工修改草稿' },
      'review',
    );
    const resolved = recorder.getEvents().find((event) => event.type === ExecutionEventType.HUMAN_TASK_RESOLVED);
    expect(resolved?.payload).toMatchObject({ humanInterventionPoint: 'review', humanAction: 'modified' });
  });
});

describe('实例摘要聚合', () => {
  it('完成率、平均耗时、失败/人工/模型调用/异常分类数值正确，既有字段口径不丢', () => {
    const recorder = new ExecutionRecorder('inst-mon-003', 'wf-demo', 'trace-mon-003');
    recorder.record(ExecutionEventType.NODE_STARTED, { attempt: 1 }, 'llm1');
    recorder.record(
      ExecutionEventType.NODE_COMPLETED,
      {
        durationMs: 20,
        modelId: 'demo-model',
        tokens: { input: 10, output: 6 },
      },
      'llm1',
    );
    recorder.record(ExecutionEventType.NODE_STARTED, { attempt: 1 }, 'tool1');
    recorder.record(ExecutionEventType.NODE_FAILED, { anomalyCode: 'timeout', attempt: 1 }, 'tool1');
    recorder.record(ExecutionEventType.NODE_RETRYING, { anomalyCode: 'timeout', attempt: 2 }, 'tool1');
    recorder.record(ExecutionEventType.HUMAN_TASK_CREATED, { humanInterventionPoint: 'review' }, 'review');
    recorder.record(ExecutionEventType.HUMAN_TASK_RESOLVED, { humanInterventionPoint: 'review', humanAction: 'modified' }, 'review');

    const summary = recorder.summarize(WorkflowState.COMPLETED);
    expect(summary.nodesExecuted).toBe(1);
    expect(summary.nodesFailed).toBe(1);
    expect(summary.totalAttempts).toBeGreaterThanOrEqual(2);
    expect(summary.tokens).toEqual({ input: 10, output: 6 });
    expect(summary.completionRate).toBeCloseTo(1 / 2, 3);
    expect(summary.avgNodeDurationMs).toBe(20);
    expect(summary.failureCount).toBe(1);
    expect(summary.humanInterventionCount).toBe(1);
    expect(summary.humanModificationCount).toBe(1);
    expect(summary.modelCalls).toEqual([{ modelId: 'demo-model', calls: 1, tokensInput: 10, tokensOutput: 6 }]);
    expect(summary.anomalyBreakdown).toEqual({ timeout: 2 });
  });
});
