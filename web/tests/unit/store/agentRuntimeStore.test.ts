/**
 * 健澜科技 jlmedaios - 智能体运行台 agentRuntimeStore 单元测试（M4-C）
 *
 * mock services/api/agentRuntime 与 pharmacy 健康探针，验证：
 *  - 健康门禁（up/down/抛错）；
 *  - 实例列表、详情加载（成功/失败）；
 *  - 执行 / 取消写门禁（dbUp=false 拒绝、成功刷新读模型、失败留 error）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/agentRuntime', () => ({
  startAgentRunApi: vi.fn(),
  listAgentRunsApi: vi.fn(),
  getAgentRunApi: vi.fn(),
  cancelAgentRunApi: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as rtApi from '@/services/api/agentRuntime';
import { getSystemHealth } from '@/services/api/pharmacy';
import { useAgentRuntimeStore } from '@/store/agentRuntimeStore';
import type { RunDetailView, WorkflowInstanceView } from '@/types/agentRuntime';

const m = rtApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

const instance = (over: Partial<WorkflowInstanceView> = {}): WorkflowInstanceView => ({
  id: 'inst1',
  instanceNo: 'WIN20260929A1',
  agentId: 'my-agent',
  agentVersion: '1.0.0',
  workflowId: 'main',
  state: 'completed',
  triggerType: 'manual',
  traceId: 'trace_abc',
  input: {},
  output: { status: 'completed' },
  contextVars: {},
  errorCode: null,
  errorMessage: null,
  actorId: null,
  patientRef: null,
  tokensIn: 0,
  tokensOut: 0,
  durationMs: 120,
  startedAt: '2026-09-29T08:00:00Z',
  finishedAt: '2026-09-29T08:00:01Z',
  ...over,
});

const detail = (over: Partial<RunDetailView> = {}): RunDetailView => ({
  instance: instance(),
  nodes: [
    {
      id: 'nr1', instanceId: 'inst1', nodeId: 'start', nodeType: 'start',
      state: 'completed', attempts: 1, input: null, output: {},
      errorCode: null, errorMessage: null,
      durationMs: 1, startedAt: null, finishedAt: null,
    },
  ],
  ...over,
});

const initial = useAgentRuntimeStore.getState();

beforeEach(() => {
  useAgentRuntimeStore.setState({ ...initial, instances: [], detail: null });
  vi.clearAllMocks();
  healthMock.mockResolvedValue({ status: 'ok', version: '0.3.0', demoMode: false, db: 'up' });
});

describe('agentRuntimeStore 健康门禁', () => {
  it('探活成功：dbUp=true', async () => {
    const up = await useAgentRuntimeStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useAgentRuntimeStore.getState().dbUp).toBe(true);
  });

  it('探活抛错：dbUp=false 且留 error', async () => {
    healthMock.mockRejectedValueOnce(new Error('network down'));
    const up = await useAgentRuntimeStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useAgentRuntimeStore.getState().error).toContain('network down');
  });
});

describe('agentRuntimeStore 读模型', () => {
  it('loadInstances 成功/失败', async () => {
    m.listAgentRunsApi.mockResolvedValueOnce([instance()]);
    await useAgentRuntimeStore.getState().loadInstances();
    expect(useAgentRuntimeStore.getState().instances).toHaveLength(1);

    m.listAgentRunsApi.mockRejectedValueOnce(new Error('bad'));
    await useAgentRuntimeStore.getState().loadInstances();
    expect(useAgentRuntimeStore.getState().error).toBe('bad');
  });

  it('openInstance 成功/失败', async () => {
    m.getAgentRunApi.mockResolvedValueOnce(detail());
    const ok = await useAgentRuntimeStore.getState().openInstance('inst1');
    expect(ok).toBe(true);
    expect(useAgentRuntimeStore.getState().detail?.instance.id).toBe('inst1');

    m.getAgentRunApi.mockRejectedValueOnce(new Error('no'));
    const fail = await useAgentRuntimeStore.getState().openInstance('inst2');
    expect(fail).toBe(false);
    expect(useAgentRuntimeStore.getState().error).toBe('no');
  });
});

describe('agentRuntimeStore 写门禁', () => {
  it('runAgent：dbUp=false 拒绝；成功后刷新', async () => {
    useAgentRuntimeStore.setState({ dbUp: false });
    expect(
      await useAgentRuntimeStore.getState().runAgent('my-agent', { input: { q: 1 } }),
    ).toBe(false);
    expect(m.startAgentRunApi).not.toHaveBeenCalled();

    useAgentRuntimeStore.setState({ dbUp: true });
    m.startAgentRunApi.mockResolvedValueOnce(detail());
    m.listAgentRunsApi.mockResolvedValueOnce([instance()]);
    const ok = await useAgentRuntimeStore.getState().runAgent('my-agent', { input: { q: 1 } });
    expect(ok).toBe(true);
    expect(m.startAgentRunApi).toHaveBeenCalledTimes(1);
  });

  it('runAgent：失败留 error', async () => {
    useAgentRuntimeStore.setState({ dbUp: true });
    m.startAgentRunApi.mockRejectedValueOnce(new Error('执行失败'));
    expect(await useAgentRuntimeStore.getState().runAgent('my-agent')).toBe(false);
    expect(useAgentRuntimeStore.getState().error).toBe('执行失败');
  });

  it('cancelInstance：dbUp=false 拒绝；成功路径', async () => {
    useAgentRuntimeStore.setState({ dbUp: false });
    expect(
      await useAgentRuntimeStore.getState().cancelInstance('inst1'),
    ).toBe(false);
    expect(m.cancelAgentRunApi).not.toHaveBeenCalled();

    useAgentRuntimeStore.setState({ dbUp: true });
    m.cancelAgentRunApi.mockResolvedValueOnce({});
    m.listAgentRunsApi.mockResolvedValueOnce([]);
    m.getAgentRunApi.mockResolvedValueOnce(detail());
    const ok = await useAgentRuntimeStore.getState().cancelInstance('inst1');
    expect(ok).toBe(true);
    expect(m.cancelAgentRunApi).toHaveBeenCalledTimes(1);
  });

  it('clearError 清除错误', () => {
    useAgentRuntimeStore.setState({ error: 'x' });
    useAgentRuntimeStore.getState().clearError();
    expect(useAgentRuntimeStore.getState().error).toBeNull();
  });
});
