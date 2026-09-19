/**
 * 健澜科技数智医院智能体操作系统（jlmedaios）
 * Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
 *
 * 单元测试 - 真实 SkillInvoker：工具映射 / 参数校验失败 / LLM 步骤 / 高风险拦截。
 * LLM 用 Mock client，不打真实网络。
 */

import { describe, expect, it } from 'bun:test';

import { createRegistryWithFirstBatch } from '@/medical-tools/registry';
import type { ILLMClient } from '@/core/agent/LLMClient';
import type { LLMModelConfig, LLMRequestParams, LLMStreamEvent } from '@/core/agent/loopTypes';

import {
  buildMockSkillInvokers,
  buildRealSkillInvokers,
} from '@/skills/integration/realInvoker';
import { executeSkill } from '@/skills/executor';
import { parseSkillMarkdown } from '@/skills/loader';

// ---------------------------------------------------------------------------
// Mock LLM client
// ---------------------------------------------------------------------------

class FakeLlmClient implements ILLMClient {
  public lastRequest: { system: string; user: string } | null = null;
  constructor(private readonly reply = '【Mock LLM】结构化病历草稿') {}

  getModel(): LLMModelConfig {
    return { alias: 'sonnet', model: 'fake', contextWindow: 1000 };
  }
  getCumulativeUsage() {
    return { input: 10, output: 20 };
  }
  async *streamChat(params: LLMRequestParams): AsyncGenerator<LLMStreamEvent> {
    this.lastRequest = {
      system: params.system,
      user: params.messages[0].content[0].type === 'text' ? params.messages[0].content[0].text : '',
    };
    yield { type: 'message_start', timestamp: Date.now() };
    yield { type: 'message_stop', usage: { input: 10, output: 20 }, text: this.reply, toolCalls: [], stopReason: 'end_turn', timestamp: Date.now() };
  }
}

function mdWithTools(extra: string): string {
  return `---
id: real-invoker-test
name: 真实invoker测试
version: 1.0.0
category: 测试
summary: s
roles: [R05]
riskLevel: low
steps:
${extra}
---
正文
`;
}

// ============================================================================
describe('buildRealSkillInvokers 工具映射', () => {
  it('真实调用已注册工具并返回结构化结果', async () => {
    const inv = buildRealSkillInvokers({ userId: 'u1', userName: '王医生' });
    const res = await inv.invokeTool('get_patient_detail', { patientId: 'P2026090001' });
    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
  });

  it('工具不存在返回 TOOL_NOT_FOUND', async () => {
    const inv = buildRealSkillInvokers({ userId: 'u1', userName: '王医生' });
    const res = await inv.invokeTool('no_such_tool', {});
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('TOOL_NOT_FOUND');
  });

  it('入参校验失败返回 VALIDATION_ERROR 而非抛错', async () => {
    const inv = buildRealSkillInvokers({ userId: 'u1', userName: '王医生' });
    // get_patient_detail 需要 patientId 字符串，这里传空对象
    const res = await inv.invokeTool('get_patient_detail', {});
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('VALIDATION_ERROR');
  });

  it('注册表可注入（用空注册表测 TOOL_NOT_FOUND 分支）', async () => {
    const { DefaultMedicalToolRegistry } = await import('@/medical-tools/framework');
    const inv = buildRealSkillInvokers({
      userId: 'u',
      userName: 'n',
      registry: new DefaultMedicalToolRegistry(),
    });
    const res = await inv.invokeTool('get_patient_detail', { patientId: 'x' });
    expect(res.success).toBe(false);
  });
});

// ============================================================================
describe('buildRealSkillInvokers LLM 步骤', () => {
  it('agent 步骤经 Mock LLM 产出文本与用量', async () => {
    const fake = new FakeLlmClient();
    const inv = buildRealSkillInvokers({ userId: 'u1', userName: '王医生', llm: fake });
    const res = await inv.invokeAgent('medical-record-writer', { patientId: 'P1', chiefComplaint: '发热3天' });
    expect(res.success).toBe(true);
    const data = res.data as { text: string; usage: { input: number; output: number } };
    expect(data.text).toContain('结构化病历草稿');
    expect(data.usage.output).toBe(20);
    // 系统提示词已按 agentId 角色化
    expect(fake.lastRequest?.system).toContain('门诊医师助手');
  });
});

// ============================================================================
describe('真实 invoker 驱动技能执行 + 高风险拦截', () => {
  it('低风险技能端到端跑通真实工具+LLM', async () => {
    const md = mdWithTools(`  - id: s1
    kind: tool
    name: 查患者
    tool: get_patient_detail
    input: { patientId: 'P2026090001' }
  - id: s2
    kind: agent
    name: AI生成
    agent: medical-record-writer
    input: { patientId: 'P2026090001' }`);
    const { manifest, body } = parseSkillMarkdown(md);
    const inv = buildRealSkillInvokers({
      userId: 'u1',
      userName: '王医生',
      llm: new FakeLlmClient(),
    });
    const result = await executeSkill(
      { manifest, body, filePath: 'SKILL.md' },
      {
        user: { userId: 'u1', userName: '王医生', roles: ['R05'] },
        inputs: {},
        invokers: inv,
        confirm: { async requestUserConfirm() { return true; }, async requestDoubleConfirm() { return true; } },
      },
    );
    expect(result.status).toBe('succeeded');
  });

  it('高风险技能：真实 invoker 下拒绝确认仍中止（不绕过三级确认）', async () => {
    const md = mdWithTools(`  - id: s1
    kind: tool
    name: 写操作
    tool: get_patient_detail
    input: { patientId: 'P2026090001' }`).replace('riskLevel: low', 'riskLevel: high');
    const { manifest, body } = parseSkillMarkdown(md);
    const inv = buildRealSkillInvokers({
      userId: 'u1',
      userName: '王医生',
      llm: new FakeLlmClient(),
    });
    const result = await executeSkill(
      { manifest, body, filePath: 'SKILL.md' },
      {
        user: { userId: 'u1', userName: '王医生', roles: ['R05'] },
        inputs: {},
        invokers: inv,
        confirm: {
          async requestUserConfirm() { return false; },
          async requestDoubleConfirm() { return false; },
        },
      },
    );
    expect(result.status).toBe('aborted');
  });
});

// ============================================================================
describe('buildMockSkillInvokers（可切换实现）', () => {
  it('记录调用轨迹', async () => {
    const track: string[] = [];
    const inv = buildMockSkillInvokers(track);
    await inv.invokeTool('get_patient_detail', {});
    await inv.invokeAgent('x-agent', {});
    expect(track).toContain('tool:get_patient_detail');
    expect(track).toContain('agent:x-agent');
  });
});
