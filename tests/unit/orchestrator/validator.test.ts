/**
 * 健澜科技杠OS - 工作流 DAG 校验器单元测试
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, it, expect } from 'bun:test';
import { validateWorkflow, topologicalSort, type ReferenceResolver } from '@/orchestrator/engine/validator.js';
import { WorkflowNodeType, type NodeDefinition, type EdgeDefinition, type WorkflowDefinition } from '@/orchestrator/dsl/types.js';

function node(id: string, type: WorkflowNodeType, config: Record<string, unknown> = {}): NodeDefinition {
  return { id, type, name: id, config: config as never };
}
function edge(id: string, source: string, target: string, sourcePort?: string): EdgeDefinition {
  return { id, source, target, sourcePort };
}
function wf(nodes: NodeDefinition[], edges: EdgeDefinition[]): WorkflowDefinition {
  return {
    meta: { id: 'test-wf', name: '测试工作流', version: '1.0.0' },
    nodes,
    edges,
  };
}

const resolver: ReferenceResolver = {
  hasTool: (n) => n === 'query_patient',
  hasKnowledgeBase: (n) => n === 'clinical',
  hasAgent: (n) => n === 'medical-record-writer',
};

describe('DAG 校验器 - 合法结构', () => {
  it('线性工作流通过校验', () => {
    const w = wf(
      [
        node('start', WorkflowNodeType.START),
        node('llm1', WorkflowNodeType.LLM, { userTemplate: 'hi', model: 'sonnet' }),
        node('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      [edge('e1', 'start', 'llm1'), edge('e2', 'llm1', 'end')],
    );
    const r = validateWorkflow(w, resolver);
    expect(r.valid).toBe(true);
    expect(r.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('拓扑排序满足依赖顺序', () => {
    const w = wf(
      [
        node('start', WorkflowNodeType.START),
        node('a', WorkflowNodeType.CODE, { assignments: {} }),
        node('b', WorkflowNodeType.CODE, { assignments: {} }),
        node('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      [edge('e1', 'start', 'a'), edge('e2', 'a', 'b'), edge('e3', 'b', 'end')],
    );
    const order = topologicalSort(w);
    expect(order.indexOf('start')).toBeLessThan(order.indexOf('a'));
    expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'));
    expect(order.indexOf('b')).toBeLessThan(order.indexOf('end'));
  });
});

describe('DAG 校验器 - 结构错误', () => {
  it('缺少 start 节点', () => {
    const w = wf([node('end', WorkflowNodeType.END, { outputMapping: {} })], []);
    expect(validateWorkflow(w).valid).toBe(false);
    expect(validateWorkflow(w).issues.some((i) => i.code === 'NO_ENTRY')).toBe(true);
  });

  it('多个 start 节点', () => {
    const w = wf(
      [node('s1', WorkflowNodeType.START), node('s2', WorkflowNodeType.START), node('end', WorkflowNodeType.END, { outputMapping: {} })],
      [edge('e1', 's1', 'end')],
    );
    expect(validateWorkflow(w).issues.some((i) => i.code === 'MULTIPLE_ENTRY')).toBe(true);
  });

  it('缺少 end 节点', () => {
    const w = wf([node('start', WorkflowNodeType.START)], []);
    expect(validateWorkflow(w).issues.some((i) => i.code === 'NO_TERMINAL')).toBe(true);
  });

  it('重复节点 ID', () => {
    const w = wf(
      [
        node('start', WorkflowNodeType.START),
        node('x', WorkflowNodeType.CODE, { assignments: {} }),
        node('x', WorkflowNodeType.CODE, { assignments: {} }),
        node('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      [edge('e1', 'start', 'x'), edge('e2', 'x', 'end')],
    );
    expect(validateWorkflow(w).issues.some((i) => i.code === 'DUPLICATE_NODE_ID')).toBe(true);
  });

  it('悬挂边（目标不存在）', () => {
    const w = wf(
      [node('start', WorkflowNodeType.START), node('end', WorkflowNodeType.END, { outputMapping: {} })],
      [edge('e1', 'start', 'ghost')],
    );
    expect(validateWorkflow(w).issues.some((i) => i.code === 'DANGLING_EDGE')).toBe(true);
  });

  it('检测到环', () => {
    const w = wf(
      [
        node('start', WorkflowNodeType.START),
        node('a', WorkflowNodeType.CODE, { assignments: {} }),
        node('b', WorkflowNodeType.CODE, { assignments: {} }),
        node('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      // a -> b -> a 形成环
      [edge('e1', 'start', 'a'), edge('e2', 'a', 'b'), edge('e3', 'b', 'a'), edge('e4', 'a', 'end')],
    );
    expect(validateWorkflow(w).issues.some((i) => i.code === 'CYCLE_DETECTED')).toBe(true);
  });

  it('不可达节点', () => {
    const w = wf(
      [
        node('start', WorkflowNodeType.START),
        node('end', WorkflowNodeType.END, { outputMapping: {} }),
        node('orphan', WorkflowNodeType.CODE, { assignments: {} }),
      ],
      [edge('e1', 'start', 'end')],
    );
    expect(validateWorkflow(w).issues.some((i) => i.code === 'UNREACHABLE_NODE')).toBe(true);
  });
});

describe('DAG 校验器 - 端口与引用', () => {
  it('条件节点未定义的出口端口报错', () => {
    const w = wf(
      [
        node('start', WorkflowNodeType.START),
        node('cond', WorkflowNodeType.CONDITION, {
          mode: 'if-else',
          branches: [{ name: 'yes', when: 'true' }],
          defaultPort: 'no',
        }),
        node('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      [edge('e1', 'start', 'cond'), edge('e2', 'cond', 'end', 'maybe')],
    );
    expect(validateWorkflow(w).issues.some((i) => i.code === 'MISSING_PORT')).toBe(true);
  });

  it('工具节点引用不存在的工具', () => {
    const w = wf(
      [
        node('start', WorkflowNodeType.START),
        node('t', WorkflowNodeType.TOOL, { toolName: 'nonexistent_tool', inputMapping: {} }),
        node('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      [edge('e1', 'start', 't'), edge('e2', 't', 'end')],
    );
    expect(validateWorkflow(w, resolver).issues.some((i) => i.code === 'TOOL_NOT_FOUND')).toBe(true);
  });

  it('子智能体节点引用存在的智能体时通过', () => {
    const w = wf(
      [
        node('start', WorkflowNodeType.START),
        node('sub', WorkflowNodeType.SUBAGENT, {
          agentId: 'medical-record-writer',
          mode: 'delegate',
          inputMapping: {},
        }),
        node('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      [edge('e1', 'start', 'sub'), edge('e2', 'sub', 'end')],
    );
    const r = validateWorkflow(w, resolver);
    expect(r.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('循环节点缺少 maxIterations 报错', () => {
    const w = wf(
      [
        node('start', WorkflowNodeType.START),
        node('loop', WorkflowNodeType.LOOP, { mode: 'while', whileCondition: 'false', bodyEntry: 'body' }),
        node('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      [edge('e1', 'start', 'loop'), edge('e2', 'loop', 'end')],
    );
    expect(validateWorkflow(w).issues.some((i) => i.code === 'LOOP_MAX_ITERATIONS')).toBe(true);
  });
});
