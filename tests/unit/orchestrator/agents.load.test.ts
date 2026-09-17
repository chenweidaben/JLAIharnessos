/**
 * 健澜科技杠OS - 十大刚需智能体包全量加载校验测试
 *
 * 遍历 agents/ 目录下全部智能体，验证：
 *   1. agent.yaml 可解析、通过 Zod schema；
 *   2. 引用的工具真实存在（36 个医疗工具 + transcribe_voice）；
 *   3. 工作流通过 DAG 校验（无环、可达、端口/引用完整）；
 *   4. systemPrompt 等提示词引用在包内存在；
 *   5. 包校验和一致。
 *
 * 知识库为部署期可插拔逻辑资源，此处对 hasKnowledgeBase 宽松放行。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, it, expect } from 'bun:test';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAllAgentsFromDir } from '@/orchestrator/pack/directoryLoader.js';
import { AgentPackManager } from '@/orchestrator/pack/AgentPackManager.js';
import { AgentRegistry } from '@/orchestrator/agent/AgentRegistry.js';
import { TRANSCRIBE_VOICE_TOOL } from '@/orchestrator/adapters/voiceAsrToolAdapter.js';
import type { ReferenceResolver } from '@/orchestrator/engine/validator.js';
import { createRegistryWithFirstBatch } from '@/medical-tools/registry.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const AGENTS_DIR = join(__dirname, '..', '..', '..', 'agents');

/** 真实医疗工具注册表 + 语音工具 */
const toolRegistry = createRegistryWithFirstBatch();
const resolver: ReferenceResolver = {
  hasTool: (name) => toolRegistry.has(name) || name === TRANSCRIBE_VOICE_TOOL,
  // 知识库为部署期可插拔逻辑资源，加载期不阻断
  hasKnowledgeBase: () => true,
  // 本批智能体无跨智能体 subagent 引用
  hasAgent: () => true,
};

const EXPECTED_AGENTS = [
  'medical-record-writer',
  'medical-record-qc',
  'voice-medical-record',
  'diagnosis-assistant',
  'prescription-review',
  'lab-imaging-interpreter',
  'medical-coder',
  'follow-up',
  'triage-preconsult',
  'medical-affairs-report',
];

describe('十大刚需智能体 - 全量加载', () => {
  it('agents 目录可扫描且无加载错误', async () => {
    const { loaded, errors } = await loadAllAgentsFromDir(AGENTS_DIR);
    expect(errors).toEqual([]);
    expect(loaded.length).toBe(EXPECTED_AGENTS.length);
  });

  it.each(EXPECTED_AGENTS)('智能体 %s 存在且元数据完整', async (id) => {
    const { loaded } = await loadAllAgentsFromDir(AGENTS_DIR);
    const item = loaded.find((a) => a.agentId === id);
    expect(item).toBeTruthy();
    expect(item!.agent.name).toBeTruthy();
    expect(item!.agent.version).toBeTruthy();
    expect(item!.agent.disclaimer).toBeTruthy();
    expect(item!.agent.entryWorkflow).toBeTruthy();
    expect(item!.agent.workflows.length).toBeGreaterThan(0);
  });

  it.each(EXPECTED_AGENTS)('智能体 %s 通过包校验（DAG/工具/提示词/校验和）', async (id) => {
    const { loaded } = await loadAllAgentsFromDir(AGENTS_DIR);
    const item = loaded.find((a) => a.agentId === id)!;
    const pm = new AgentPackManager(new AgentRegistry());
    const result = pm.importPackage(item.pkg, { resolver });
    const allIssues = result.validations.flatMap((v) => v.issues);
    expect(result.checksumValid).toBe(true);
    expect(allIssues).toEqual([]);
  });

  it('所有引用的工具均真实存在', async () => {
    const { loaded } = await loadAllAgentsFromDir(AGENTS_DIR);
    const missing: string[] = [];
    for (const item of loaded) {
      for (const tool of item.agent.tools ?? []) {
        if (!resolver.hasTool(tool)) missing.push(`${item.agentId}: ${tool}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('每个智能体的入口工作流都能在 workflows 中找到', async () => {
    const { loaded } = await loadAllAgentsFromDir(AGENTS_DIR);
    for (const item of loaded) {
      const ids = item.agent.workflows.map((w) => w.meta.id);
      expect(ids).toContain(item.agent.entryWorkflow);
    }
  });

  it('全部智能体可成功注册到注册中心', async () => {
    const { loaded } = await loadAllAgentsFromDir(AGENTS_DIR);
    const registry = new AgentRegistry();
    const pm = new AgentPackManager(registry);
    for (const item of loaded) {
      const result = pm.importPackage(item.pkg, { resolver });
      expect(result.validations.every((v) => v.valid)).toBe(true);
    }
    for (const id of EXPECTED_AGENTS) {
      expect(registry.has(id)).toBe(true);
    }
    expect(registry.list().length).toBe(EXPECTED_AGENTS.length);
  });
});
