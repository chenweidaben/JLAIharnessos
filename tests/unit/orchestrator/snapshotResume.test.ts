/**
 * 健澜AI原生医院操作系统OS - S-05 阶段① 快照恢复、人工挂起/暂停/失败续跑测试
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, expect, it } from 'bun:test';
import { WorkflowEngine } from '@/orchestrator/engine/engine.js';
import { NULL_REFERENCE_RESOLVER } from '@/orchestrator/engine/validator.js';
import { WorkflowNodeType, WorkflowState, type NodeDefinition, type WorkflowDefinition } from '@/orchestrator/dsl/types.js';
import { InMemoryHumanTaskHandler } from '@/orchestrator/engine/humanTaskHandler.js';
import { InMemorySnapshotStore } from '@/orchestrator/engine/snapshotStore.js';
import { createMockRuntimeDeps, type MockToolInvoker } from '@/orchestrator/adapters/mockRuntime.js';
import type { WorkflowRuntime } from '@/orchestrator/engine/runtime.js';

const tick = (ms = 5): Promise<void> => new Promise((r) => setTimeout(r, ms));

function n(id: string, type: WorkflowNodeType, config: Record<string, unknown>, extra: Partial<NodeDefinition> = {}): NodeDefinition {
  return { id, type, name: id, config: config as never, ...extra };
}

function e(id: string, source: string, target: string, sourcePort?: string) {
  return { id, source, target, sourcePort };
}

function wf(nodes: NodeDefinition[], edges: ReturnType<typeof e>[]): WorkflowDefinition {
  return { meta: { id: 'wf-demo', name: '演示工作流', version: '1.0.0' }, nodes, edges };
}

function buildEngine(runtimeOverrides: Partial<WorkflowRuntime> = {}) {
  const mocks = createMockRuntimeDeps();
  const human = new InMemoryHumanTaskHandler();
  const runtime: WorkflowRuntime = { llm: mocks.llm, rag: mocks.rag, tools: mocks.tools, subAgents: mocks.subAgents, human, ...runtimeOverrides };
  const engine = new WorkflowEngine({ runtime, resolver: NULL_REFERENCE_RESOLVER });
  return { engine, mocks, human, runtime };
}

describe('快照恢复：人工挂起后从挂起节点续跑，已完成节点不重放', () => {
  it('第二次实例复用快照，工具调用计数保持 0，end 产出最终结果', async () => {
    const store = new InMemorySnapshotStore();
    const first = buildEngine();
    first.mocks.tools.registerTool('stub', () => ({ success: true, data: { ok: true } }), { readOnly: true, riskLevel: 'low' });
    const workflow = wf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('tool1', WorkflowNodeType.TOOL, { toolName: 'stub', inputMapping: { patientId: 'patient.patientId' } }),
        n('review', WorkflowNodeType.HUMAN, { title: '演示审核', instructions: '请确认草稿', assigneeRoles: ['doctor'] }),
        n('end', WorkflowNodeType.END, { outputMapping: { approved: 'nodes.review.output.approved', stubOk: 'nodes.tool1.output.ok' } }),
      ],
      [e('e1', 'start', 'tool1'), e('e2', 'tool1', 'review'), e('e3', 'review', 'end')],
    );

    const firstInstance = first.engine.run(workflow, {
      snapshotStore: store,
      patient: { patientId: 'patient-demo-001', visitId: 'visit-demo-001' },
      user: { userId: 'doctor-demo-001', roleCodes: ['doctor'] },
      instanceId: 'inst-resume-001',
    });
    await tick(20);
    expect(first.human.pendingCount).toBe(1);

    const snapshot = store.findLatest({ instanceId: 'inst-resume-001' });
    expect(snapshot).toBeDefined();
    expect(snapshot?.currentNodeId).toBe('review');
    expect(snapshot?.completedNodes.tool1).toBeDefined();

    const second = buildEngine();
    second.mocks.tools.registerTool('stub', () => ({ success: true, data: { ok: true } }), { readOnly: true, riskLevel: 'low' });
    const secondInstance = second.engine.run(workflow, {
      snapshotStore: store,
      resumeSnapshot: snapshot,
      patient: { patientId: 'patient-demo-001', visitId: 'visit-demo-001' },
      user: { userId: 'doctor-demo-001', roleCodes: ['doctor'] },
      instanceId: 'inst-resume-001',
    });
    await tick(20);
    const task = second.human.listPending()[0];
    second.human.resolve(task.taskId, { taskId: task.taskId, approved: true, reviewerId: 'doctor-demo-001' });
    const result = await secondInstance.result;

    expect(result.success).toBe(true);
    expect(result.output).toEqual({ approved: true, stubOk: true });
    expect((second.mocks.tools as MockToolInvoker).calls).toHaveLength(0);
  });
});

describe('快照恢复：暂停边界落快照并可续跑', () => {
  it('暂停后快照存在，恢复后工作流完成', async () => {
    const store = new InMemorySnapshotStore();
    let releaseSleep: () => void = () => {};
    const gateSleep = (): Promise<void> => new Promise((resolve) => { releaseSleep = resolve; });
    const engine = buildEngine({ sleep: gateSleep });
    const workflow = wf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('d1', WorkflowNodeType.DELAY, { durationMs: 10 }),
        n('d2', WorkflowNodeType.DELAY, { durationMs: 10 }),
        n('end', WorkflowNodeType.END, { outputMapping: { done: 'true' } }),
      ],
      [e('e1', 'start', 'd1'), e('e2', 'd1', 'd2'), e('e3', 'd2', 'end')],
    );
    const instance = engine.engine.run(workflow, { snapshotStore: store, instanceId: 'inst-pause-001' });
    await tick(5);
    instance.pause();
    expect(store.findLatest({ instanceId: 'inst-pause-001' })).toBeDefined();
    releaseSleep();
    await tick(5);
    instance.resume();
    await tick(5);
    releaseSleep();
    const result = await instance.result;
    expect(result.success).toBe(true);
  });
});

describe('快照恢复：失败待重试边界落快照，恢复后可从失败节点继续', () => {
  it('首次失败落 FAILED 快照，第二次恢复后工具成功并完成', async () => {
    const store = new InMemorySnapshotStore();
    const first = buildEngine({ sleep: async () => {} });
    first.mocks.tools.registerTool('flaky', () => ({
      success: false,
      error: { code: 'TIMEOUT', message: '临时超时' },
    }));
    const workflow = wf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('tool1', WorkflowNodeType.TOOL, { toolName: 'flaky', inputMapping: {} }, {
          errorHandling: { retry: { maxAttempts: 2, initialDelayMs: 1, backoffMultiplier: 1, maxDelayMs: 2 } },
        }),
        n('end', WorkflowNodeType.END, { outputMapping: { ok: 'nodes.tool1.output.ok' } }),
      ],
      [e('e1', 'start', 'tool1'), e('e2', 'tool1', 'end')],
    );
    const firstInstance = first.engine.run(workflow, { snapshotStore: store, instanceId: 'inst-fail-001' });
    const firstResult = await firstInstance.result;
    expect(firstResult.success).toBe(false);

    const snapshot = store.findLatest({ instanceId: 'inst-fail-001' });
    expect(snapshot?.state).toBe(WorkflowState.FAILED);
    expect(snapshot?.currentNodeId).toBe('tool1');

    const second = buildEngine({ sleep: async () => {} });
    second.mocks.tools.registerTool('flaky', () => ({ success: true, data: { ok: true } }));
    const secondInstance = second.engine.run(workflow, {
      snapshotStore: store,
      resumeSnapshot: snapshot,
      instanceId: 'inst-fail-001',
    });
    const secondResult = await secondInstance.result;
    expect(secondResult.success).toBe(true);
    expect(secondResult.output).toEqual({ ok: true });
  });
});

describe('既有路径：不传快照时行为保持不变', () => {
  it('start -> code -> end 线性完成', async () => {
    const engine = buildEngine();
    const workflow = wf(
      [
        n('start', WorkflowNodeType.START, {}),
        n('calc', WorkflowNodeType.CODE, { assignments: { doubled: 'input.x * 2' } }),
        n('end', WorkflowNodeType.END, { outputMapping: { doubled: 'nodes.calc.output.doubled' } }),
      ],
      [e('e1', 'start', 'calc'), e('e2', 'calc', 'end')],
    );
    const result = await engine.engine.run(workflow, { input: { x: 5 } }).result;
    expect(result.success).toBe(true);
    expect(result.output).toEqual({ doubled: 10 });
  });
});
