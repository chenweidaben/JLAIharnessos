/**
 * 健澜科技杠OS - 工作流引擎单元测试
 *
 * 覆盖：线性流程、条件路由、工具/LLM/RAG 节点、重试、降级、人工挂起恢复、
 * 暂停/恢复、取消、foreach/while 循环、parallel 并行、校验失败。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, it, expect } from 'bun:test';
import { WorkflowEngine } from '@/orchestrator/engine/engine.js';
import { NULL_REFERENCE_RESOLVER } from '@/orchestrator/engine/validator.js';
import { WorkflowState, WorkflowNodeType, type NodeDefinition, type WorkflowDefinition } from '@/orchestrator/dsl/types.js';
import {
  createMockRuntimeDeps,
  MockWorkflowLlm,
} from '@/orchestrator/adapters/mockRuntime.js';
import { InMemoryHumanTaskHandler } from '@/orchestrator/engine/humanTaskHandler.js';
import type { WorkflowRuntime } from '@/orchestrator/engine/runtime.js';

const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));

function n(id: string, type: WorkflowNodeType, config: Record<string, unknown>, extra: Partial<NodeDefinition> = {}): NodeDefinition {
  return { id, type, name: id, config: config as never, ...extra };
}
function e(id: string, source: string, target: string, sourcePort?: string) {
  return { id, source, target, sourcePort };
}
function makeWf(nodes: NodeDefinition[], edges: ReturnType<typeof e>[], variables?: Record<string, unknown>): WorkflowDefinition {
  return { meta: { id: 'wf', name: 'wf', version: '1.0.0' }, nodes, edges, variables };
}

function buildEngine(overrides: Partial<WorkflowRuntime> = {}) {
  const mocks = createMockRuntimeDeps();
  const human = new InMemoryHumanTaskHandler();
  const runtime: WorkflowRuntime = {
    llm: mocks.llm,
    rag: mocks.rag,
    tools: mocks.tools,
    subAgents: mocks.subAgents,
    human,
    ...overrides,
  };
  const engine = new WorkflowEngine({ runtime, resolver: NULL_REFERENCE_RESOLVER });
  return { engine, mocks, human, runtime };
}

describe('工作流引擎 - 线性与数据流转', () => {
  it('start -> code -> end，表达式映射正确', async () => {
    const { engine } = buildEngine();
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('calc', WorkflowNodeType.CODE, { assignments: { doubled: 'input.x * 2', label: '"结果"' } }),
        n('end', WorkflowNodeType.END, { outputMapping: { result: 'nodes.calc.output.doubled', label: 'nodes.calc.output.label' } }),
      ],
      [e('e1', 'start', 'calc'), e('e2', 'calc', 'end')],
    );
    const r = await engine.run(wf, { input: { x: 5 } }).result;
    expect(r.success).toBe(true);
    expect(r.output).toEqual({ result: 10, label: '结果' });
    expect(r.state).toBe(WorkflowState.COMPLETED);
  });
});

describe('工作流引擎 - 条件分支', () => {
  const buildBranchWf = () =>
    makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('cond', WorkflowNodeType.CONDITION, {
          mode: 'if-else',
          branches: [{ name: 'high', when: 'input.x > 10' }],
          defaultPort: 'low',
        }),
        n('highCode', WorkflowNodeType.CODE, { assignments: { level: '"高"' } }),
        n('lowCode', WorkflowNodeType.CODE, { assignments: { level: '"低"' } }),
        n('end', WorkflowNodeType.END, { outputMapping: { level: 'vars.level' } }),
      ],
      [
        e('e1', 'start', 'cond'),
        e('e2', 'cond', 'highCode', 'high'),
        e('e3', 'cond', 'lowCode', 'low'),
        e('e4', 'highCode', 'end'),
        e('e5', 'lowCode', 'end'),
      ],
    );

  it('命中 high 分支', async () => {
    const { engine } = buildEngine();
    const r = await engine.run(buildBranchWf(), { input: { x: 20 } }).result;
    expect(r.success).toBe(true);
    expect(r.output).toEqual({ level: '高' });
  });

  it('命中 low 默认分支', async () => {
    const { engine } = buildEngine();
    const r = await engine.run(buildBranchWf(), { input: { x: 5 } }).result;
    expect(r.output).toEqual({ level: '低' });
  });
});

describe('工作流引擎 - 服务节点', () => {
  it('工具节点调用 Mock 医疗工具并透传结果', async () => {
    const { engine, mocks } = buildEngine();
    mocks.tools.registerTool(
      'query_patient',
      (input) => ({ success: true, data: { patientId: input.patientId, name: '张三' } }),
      { readOnly: true, riskLevel: 'low' },
    );
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('query', WorkflowNodeType.TOOL, { toolName: 'query_patient', inputMapping: { patientId: 'input.pid' } }),
        n('end', WorkflowNodeType.END, { outputMapping: { name: 'nodes.query.output.name', pid: 'nodes.query.output.patientId' } }),
      ],
      [e('e1', 'start', 'query'), e('e2', 'query', 'end')],
    );
    const r = await engine.run(wf, { input: { pid: 'P001' } }).result;
    expect(r.success).toBe(true);
    expect(r.output).toEqual({ name: '张三', pid: 'P001' });
  });

  it('LLM 节点 jsonMode 返回结构化对象', async () => {
    const { engine, mocks } = buildEngine();
    (mocks.llm as MockWorkflowLlm).script({ diagnosis: '高血压', confidence: 0.9 });
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('llm', WorkflowNodeType.LLM, { model: 'sonnet', userTemplate: '${input.text}', jsonMode: true }),
        n('end', WorkflowNodeType.END, { outputMapping: { diagnosis: 'nodes.llm.output.json.diagnosis' } }),
      ],
      [e('e1', 'start', 'llm'), e('e2', 'llm', 'end')],
    );
    const r = await engine.run(wf, { input: { text: '头晕' } }).result;
    expect(r.success).toBe(true);
    expect(r.output).toEqual({ diagnosis: '高血压' });
    expect(r.summary.tokens.output).toBeGreaterThan(0);
  });

  it('RAG 节点检索并输出片段', async () => {
    const { engine, mocks } = buildEngine();
    mocks.rag.addKnowledgeBase('clinical').addDoc({
      kb: 'clinical',
      id: 'd1',
      content: '高血压患者应低盐饮食，规律监测血压，遵医嘱用药。',
      source: '高血压防治指南',
      authorityLevel: 'guideline',
    });
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('rag', WorkflowNodeType.RAG, {
          knowledgeBases: ['clinical'],
          query: 'input.q',
          topK: 3,
          scoreThreshold: 0.1,
          strategy: 'hybrid',
          outputVariable: 'kb',
        }),
        n('end', WorkflowNodeType.END, { outputMapping: { count: 'nodes.rag.output.count', source: 'nodes.rag.output.sources[0]' } }),
      ],
      [e('e1', 'start', 'rag'), e('e2', 'rag', 'end')],
    );
    const r = await engine.run(wf, { input: { q: '高血压患者饮食注意事项' } }).result;
    expect(r.success).toBe(true);
    expect((r.output as { count: number }).count).toBeGreaterThan(0);
  });
});

describe('工作流引擎 - 重试与降级', () => {
  it('临时失败后重试成功', async () => {
    const { engine, mocks } = buildEngine();
    let calls = 0;
    mocks.tools.registerTool('flaky', () => {
      calls++;
      return calls < 3
        ? { success: false, error: { code: 'TIMEOUT', message: '超时' } }
        : { success: true, data: { ok: true } };
    });
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('t', WorkflowNodeType.TOOL, { toolName: 'flaky', inputMapping: {} }, {
          errorHandling: { retry: { maxAttempts: 3, initialDelayMs: 1, backoffMultiplier: 1, maxDelayMs: 2 } },
        }),
        n('end', WorkflowNodeType.END, { outputMapping: { ok: 'nodes.t.output.ok' } }),
      ],
      [e('e1', 'start', 't'), e('e2', 't', 'end')],
    );
    const r = await engine.run(wf, { runtimeOverride: { sleep: async () => {} } }).result;
    expect(r.success).toBe(true);
    expect(calls).toBe(3);
  });

  it('重试耗尽后走 fallback 降级节点', async () => {
    const { engine, mocks } = buildEngine();
    mocks.tools.registerTool('bad', () => ({ success: false, error: { code: 'E', message: '永久失败' } }));
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('t', WorkflowNodeType.TOOL, { toolName: 'bad', inputMapping: {} }, { errorHandling: { fallbackNode: 'fb' } }),
        n('fb', WorkflowNodeType.CODE, { assignments: { degraded: 'true' } }),
        n('end', WorkflowNodeType.END, { outputMapping: { degraded: 'nodes.fb.output.degraded' } }),
      ],
      [e('e1', 'start', 't'), e('e2', 't', 'end'), e('e3', 'fb', 'end')],
    );
    const r = await engine.run(wf, {}).result;
    expect(r.success).toBe(true);
    expect(r.output).toEqual({ degraded: true });
  });
});

describe('工作流引擎 - 人工/暂停/取消', () => {
  it('人工节点挂起，审核通过后恢复完成', async () => {
    const { engine, human } = buildEngine();
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('review', WorkflowNodeType.HUMAN, {
          title: '处方审核',
          instructions: '请审核处方',
          assigneeRoles: ['pharmacist'],
        }),
        n('end', WorkflowNodeType.END, { outputMapping: { approved: 'nodes.review.output.approved' } }),
      ],
      [e('e1', 'start', 'review'), e('e2', 'review', 'end')],
    );
    const inst = engine.run(wf);
    await tick(10);
    expect(human.pendingCount).toBe(1);
    expect(inst.getState()).toBe(WorkflowState.WAITING_HUMAN);
    const taskId = human.listPending()[0].taskId;
    human.resolve(taskId, { taskId, approved: true, reviewerId: 'U001' });
    const r = await inst.result;
    expect(r.success).toBe(true);
    expect(r.output).toEqual({ approved: true });
  });

  it('暂停后恢复，工作流最终完成', async () => {
    let releaseSleep: () => void = () => {};
    const gateSleep = (): Promise<void> => new Promise((r) => {
      releaseSleep = r;
    });
    const { engine } = buildEngine({ sleep: gateSleep });
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('d1', WorkflowNodeType.DELAY, { durationMs: 10 }),
        n('d2', WorkflowNodeType.DELAY, { durationMs: 10 }),
        n('end', WorkflowNodeType.END, { outputMapping: { done: 'true' } }),
      ],
      [e('e1', 'start', 'd1'), e('e2', 'd1', 'd2'), e('e3', 'd2', 'end')],
    );
    const inst = engine.run(wf);
    await tick(5); // 进入 d1 的 sleep
    inst.pause();
    expect(inst.getState()).toBe(WorkflowState.PAUSED);
    releaseSleep(); // d1 完成，停在暂停门
    await tick(10);
    inst.resume();
    await tick(10); // 等待 d2 进入下一次 sleep
    releaseSleep(); // d2 完成
    const r = await inst.result;
    expect(r.success).toBe(true);
  });

  it('取消后工作流状态为 cancelled', async () => {
    const { engine, human } = buildEngine();
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('review', WorkflowNodeType.HUMAN, { title: 't', instructions: 't', assigneeRoles: ['doctor'] }),
        n('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      [e('e1', 'start', 'review'), e('e2', 'review', 'end')],
    );
    const inst = engine.run(wf);
    await tick(10);
    inst.cancel('测试取消');
    const r = await inst.result;
    expect(r.success).toBe(false);
    expect(r.state).toBe(WorkflowState.CANCELLED);
    human.cancelAll();
  });
});

describe('工作流引擎 - 循环与并行', () => {
  it('foreach 遍历集合执行循环体', async () => {
    const { engine } = buildEngine({ sleep: async () => {} });
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('loop', WorkflowNodeType.LOOP, {
          mode: 'foreach',
          collection: 'input.items',
          itemVariable: 'item',
          indexVariable: 'index',
          bodyEntry: 'body1',
          maxIterations: 10,
        }),
        n('body1', WorkflowNodeType.CODE, { assignments: { lastItem: 'item' } }),
        n('end', WorkflowNodeType.END, { outputMapping: { iterations: 'nodes.loop.output.iterations' } }),
      ],
      [e('e1', 'start', 'loop'), e('e2', 'loop', 'end')],
    );
    const r = await engine.run(wf, { input: { items: [10, 20, 30] } }).result;
    expect(r.success).toBe(true);
    expect(r.output).toEqual({ iterations: 3 });
  });

  it('while 循环按条件重复并受 maxIterations 保护', async () => {
    const { engine } = buildEngine({ sleep: async () => {} });
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('loop', WorkflowNodeType.LOOP, {
          mode: 'while',
          whileCondition: 'vars.i < 3',
          bodyEntry: 'body1',
          maxIterations: 10,
        }),
        n('body1', WorkflowNodeType.CODE, { assignments: { i: 'vars.i + 1' } }),
        n('end', WorkflowNodeType.END, { outputMapping: { iterations: 'nodes.loop.output.iterations', i: 'vars.i' } }),
      ],
      [e('e1', 'start', 'loop'), e('e2', 'loop', 'end')],
      { i: 0 },
    );
    const r = await engine.run(wf).result;
    expect(r.success).toBe(true);
    expect(r.output).toEqual({ iterations: 3, i: 3 });
  });

  it('parallel all 汇聚两个分支结果', async () => {
    const { engine } = buildEngine({ sleep: async () => {} });
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('par', WorkflowNodeType.PARALLEL, {
          mode: 'all',
          concurrency: 2,
          branches: [
            { name: 'b1', entryNode: 'p1' },
            { name: 'b2', entryNode: 'p2' },
          ],
        }),
        n('p1', WorkflowNodeType.CODE, { assignments: { v: '"B1"' } }),
        n('p2', WorkflowNodeType.CODE, { assignments: { v: '"B2"' } }),
        n('end', WorkflowNodeType.END, {
          outputMapping: {
            b1: 'nodes.par.output.branches.b1.v',
            b2: 'nodes.par.output.branches.b2.v',
          },
        }),
      ],
      [e('e1', 'start', 'par'), e('e2', 'par', 'end')],
    );
    const r = await engine.run(wf).result;
    expect(r.success).toBe(true);
    expect(r.output).toEqual({ b1: 'B1', b2: 'B2' });
  });
});

describe('工作流引擎 - 异常与校验', () => {
  it('工作流校验失败时直接返回 failed 实例', async () => {
    const { engine } = buildEngine();
    const bad = makeWf([n('end', WorkflowNodeType.END, { outputMapping: {} })], []);
    const inst = engine.run(bad);
    const r = await inst.result;
    expect(r.success).toBe(false);
    expect(r.state).toBe(WorkflowState.FAILED);
    expect(r.error).toContain('NO_ENTRY');
  });

  it('工具不存在时节点失败', async () => {
    const { engine } = buildEngine();
    const wf = makeWf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('t', WorkflowNodeType.TOOL, { toolName: 'missing', inputMapping: {} }),
        n('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      [e('e1', 'start', 't'), e('e2', 't', 'end')],
    );
    const r = await engine.run(wf).result;
    expect(r.success).toBe(false);
    expect(r.error).toContain('missing');
  });
});
