/**
 * 健澜科技杠OS - 低代码编排平台测试
 * Copyright (c) 2026 健澜科技.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { validateWorkflow, detectCycle, reachableNodes, defaultAgentMeta } from '@/pages/builder/dag';
import {
  builderToPackage,
  packageToBuilder,
  parsePackageText,
  toYaml,
  newNodeId,
} from '@/pages/builder/graph';
import { BUILTIN_PACKAGES, MARKET_AGENTS } from '@/mock/agentMarket';
import { useBuilderStore } from '@/pages/builder/builderStore';
import type { BuilderEdge, BuilderNode } from '@/types/builder';

function n(id: string, nodeType: BuilderNode['data']['nodeType'], x = 0, y = 0, config: Record<string, unknown> = {}): BuilderNode {
  return { id, type: 'medicalNode', position: { x, y }, data: { nodeType, name: id, config } };
}
function e(source: string, target: string, sourceHandle = 'out'): BuilderEdge {
  return { id: `e-${source}-${target}-${sourceHandle}`, source, target, sourceHandle };
}

describe('DAG 图论校验', () => {
  it('空工作流报错', () => {
    expect(validateWorkflow([], []).valid).toBe(false);
  });

  it('合法线性工作流通过', () => {
    const nodes = [n('start', 'start'), n('llm1', 'llm', 200, 0, { userTemplate: 'hi' }), n('end', 'end', 400, 0, { outputMapping: {} })];
    const edges = [e('start', 'llm1'), e('llm1', 'end')];
    const r = validateWorkflow(nodes, edges);
    expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('检测主图回环', () => {
    const nodes = [n('start', 'start'), n('a', 'llm', 200, 0, { userTemplate: 'x' }), n('b', 'llm', 400, 0, { userTemplate: 'y' }), n('end', 'end', 600, 0, { outputMapping: {} })];
    const edges = [e('start', 'a'), e('a', 'b'), e('b', 'a'), e('b', 'end')];
    expect(detectCycle(nodes, edges)).toContain('a');
    expect(validateWorkflow(nodes, edges).issues.some((i) => i.code === 'CYCLE_DETECTED')).toBe(true);
  });

  it('不可达节点报错', () => {
    const nodes = [n('start', 'start'), n('end', 'end', 400), n('orphan', 'llm', 200, 200, { userTemplate: 'z' })];
    const edges = [e('start', 'end')];
    const reach = reachableNodes(nodes, edges);
    expect(reach.has('orphan')).toBe(false);
    expect(validateWorkflow(nodes, edges).issues.some((i) => i.code === 'UNREACHABLE_NODE')).toBe(true);
  });

  it('loop 循环体通过结构化入口可达，不报不可达', () => {
    const nodes = [
      n('start', 'start'),
      n('loop1', 'loop', 200, 0, { loopMode: 'foreach', bodyEntry: 'body1', collection: 'input.ids', maxIterations: 10 }),
      n('body1', 'tool', 200, 200, { toolName: 'get_patient_detail', inputMapping: {} }),
      n('end', 'end', 500, 0, { outputMapping: {} }),
    ];
    const edges = [e('start', 'loop1'), e('loop1', 'end')];
    // body1 是结构化入口，应可达
    expect(reachableNodes(nodes, edges).has('body1')).toBe(true);
  });

  it('工具节点未选工具报错', () => {
    const nodes = [n('start', 'start'), n('t1', 'tool', 200, 0, {}), n('end', 'end', 400, 0, { outputMapping: {} })];
    const edges = [e('start', 't1'), e('t1', 'end')];
    expect(validateWorkflow(nodes, edges).issues.some((i) => i.code === 'TOOL_EMPTY')).toBe(true);
  });

  it('RAG 未选知识库报错', () => {
    const nodes = [n('start', 'start'), n('r1', 'rag', 200, 0, { knowledgeBases: [], query: 'input.q' }), n('end', 'end', 400, 0, { outputMapping: {} })];
    const edges = [e('start', 'r1'), e('r1', 'end')];
    expect(validateWorkflow(nodes, edges).issues.some((i) => i.code === 'KB_EMPTY')).toBe(true);
  });

  it('parallel 分支入口缺失报错', () => {
    const nodes = [
      n('start', 'start'),
      n('p1', 'parallel', 200, 0, { parallelMode: 'all', concurrency: 2, parallelBranches: [{ name: 'b1', entryNode: '' }] }),
      n('end', 'end', 500, 0, { outputMapping: {} }),
    ];
    const edges = [e('start', 'p1'), e('p1', 'end')];
    expect(validateWorkflow(nodes, edges).issues.some((i) => i.code === 'PARALLEL_NO_BRANCH')).toBe(true);
  });

  it('智能体 ID 非法报错', () => {
    const meta = defaultAgentMeta();
    meta.id = 'Bad ID';
    const r = validateWorkflow([n('start', 'start'), n('end', 'end', 200, 0, { outputMapping: {} })], [e('start', 'end')], meta);
    expect(r.issues.some((i) => i.code === 'AGENT_ID_INVALID')).toBe(true);
  });
});

describe('内置市场模板', () => {
  it.each(MARKET_AGENTS.map((a) => a.id))('模板 %s 通过 DAG 校验', (id) => {
    const pkg = BUILTIN_PACKAGES[id];
    expect(pkg).toBeTruthy();
    const { nodes, edges, meta } = packageToBuilder(pkg);
    const result = validateWorkflow(nodes, edges, meta);
    const errors = result.issues.filter((i) => i.severity === 'error');
    if (errors.length) console.error(id, errors);
    expect(errors).toEqual([]);
  });

  it('市场清单与模板一一对应（共 10 个）', () => {
    expect(MARKET_AGENTS).toHaveLength(10);
    MARKET_AGENTS.forEach((a) => expect(BUILTIN_PACKAGES[a.id]).toBeTruthy());
  });
});

describe('DSL 转换与 YAML 往返', () => {
  it('导出 YAML 后再解析，节点与边数量一致', () => {
    const pkg = BUILTIN_PACKAGES['medical-record-writer'];
    const yaml = toYaml(pkg);
    expect(yaml).toContain('agent:');
    expect(yaml).toContain('workflows:');
    const reparsed = parsePackageText(yaml);
    const back = packageToBuilder(reparsed);
    const original = packageToBuilder(pkg);
    expect(back.nodes.length).toBe(original.nodes.length);
    expect(back.edges.length).toBe(original.edges.length);
    expect(back.meta.id).toBe('medical-record-writer');
  });

  it('导出的 DSL 使用后端字段名（parallel branches / loop mode）', () => {
    const pkg = BUILTIN_PACKAGES['prescription-review'];
    const wf = (pkg.agent.workflows as Array<Record<string, unknown>>)[0] as { nodes: Array<Record<string, unknown>> };
    const parallel = wf.nodes.find((x) => x.type === 'parallel') as { config: Record<string, unknown> };
    expect(parallel.config.branches).toBeTruthy();
    expect(parallel.config.parallelBranches).toBeUndefined();
  });

  it('newNodeId 去重', () => {
    const existing = [n('llm', 'llm'), n('llm_1', 'llm')];
    expect(newNodeId('llm', existing)).toBe('llm_2');
  });

  it('导出包含医疗免责声明', () => {
    const { nodes, edges, meta } = packageToBuilder(BUILTIN_PACKAGES['medical-record-writer']);
    const pkg = builderToPackage(nodes, edges, meta);
    expect(String((pkg.agent as { disclaimer: string }).disclaimer)).toContain('辅助');
  });
});

describe('画布 store', () => {
  beforeEach(() => {
    useBuilderStore.getState().reset();
  });

  it('新增节点并选中', () => {
    const id = useBuilderStore.getState().addNode('llm', { x: 300, y: 100 });
    const s = useBuilderStore.getState();
    expect(s.nodes.some((n) => n.id === id)).toBe(true);
    expect(s.selectedNodeId).toBe(id);
  });

  it('连线后可撤销', () => {
    const s0 = useBuilderStore.getState();
    const id = s0.addNode('llm', { x: 300, y: 100 });
    useBuilderStore.getState().connect({ source: 'start', target: id, sourceHandle: 'out' } as never);
    expect(useBuilderStore.getState().edges.length).toBe(1);
    useBuilderStore.getState().undo();
    expect(useBuilderStore.getState().edges.length).toBe(0);
    useBuilderStore.getState().redo();
    expect(useBuilderStore.getState().edges.length).toBe(1);
  });

  it('删除节点连带删除边，且开始节点不可删', () => {
    const s = useBuilderStore.getState();
    const id = s.addNode('llm', { x: 300, y: 100 });
    useBuilderStore.getState().connect({ source: 'start', target: id, sourceHandle: 'out' } as never);
    useBuilderStore.getState().removeNode(id);
    const after = useBuilderStore.getState();
    expect(after.nodes.some((n) => n.id === id)).toBe(false);
    expect(after.edges.length).toBe(0);
    const before = useBuilderStore.getState().nodes.length;
    useBuilderStore.getState().removeNode('start');
    expect(useBuilderStore.getState().nodes.length).toBe(before);
  });

  it('加载内置包后节点进入画布', () => {
    useBuilderStore.getState().loadPackage(BUILTIN_PACKAGES['medical-record-qc']);
    const s = useBuilderStore.getState();
    expect(s.nodes.length).toBeGreaterThan(5);
    expect(s.meta.id).toBe('medical-record-qc');
  });
});
