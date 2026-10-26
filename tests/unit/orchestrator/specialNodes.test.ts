/**
 * 健澜AI原生医院操作系统OS - S-05 阶段① 三类独立节点 DSL 校验与执行器测试
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { describe, expect, it } from 'bun:test';
import { WorkflowNodeType, type EdgeDefinition, type NodeDefinition, type WorkflowDefinition } from '@/orchestrator/dsl/types.js';
import { validateWorkflow } from '@/orchestrator/engine/validator.js';
import { WorkflowContext } from '@/orchestrator/engine/context.js';
import { InMemoryHumanTaskHandler } from '@/orchestrator/engine/humanTaskHandler.js';
import type { WorkflowRuntime } from '@/orchestrator/engine/runtime.js';
import type { NodeExecutorContext, PathRunner } from '@/orchestrator/nodes/types.js';
import { WorkflowCancelledError } from '@/orchestrator/nodes/types.js';
import { createMockRuntimeDeps } from '@/orchestrator/adapters/mockRuntime.js';
import {
  FormatValidateNodeExecutor,
  NotifyNodeExecutor,
  WritebackNodeExecutor,
} from '@/orchestrator/nodes/specialExecutors.js';

function node(id: string, type: WorkflowNodeType, config: Record<string, unknown> = {}): NodeDefinition {
  return { id, type, name: id, config: config as never };
}

function edge(id: string, source: string, target: string, sourcePort?: string): EdgeDefinition {
  return { id, source, target, sourcePort };
}

function workflow(nodes: NodeDefinition[], edges: EdgeDefinition[]): WorkflowDefinition {
  return { meta: { id: 'wf', name: 'wf', version: '1.0.0' }, nodes, edges };
}

function makeContext(init: {
  input?: Record<string, unknown>;
  patient?: Record<string, unknown>;
  user?: Record<string, unknown>;
}): WorkflowContext {
  return new WorkflowContext({
    input: init.input ?? {},
    patient: init.patient,
    user: init.user,
    trigger: { type: 'manual', traceId: 'trace-demo-001' },
    instanceId: 'inst-demo-001',
  });
}

function makeNodeContext(ctx: WorkflowContext, runtime: WorkflowRuntime): NodeExecutorContext {
  return {
    ctx,
    runtime,
    runner: undefined as unknown as PathRunner,
    instanceId: 'inst-demo-001',
    signal: new AbortController().signal,
    createHumanTaskId: () => 'human-demo-001',
  };
}

function makeRuntime(overrides: Partial<WorkflowRuntime> = {}): WorkflowRuntime {
  const mocks = createMockRuntimeDeps();
  return {
    ...mocks,
    human: new InMemoryHumanTaskHandler(),
    ...overrides,
  };
}

describe('DSL 校验：三类新节点配置与端口', () => {
  it('合法 format-validate 工作流通过校验', () => {
    const wf = workflow(
      [
        node('start', WorkflowNodeType.START, {}),
        node('validate', WorkflowNodeType.FORMAT_VALIDATE, {
          schema: { type: 'object', properties: { name: { type: 'string' } } },
        }),
        node('end', WorkflowNodeType.END, { outputMapping: {} }),
      ],
      [edge('e1', 'start', 'validate'), edge('e2', 'validate', 'end', 'out')],
    );
    const result = validateWorkflow(wf);
    expect(result.valid).toBe(true);
    expect(result.issues.filter((i) => i.severity === 'error')).toHaveLength(0);
  });

  it('format-validate 缺少 schema 报 FORMAT_SCHEMA_MISSING', () => {
    const wf = workflow(
      [node('start', WorkflowNodeType.START), node('validate', WorkflowNodeType.FORMAT_VALIDATE, {}), node('end', WorkflowNodeType.END, {})],
      [edge('e1', 'start', 'validate'), edge('e2', 'validate', 'end')],
    );
    expect(validateWorkflow(wf).issues.some((i) => i.code === 'FORMAT_SCHEMA_MISSING')).toBe(true);
  });

  it('notify 缺少 channel/template 报 NOTIFY_CONFIG_MISSING', () => {
    const wf = workflow(
      [node('start', WorkflowNodeType.START), node('notify', WorkflowNodeType.NOTIFY, { recipientExpression: 'doctor-demo-001' }), node('end', WorkflowNodeType.END, {})],
      [edge('e1', 'start', 'notify'), edge('e2', 'notify', 'end')],
    );
    expect(validateWorkflow(wf).issues.some((i) => i.code === 'NOTIFY_CONFIG_MISSING')).toBe(true);
  });

  it('writeback 缺少 target/mapping 报 WRITEBACK_CONFIG_MISSING', () => {
    const wf = workflow(
      [node('start', WorkflowNodeType.START), node('save', WorkflowNodeType.WRITEBACK, { riskLevel: 'medium' }), node('end', WorkflowNodeType.END, {})],
      [edge('e1', 'start', 'save'), edge('e2', 'save', 'end')],
    );
    expect(validateWorkflow(wf).issues.some((i) => i.code === 'WRITEBACK_CONFIG_MISSING')).toBe(true);
  });

  it('format-validate 未声明的 invalid 端口出边报 MISSING_PORT', () => {
    const wf = workflow(
      [
        node('start', WorkflowNodeType.START),
        node('validate', WorkflowNodeType.FORMAT_VALIDATE, { schema: { type: 'object' } }),
        node('end', WorkflowNodeType.END, {}),
      ],
      [edge('e1', 'start', 'validate'), edge('e2', 'validate', 'end', 'rejected')],
    );
    expect(validateWorkflow(wf).issues.some((i) => i.code === 'MISSING_PORT')).toBe(true);
  });
});

describe('执行器：format-validate 白名单校验', () => {
  const schema = {
    type: 'object' as const,
    properties: {
      name: { type: 'string', required: true },
      age: { type: 'number', min: 0, max: 120 },
      status: { type: 'string', enum: ['on', 'off'] },
    },
  };

  it('必填/类型/范围/枚举合法时走 out 端口', async () => {
    const ctx = makeContext({ input: { data: { name: '患者-演示', age: 30, status: 'on' } } });
    const nc = makeNodeContext(ctx, makeRuntime());
    const outcome = await new FormatValidateNodeExecutor().execute(
      node('validate', WorkflowNodeType.FORMAT_VALIDATE, { schema, source: 'input.data' }),
      nc,
    );
    expect(outcome.status).toBe('completed');
    expect(outcome.selectedPort).toBe('out');
    expect(outcome.output).toMatchObject({ valid: true, errors: [] });
  });

  it('必填缺失与枚举非法时走 invalid 端口并收集错误', async () => {
    const ctx = makeContext({ input: { data: { age: 200, status: 'unknown' } } });
    const nc = makeNodeContext(ctx, makeRuntime());
    const outcome = await new FormatValidateNodeExecutor().execute(
      node('validate', WorkflowNodeType.FORMAT_VALIDATE, { schema, source: 'input.data', strict: true }),
      nc,
    );
    expect(outcome.selectedPort).toBe('invalid');
    expect((outcome.output as { valid: boolean; errors: string[] }).valid).toBe(false);
    expect((outcome.output as { errors: string[] }).errors.length).toBeGreaterThan(0);
  });

  it('取消信号在执行前置校验生效', async () => {
    const ctx = makeContext({ input: { data: {} } });
    const controller = new AbortController();
    controller.abort();
    const nc = makeNodeContext(ctx, makeRuntime());
    nc.signal = controller.signal;
    await expect(
      new FormatValidateNodeExecutor().execute(
        node('validate', WorkflowNodeType.FORMAT_VALIDATE, { schema }),
        nc,
      ),
    ).rejects.toBeInstanceOf(WorkflowCancelledError);
  });
});

describe('执行器：notify 离线桩位与 sink 注入', () => {
  it('未注入 sink 时返回 pending 离线桩位，不真正投递', async () => {
    const ctx = makeContext({ input: { name: '医生-演示' } });
    const outcome = await new NotifyNodeExecutor().execute(
      node('notify', WorkflowNodeType.NOTIFY, {
        channel: 'in-app',
        recipientExpression: '"doctor-demo-001"',
        template: '请审核 ${input.name} 的草稿',
      }),
      makeNodeContext(ctx, makeRuntime()),
    );
    expect(outcome.output).toMatchObject({ delivered: false, pending: true, channel: 'in-app' });
  });

  it('注入 sink 后投递成功，requireConfirmation 标记待确认', async () => {
    const messages: unknown[] = [];
    const ctx = makeContext({ input: { name: '医生-演示' } });
    const outcome = await new NotifyNodeExecutor().execute(
      node('notify', WorkflowNodeType.NOTIFY, {
        channel: 'email',
        recipientExpression: '"doctor-demo-001@example.test"',
        template: '请审核 ${input.name}',
        requireConfirmation: true,
      }),
      makeNodeContext(ctx, makeRuntime({ notifySink: (message) => { messages.push(message); } })),
    );
    expect(outcome.output).toMatchObject({ delivered: true, pending: false, pendingConfirmation: true });
    expect(messages).toHaveLength(1);
  });
});

describe('执行器：writeback 离线桩位、确认挂起与标识阻断', () => {
  const basePatient = { patientId: 'patient-demo-001', visitId: 'visit-demo-001' };

  it('低风险无确认要求时返回离线 pending 桩位，不直写 DB', async () => {
    const ctx = makeContext({ input: { record: '草稿内容' }, patient: basePatient });
    const outcome = await new WritebackNodeExecutor().execute(
      node('save', WorkflowNodeType.WRITEBACK, {
        target: 'emr-draft',
        mapping: { record: 'input.record' },
        riskLevel: 'low',
      }),
      makeNodeContext(ctx, makeRuntime()),
    );
    expect(outcome.output).toMatchObject({ persisted: false, pending: true, readOnly: false });
  });

  it('medium 风险且要求确认时返回 waiting_human，不直接写回', async () => {
    const ctx = makeContext({ input: { record: '草稿内容' }, patient: basePatient });
    const outcome = await new WritebackNodeExecutor().execute(
      node('save', WorkflowNodeType.WRITEBACK, {
        target: 'audit-log',
        mapping: { record: 'input.record' },
        riskLevel: 'medium',
        requireConfirmation: true,
      }),
      makeNodeContext(ctx, makeRuntime()),
    );
    expect(outcome.status).toBe('waiting_human');
    expect(outcome.output).toMatchObject({ status: 'waiting_human', pending: true });
  });

  it('缺少 patientId 时阻断并返回 MISSING_PATIENT_ID 错误码', async () => {
    const ctx = makeContext({ input: {}, patient: { visitId: 'visit-demo-001' } });
    const outcome = await new WritebackNodeExecutor().execute(
      node('save', WorkflowNodeType.WRITEBACK, {
        target: 'emr-draft',
        mapping: {},
        riskLevel: 'low',
      }),
      makeNodeContext(ctx, makeRuntime()),
    );
    expect(outcome.status).toBe('failed');
    expect(outcome.error).toContain('MISSING_PATIENT_ID');
  });

  it('缺少 visitId 时阻断并返回 MISSING_VISIT_ID 错误码', async () => {
    const ctx = makeContext({ input: {}, patient: { patientId: 'patient-demo-001' } });
    const outcome = await new WritebackNodeExecutor().execute(
      node('save', WorkflowNodeType.WRITEBACK, {
        target: 'emr-draft',
        mapping: {},
        riskLevel: 'low',
      }),
      makeNodeContext(ctx, makeRuntime()),
    );
    expect(outcome.status).toBe('failed');
    expect(outcome.error).toContain('MISSING_VISIT_ID');
  });
});
