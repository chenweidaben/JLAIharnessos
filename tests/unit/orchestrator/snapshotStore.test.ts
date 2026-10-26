/**
 * 健澜AI原生医院操作系统OS - S-05 阶段① 断点快照存储、序列化、迁移与回填测试
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, expect, it } from 'bun:test';
import { WorkflowState } from '@/orchestrator/dsl/types.js';
import { WorkflowContext, type NodeRecord } from '@/orchestrator/engine/context.js';
import { IllegalStateTransitionError } from '@/orchestrator/engine/state.js';
import {
  buildStateSnapshot,
  deserializeSnapshot,
  hydrateContext,
  InMemorySnapshotStore,
  serializeSnapshot,
  validateSnapshotTransition,
  type StateSnapshot,
} from '@/orchestrator/engine/snapshotStore.js';
import type { AiVersionSnapshot } from '@/security/audit/aiAudit.js';

const versions: AiVersionSnapshot = {
  modelId: 'offline-model',
  modelVersion: '1.0.0',
  knowledgeVersion: ['clinical-v1'],
  promptVersion: 'prompt-v1',
  platformRelease: 'demo-release',
};

function buildContext(): WorkflowContext {
  const ctx = new WorkflowContext({
    input: { topic: '演示就诊' },
    patient: { patientId: 'patient-demo-001', visitId: 'visit-demo-001' },
    user: { userId: 'doctor-demo-001', roleCodes: ['doctor'] },
    trigger: { type: 'manual', traceId: 'trace-demo-001' },
    instanceId: 'inst-demo-001',
  });
  ctx.setVariable('draftStatus', 'pending-review');
  ctx.markNodeCompleted('tool1', { ok: true, evidence: '离线合成证据' });
  return ctx;
}

function makeSnapshot(state: WorkflowState, context: WorkflowContext, overrides: Partial<StateSnapshot> = {}): StateSnapshot {
  const completedNodes: Record<string, NodeRecord> = {};
  for (const record of context.getAllRecords()) completedNodes[record.nodeId] = record;
  return buildStateSnapshot({
    instanceId: overrides.instanceId ?? 'inst-demo-001',
    workflowId: 'wf-demo',
    workflowVersion: '1.0.0',
    state,
    currentNodeId: overrides.currentNodeId ?? 'review',
    completedNodes,
    context,
    pendingHumanTasks: ['human-demo-001'],
    versions,
    traceId: 'trace-demo-001',
    patientId: 'patient-demo-001',
    visitId: 'visit-demo-001',
    ...overrides,
  });
}

describe('InMemorySnapshotStore：定位、排序、清理', () => {
  it('按 instanceId 精确匹配最近快照', () => {
    const store = new InMemorySnapshotStore();
    const first = makeSnapshot(WorkflowState.PAUSED, buildContext(), { instanceId: 'inst-a' });
    const second = makeSnapshot(WorkflowState.PAUSED, buildContext(), { instanceId: 'inst-a' });
    store.save(first);
    store.save(second);
    const latest = store.findLatest({ instanceId: 'inst-a' });
    expect(latest?.instanceId).toBe('inst-a');
    expect(latest?.savedAt && first.savedAt && latest.savedAt >= first.savedAt).toBe(true);
    expect(store.findLatest({ instanceId: 'inst-b' })).toBeUndefined();
  });

  it('按 patientId + visitId 组合匹配，list 按时间升序', () => {
    const store = new InMemorySnapshotStore();
    store.save(makeSnapshot(WorkflowState.WAITING_HUMAN, buildContext(), { instanceId: 'inst-1' }));
    store.save(makeSnapshot(WorkflowState.WAITING_HUMAN, buildContext(), { instanceId: 'inst-2' }));
    const matched = store.list({ patientId: 'patient-demo-001', visitId: 'visit-demo-001' });
    expect(matched).toHaveLength(2);
    expect(matched[0].savedAt <= matched[1].savedAt).toBe(true);
    expect(store.list({ visitId: 'visit-other' })).toHaveLength(0);
  });

  it('remove 与 clear 清理台账', () => {
    const store = new InMemorySnapshotStore();
    store.save(makeSnapshot(WorkflowState.PAUSED, buildContext(), { instanceId: 'inst-1' }));
    store.save(makeSnapshot(WorkflowState.PAUSED, buildContext(), { instanceId: 'inst-2' }));
    store.remove('inst-1');
    expect(store.findLatest({ instanceId: 'inst-1' })).toBeUndefined();
    expect(store.findLatest({ instanceId: 'inst-2' })).toBeDefined();
    store.clear();
    expect(store.list({})).toHaveLength(0);
  });
});

describe('快照序列化：纯 JSON 安全往返', () => {
  it('serialize/deserialize 保留状态、版本、节点输出与待办任务', () => {
    const snapshot = makeSnapshot(WorkflowState.PAUSED, buildContext());
    const text = serializeSnapshot(snapshot);
    const restored = deserializeSnapshot(text);
    expect(restored.state).toBe(WorkflowState.PAUSED);
    expect(restored.versions).toEqual(versions);
    expect(restored.completedNodes.tool1.output).toEqual({ ok: true, evidence: '离线合成证据' });
    expect(restored.pendingHumanTasks).toEqual(['human-demo-001']);
    expect(restored.snapshotFormatVersion).toBe('1.0.0');
  });
});

describe('快照续跑状态迁移', () => {
  it('WAITING_HUMAN / PAUSED / FAILED 可迁入 RUNNING', () => {
    for (const state of [WorkflowState.WAITING_HUMAN, WorkflowState.PAUSED, WorkflowState.FAILED]) {
      const snapshot = makeSnapshot(state, buildContext());
      expect(() => validateSnapshotTransition(snapshot, WorkflowState.RUNNING)).not.toThrow();
    }
  });

  it('COMPLETED 终态拒绝续跑并抛 IllegalStateTransitionError', () => {
    const snapshot = makeSnapshot(WorkflowState.COMPLETED, buildContext());
    expect(() => validateSnapshotTransition(snapshot, WorkflowState.RUNNING)).toThrow(IllegalStateTransitionError);
  });

  it('CANCELLED 终态拒绝续跑', () => {
    const snapshot = makeSnapshot(WorkflowState.CANCELLED, buildContext());
    expect(() => validateSnapshotTransition(snapshot, WorkflowState.RUNNING)).toThrow(IllegalStateTransitionError);
  });
});

describe('hydrateContext：回填变量、节点输出与待办任务，不重放调用', () => {
  it('回填后已完成节点输出在位，工具调用计数保持 0', () => {
    const snapshot = makeSnapshot(WorkflowState.WAITING_HUMAN, buildContext());
    const fresh = new WorkflowContext({
      trigger: { type: 'manual', traceId: 'trace-demo-001' },
      instanceId: 'inst-demo-001',
    });
    hydrateContext(fresh, snapshot);
    expect(fresh.getVariables().draftStatus).toBe('pending-review');
    expect(fresh.input.topic).toBe('演示就诊');
    expect(fresh.patient.patientId).toBe('patient-demo-001');
    expect(fresh.user.userId).toBe('doctor-demo-001');
    expect(fresh.getRecord('tool1')?.output).toEqual({ ok: true, evidence: '离线合成证据' });
    expect(fresh.getPendingHumanTasks()).toEqual(['human-demo-001']);
    expect(fresh.getAllRecords().length).toBe(1);
  });
});

describe('快照脱敏与版本归档', () => {
  it('手机号片段在快照中被遮蔽，四维版本随快照归档', () => {
    const ctx = buildContext();
    ctx.mergeVariables({ note: '联系电话 13812345678，患者备注：演示复诊' });
    const snapshot = makeSnapshot(WorkflowState.PAUSED, ctx);
    expect(snapshot.desensitized).toBe(true);
    expect(JSON.stringify(snapshot.context)).not.toContain('13812345678');
    expect(snapshot.versions).toEqual(versions);
  });

  it('completedNodes 的 output/error 脱敏并随回填保持脱敏，不重放节点', () => {
    const completedNodes: Record<string, NodeRecord> = {
      sensitive: {
        nodeId: 'sensitive',
        state: 'completed',
        output: {
          phone: '13812345678',
          idCard: '110101199001011234',
          nested: { note: '联系 13812345678 核实' },
        },
        startedAt: 1000,
        finishedAt: 1001,
        durationMs: 1,
        attempts: 1,
        tokens: { input: 2, output: 3 },
      },
      failed: {
        nodeId: 'failed',
        state: 'failed',
        error: '调用失败，联系 13912345678 重试',
        startedAt: 1002,
        finishedAt: 1003,
        durationMs: 1,
        attempts: 2,
      },
    };
    const snapshot = buildStateSnapshot({
      instanceId: 'inst-demo-001',
      workflowId: 'wf-demo',
      workflowVersion: '1.0.0',
      state: WorkflowState.WAITING_HUMAN,
      currentNodeId: 'review',
      completedNodes,
      context: buildContext(),
      pendingHumanTasks: ['human-demo-001'],
      versions,
      traceId: 'trace-demo-001',
      patientId: 'patient-demo-001',
      visitId: 'visit-demo-001',
    });

    const sensitiveOutput = snapshot.completedNodes.sensitive.output as Record<string, unknown>;
    expect(JSON.stringify(snapshot.completedNodes)).not.toContain('13812345678');
    expect(JSON.stringify(snapshot.completedNodes)).not.toContain('110101199001011234');
    expect(sensitiveOutput.phone).toBe('138****5678');
    expect(sensitiveOutput.idCard).toBe('110101********1234');
    expect((sensitiveOutput.nested as Record<string, unknown>).note).toContain('138****5678');
    expect(snapshot.completedNodes.failed.error).toContain('139****5678');
    expect(snapshot.completedNodes.sensitive.durationMs).toBe(1);
    expect(snapshot.completedNodes.sensitive.tokens).toEqual({ input: 2, output: 3 });

    const fresh = new WorkflowContext({
      trigger: { type: 'manual', traceId: 'trace-demo-001' },
      instanceId: 'inst-demo-001',
    });
    hydrateContext(fresh, snapshot);
    expect(fresh.getAllRecords().length).toBe(2);
    const restoredSensitive = fresh.getRecord('sensitive');
    const restoredFailed = fresh.getRecord('failed');
    const restoredOutput = restoredSensitive?.output as Record<string, unknown>;
    expect(restoredOutput.phone).toBe('138****5678');
    expect(restoredOutput.idCard).toBe('110101********1234');
    expect(restoredFailed?.error).toContain('139****5678');
    expect(JSON.stringify(fresh.getAllRecords())).not.toContain('13812345678');
    expect(JSON.stringify(fresh.getAllRecords())).not.toContain('110101199001011234');
  });
});
