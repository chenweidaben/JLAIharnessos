/**
 * 健澜科技杠OS - 智能体包管理器单元测试
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, it, expect } from 'bun:test';
import { AgentRegistry } from '@/orchestrator/agent/AgentRegistry.js';
import { AgentPackManager } from '@/orchestrator/pack/AgentPackManager.js';
import { NULL_REFERENCE_RESOLVER } from '@/orchestrator/engine/validator.js';
import { serializeDsl } from '@/orchestrator/dsl/loader.js';
import {
  WorkflowNodeType,
  type AgentDefinition,
  type WorkflowDefinition,
} from '@/orchestrator/dsl/types.js';

function makeWorkflow(): WorkflowDefinition {
  return {
    meta: { id: 'main', name: '主工作流', version: '1.0.0' },
    nodes: [
      { id: 'start', type: WorkflowNodeType.START, name: '开始', config: {} as never },
      {
        id: 'llm',
        type: WorkflowNodeType.LLM,
        name: '生成',
        config: { model: 'sonnet', userTemplate: '${input.text}', systemPrompt: 'prompts/system.md' } as never,
      },
      { id: 'end', type: WorkflowNodeType.END, name: '结束', config: { outputMapping: { text: 'nodes.llm.output.text' } } as never },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'llm' },
      { id: 'e2', source: 'llm', target: 'end' },
    ],
  };
}

function makeAgent(): AgentDefinition {
  return {
    id: 'demo-agent',
    name: '演示智能体',
    version: '1.0.0',
    category: '病历',
    tags: ['demo'],
    description: '用于测试',
    allowedRoles: ['doctor'],
    riskLevel: 'medium',
    tools: [],
    model: { provider: 'anthropic', model: 'sonnet' },
    systemPrompt: 'prompts/system.md',
    entryWorkflow: 'main',
    workflows: [makeWorkflow()],
    disclaimer: 'AI 辅助生成，需医生审核',
  };
}

describe('智能体包管理器', () => {
  it('导出包含校验和与时间戳', () => {
    const registry = new AgentRegistry();
    const pm = new AgentPackManager(registry);
    const pkg = pm.exportPackage(makeAgent(), { prompts: { 'prompts/system.md': '你是病历助手' } });
    expect(pkg.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(pkg.packagedAt).toBeTruthy();
    expect(pkg.prompts['prompts/system.md']).toContain('病历助手');
  });

  it('导出再导入：校验通过、校验和一致、注册成功', () => {
    const registry = new AgentRegistry();
    const pm = new AgentPackManager(registry);
    const pkg = pm.exportPackage(makeAgent(), { prompts: { 'prompts/system.md': '你是病历助手' } });

    const result = pm.importPackage(pkg, { resolver: NULL_REFERENCE_RESOLVER });
    expect(result.checksumValid).toBe(true);
    expect(result.validations.every((v) => v.valid)).toBe(true);
    expect(registry.has('demo-agent')).toBe(true);
    expect(registry.get('demo-agent')?.name).toBe('演示智能体');
  });

  it('YAML 序列化往返一致', () => {
    const registry = new AgentRegistry();
    const pm = new AgentPackManager(registry);
    const pkg = pm.exportPackage(makeAgent());
    const yamlText = pm.toText(pkg, 'yaml');
    expect(yamlText).toContain('demo-agent');
    const restored = pm.importPackage(yamlText, { format: 'yaml', resolver: NULL_REFERENCE_RESOLVER });
    expect(restored.agent.id).toBe('demo-agent');
  });

  it('提示词引用缺失时报错', () => {
    const registry = new AgentRegistry();
    const pm = new AgentPackManager(registry);
    // 不提供 prompts，systemPrompt 引用将无法解析
    const pkg = pm.exportPackage(makeAgent(), { prompts: {} });
    const result = pm.importPackage(pkg, { resolver: NULL_REFERENCE_RESOLVER });
    const codes = result.validations.flatMap((v) => v.issues.map((i) => i.code));
    expect(codes).toContain('PROMPT_REF_MISSING');
    expect(registry.has('demo-agent')).toBe(false);
  });

  it('序列化工具支持 JSON', () => {
    const text = serializeDsl({ a: 1 }, 'json');
    expect(JSON.parse(text)).toEqual({ a: 1 });
  });
});
