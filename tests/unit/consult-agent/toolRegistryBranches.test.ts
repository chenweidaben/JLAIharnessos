/**
 * 单元测试 - 工具注册表补充分支（补基线未覆盖语句）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 覆盖基线未覆盖语句：
 * - toolRegistry.ts 188-190：register 同名覆盖旧条目
 * - toolRegistry.ts 194：resolve 首尾空白归一
 * - toolRegistry.ts 220-221：描述符未声明 knownArgs 时保留全部归一化参数
 * - toolRegistry.ts 253-259：invoke 捕获执行异常为 errorClass，安全降级不抛错
 * - toolRegistry.ts 76：searchKnowledgeBase 空 query 返回全部知识库条目
 * - toolRegistry.ts 109：lookupDrug 未命中摘要分支
 * - toolRegistry.ts 145-150：checkInteraction 单药提示分支；零药证据空数组
 * - toolRegistry.ts 57-68：readStringArrayArg 混合类型过滤 / 字符串拆分 / 标量兜底
 */

import { describe, expect, it } from 'bun:test';

import { SAMPLE_KNOWLEDGE } from '../../../src/core/agent/consult/demo/demoSeed';
import { createProfileMemory } from '../../../src/core/agent/consult/memory/profileMemory';
import {
  createDefaultToolRegistry,
  type ToolContext,
  type ToolDescriptor,
  ToolRegistry,
} from '../../../src/core/agent/consult/tools/toolRegistry';

function makeToolContext(): ToolContext {
  return { traceId: 'trace-test-m86', memory: createProfileMemory('u-test-001') };
}

function okDescriptor(overrides: Partial<ToolDescriptor>): ToolDescriptor {
  return {
    name: 'customTool',
    aliases: [],
    description: '自定义测试描述符',
    run: async () => ({ success: true, evidence: [], summary: 'ok', errorClass: null }),
    ...overrides,
  };
}

describe('toolRegistry 注册与解析补充分支', () => {
  it('同名规范名重复注册时覆盖旧条目，清单长度保持 1（188-190 行）', () => {
    const registry = new ToolRegistry();
    registry.register(
      okDescriptor({ name: 'customTool', aliases: ['custom_tool'], description: '首版描述' }),
    );
    registry.register(
      okDescriptor({ name: 'customTool', aliases: ['custom_tool_v2'], description: '覆盖版描述' }),
    );

    expect(registry.resolve('customTool')?.description).toBe('覆盖版描述');
    expect(registry.resolve('custom_tool')).toBeNull();
    expect(registry.list()).toHaveLength(1);
  });

  it('resolve 对名称首尾空白做归一后命中（194 行）', () => {
    const registry = createDefaultToolRegistry();
    expect(registry.resolve('  lookupDrug  ')?.name).toBe('lookupDrug');
    expect(registry.resolve('\nsearch_knowledge_base\t')?.name).toBe('searchKnowledgeBase');
  });
});

describe('toolRegistry 参数归一化补充分支', () => {
  it('描述符未声明 knownArgs 时保留全部归一化参数（220-221 行）', async () => {
    const registry = new ToolRegistry();
    let receivedArgs: Record<string, unknown> = {};
    registry.register(
      okDescriptor({
        name: 'echoArgs',
        run: async (args) => {
          receivedArgs = args;
          return { success: true, evidence: [], summary: 'ok', errorClass: null };
        },
      }),
    );

    await registry.invoke('echoArgs', { query_keyword: '咳嗽', secret_flag: 1 }, makeToolContext());

    expect(receivedArgs.queryKeyword).toBe('咳嗽');
    expect(receivedArgs.secretFlag).toBe(1);
  });
});

describe('toolRegistry invoke 异常安全降级（253-259 行）', () => {
  it('工具执行抛错时捕获为 errorClass，返回空证据与降级摘要，不向调用方抛异常', async () => {
    const registry = new ToolRegistry();
    registry.register(
      okDescriptor({
        name: 'boomTool',
        knownArgs: [],
        run: async () => {
          throw new TypeError('boom 测试异常');
        },
      }),
    );

    const result = await registry.invoke('boomTool', {}, makeToolContext());

    expect(result.success).toBe(false);
    expect(result.evidence).toEqual([]);
    expect(result.errorClass).toBe('TypeError');
    expect(result.summary).toContain('boomTool');
    expect(result.summary).toContain('执行异常，已按安全降级处理');
  });
});

describe('toolRegistry 内置工具未覆盖分支', () => {
  it('searchKnowledgeBase 空 query 返回全部知识库 DEMO 条目（76 行）', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke('searchKnowledgeBase', { query: '' }, makeToolContext());

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(SAMPLE_KNOWLEDGE.length);
    expect(result.errorClass).toBeNull();
  });

  it('lookupDrug 未命中药品时返回空证据与未命中提示摘要（109 行）', async () => {
    const registry = createDefaultToolRegistry();
    const result = await registry.invoke(
      'lookupDrug',
      { drugName: '安眠补脑口服液' },
      makeToolContext(),
    );

    expect(result.success).toBe(true);
    expect(result.evidence).toEqual([]);
    expect(result.summary).toContain('未命中相关条目');
  });

  it('checkInteraction 单药给出单药使用提示；零药与非数组标量均返回空证据（145-150 行）', async () => {
    const registry = createDefaultToolRegistry();

    const single = await registry.invoke(
      'checkInteraction',
      { drugNames: ['布洛芬'] },
      makeToolContext(),
    );
    expect(single.success).toBe(true);
    expect(single.evidence.some((item) => item.label.includes('单药'))).toBe(true);

    const empty = await registry.invoke('checkInteraction', { drugNames: [] }, makeToolContext());
    expect(empty.evidence).toEqual([]);

    const scalar = await registry.invoke('checkInteraction', { drugNames: 123 }, makeToolContext());
    expect(scalar.evidence).toEqual([]);
  });

  it('readStringArrayArg：混合类型数组剔除非字符串；字符串按逗号 / 顿号 / 空白拆分（57-68 行）', async () => {
    const registry = createDefaultToolRegistry();

    const mixed = await registry.invoke(
      'checkInteraction',
      { drugNames: ['布洛芬', 123, null, '阿司匹林'] },
      makeToolContext(),
    );
    expect(mixed.evidence).toHaveLength(1);
    expect(mixed.evidence[0]?.kind).toBe('interaction');
    expect(mixed.evidence[0]?.snippet).toContain('布洛芬');
    expect(mixed.evidence[0]?.snippet).toContain('阿司匹林');

    const split = await registry.invoke(
      'checkInteraction',
      { drugNames: '布洛芬，阿司匹林、维生素C 片' },
      makeToolContext(),
    );
    expect(split.evidence).toHaveLength(1);
    expect(split.evidence[0]?.snippet).toContain('维生素C');
  });
});
