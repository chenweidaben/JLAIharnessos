/**
 * 健澜科技 jlmedaios - 多 Agent 纯函数单测（M201-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildMultiAgentReport,
  orchestrateAgents,
  resolveAgentConflict,
  type AgentInfo,
  type AgentOpinion,
  type TaskData,
} from '../../src/bff/aggregators/multiAgentAggregator';

describe('orchestrateAgents', () => {
  it('分配能力最强的为 lead', () => {
    const agents: AgentInfo[] = [
      { name: 'A', specialty: '内科', capability: 0.7 },
      { name: 'B', specialty: '外科', capability: 0.9 },
    ];
    const task: TaskData = { description: '会诊', priority: 1 };
    const r = orchestrateAgents(task, agents);
    expect(r.lead.name).toBe('B');
  });
});

describe('resolveAgentConflict', () => {
  it('高置信度意见 → 优先采纳', () => {
    const opinions: AgentOpinion[] = [
      { agent: 'A', recommendation: '方案一', confidence: 0.9 },
      { agent: 'B', recommendation: '方案二', confidence: 0.5 },
    ];
    const r = resolveAgentConflict(opinions);
    expect(r.decision).toBe('方案一');
    expect(r.method).toBe('高置信优先');
  });

  it('低置信度 → 投票表决', () => {
    const opinions: AgentOpinion[] = [
      { agent: 'A', recommendation: '方案一', confidence: 0.5 },
      { agent: 'B', recommendation: '方案二', confidence: 0.5 },
      { agent: 'C', recommendation: '方案二', confidence: 0.6 },
    ];
    const r = resolveAgentConflict(opinions);
    expect(r.method).toBe('投票表决');
  });
});

describe('buildMultiAgentReport', () => {
  it('生成 Agent 数据', () => {
    const r = buildMultiAgentReport('30d');
    expect(r.agents.total).toBe(5);
  });

  it('生成编排数据', () => {
    const r = buildMultiAgentReport('30d');
    expect(r.orchestration.tasks).toBeGreaterThan(0);
  });

  it('生成协作数据', () => {
    const r = buildMultiAgentReport('30d');
    expect(r.collaboration.decisions).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildMultiAgentReport('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
