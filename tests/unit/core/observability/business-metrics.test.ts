/**
 * 健澜科技杠OS - 业务指标埋点单测
 *
 * 验证编排/工具/CDS/人工任务四类业务指标被正确记录并进入 Prometheus 渲染。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { describe, expect, it } from 'bun:test';

import { renderMetrics } from '@/bff/observability/metrics.js';
import {
  businessMetrics,
  recordAgentRun,
  recordCdsAlert,
  recordHumanTask,
  recordToolCall,
} from '@/core/observability/metrics.js';

describe('业务指标埋点', () => {
  it('记录智能体运行次数与时延', () => {
    const labels = { agent: 'metrics-test-agent', status: 'completed', trigger: 'api' };
    const before = businessMetrics.agentRuns.getValue(labels);
    recordAgentRun({ agent: 'metrics-test-agent', status: 'completed', trigger: 'api', durationSeconds: 0.12 });
    recordAgentRun({ agent: 'metrics-test-agent', status: 'failed', trigger: 'api', durationSeconds: 0.4 });
    expect(businessMetrics.agentRuns.getValue(labels)).toBe(before + 1);
    expect(
      businessMetrics.agentRuns.getValue({
        agent: 'metrics-test-agent',
        status: 'failed',
        trigger: 'api',
      }),
    ).toBeGreaterThanOrEqual(1);
    const out = renderMetrics();
    expect(out).toContain('gangos_agent_runs_total');
    expect(out).toContain('agent="metrics-test-agent"');
    expect(out).toContain('gangos_agent_run_duration_seconds_count');
  });

  it('记录医疗工具调用结果分类', () => {
    const labels = {
      tool: 'metrics_test_tool',
      category: 'test',
      risk: 'high',
      result: 'denied',
    };
    const before = businessMetrics.toolCalls.getValue(labels);
    recordToolCall({ tool: 'metrics_test_tool', category: 'test', risk: 'high', result: 'success' });
    recordToolCall({ tool: 'metrics_test_tool', category: 'test', risk: 'high', result: 'denied' });
    expect(businessMetrics.toolCalls.getValue(labels)).toBe(before + 1);
    expect(renderMetrics()).toContain('gangos_tool_calls_total');
  });

  it('记录 CDS 提醒的类型与级别', () => {
    const labels = { kind: 'block', severity: 'critical' };
    const before = businessMetrics.cdsAlerts.getValue(labels);
    recordCdsAlert({ kind: 'block', severity: 'critical' });
    recordCdsAlert({ kind: 'alert', severity: 'warning' });
    expect(businessMetrics.cdsAlerts.getValue(labels)).toBe(before + 1);
    expect(renderMetrics()).toContain('gangos_cds_alerts_total');
  });

  it('记录人工任务处置结局', () => {
    const before = businessMetrics.humanTasks.getValue({ outcome: 'approved' });
    recordHumanTask('approved');
    recordHumanTask('rejected');
    recordHumanTask('expired');
    recordHumanTask('cancelled');
    expect(businessMetrics.humanTasks.getValue({ outcome: 'approved' })).toBe(before + 1);
    expect(businessMetrics.humanTasks.getValue({ outcome: 'rejected' })).toBeGreaterThanOrEqual(1);
    expect(renderMetrics()).toContain('gangos_human_tasks_total');
  });
});
