/**
 * 单元测试 - 工具注册表（契约 §6）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import { createProfileMemory } from '../../../src/core/agent/consult/memory/profileMemory';
import {
  createDefaultToolRegistry,
  type ToolContext,
  ToolRegistry,
} from '../../../src/core/agent/consult/tools/toolRegistry';

function makeToolContext(profile = createProfileMemory('u-test-001')): ToolContext {
  return { traceId: 'trace-test-m86', memory: profile };
}

describe('toolRegistry 工具注册表', () => {
  it('规范驼峰名与下划线别名均可解析', () => {
    const registry = createDefaultToolRegistry();
    expect(registry.resolve('lookupDrug')?.name).toBe('lookupDrug');
    expect(registry.resolve('lookup_drug')?.name).toBe('lookupDrug');
    expect(registry.resolve('search_knowledge_base')?.aliases).toContain('search_knowledge_base');
    expect(registry.resolve('nonexistent_tool')).toBeNull();
  });

  it('参数归一化：下划线键转驼峰', () => {
    const registry = new ToolRegistry();
    const normalized = registry.normalizeArgs({ drug_name: '布洛芬', query_keyword: '咳嗽' });
    expect(normalized.drugName).toBe('布洛芬');
    expect(normalized.queryKeyword).toBe('咳嗽');
  });

  it('invoke 阶段按 knownArgs 白名单剔除未知键', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke(
      'lookupDrug',
      { drug_name: '布洛芬', should_not_exist: 'secret' },
      makeToolContext(),
    );
    expect(result.success).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.summary).toContain('布洛芬');
  });

  it('内置知识库工具返回确定性科普证据', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke(
      'searchKnowledgeBase',
      { query: '咳嗽 感冒' },
      makeToolContext(),
    );
    expect(result.success).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence[0].kind).toBe('knowledge');
    expect(result.errorClass).toBeNull();
  });

  it('内置药品工具命中布洛芬说明书摘要', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke('lookup_drug', { drugName: '布洛芬' }, makeToolContext());
    expect(result.success).toBe(true);
    expect(result.evidence.some((item) => item.kind === 'drug')).toBe(true);
  });

  it('checkAllergy 读取画像过敏事实并归入 allergy 证据', async () => {
    const profile = createProfileMemory('u-test-001');
    profile.facts = [
      {
        key: 'allergy',
        value: '对青霉素过敏（待医师核实）',
        source: 'thread-1',
        updatedAt: new Date().toISOString(),
      },
    ];
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke('checkAllergy', {}, makeToolContext(profile));
    expect(result.success).toBe(true);
    expect(result.evidence.some((item) => item.kind === 'allergy')).toBe(true);
  });

  it('checkInteraction 对多药联用给出相互作用风险提示', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke(
      'checkInteraction',
      { drugNames: ['布洛芬', '阿司匹林'] },
      makeToolContext(),
    );
    expect(result.success).toBe(true);
    expect(result.evidence.some((item) => item.kind === 'interaction')).toBe(true);
  });

  it('retrievePatientHistory 读取画像慢性病事实', async () => {
    const profile = createProfileMemory('u-test-001');
    profile.facts = [
      {
        key: 'chronic_condition',
        value: '高血压',
        source: 'thread-1',
        updatedAt: new Date().toISOString(),
      },
    ];
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke('retrievePatientHistory', {}, makeToolContext(profile));
    expect(result.success).toBe(true);
    expect(result.evidence.some((item) => item.kind === 'history')).toBe(true);
  });

  it('未知工具返回 ToolNotFound 错误分类且不抛异常', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke('time_travel_tool', {}, makeToolContext());
    expect(result.success).toBe(false);
    expect(result.errorClass).toBe('ToolNotFound');
    expect(result.evidence).toEqual([]);
  });

  it('list 返回五个内置工具清单', () => {
    const registry = createDefaultToolRegistry();
    const list = registry.list();
    expect(list.length).toBe(5);
    expect(list.map((item) => item.name)).toEqual([
      'searchKnowledgeBase',
      'lookupDrug',
      'checkAllergy',
      'checkInteraction',
      'retrievePatientHistory',
    ]);
  });
});
