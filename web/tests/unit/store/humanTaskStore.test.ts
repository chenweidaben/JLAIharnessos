/**
 * 健澜科技 jlmedaios - 人工工单中心 humanTaskStore 单元测试（M4-D）
 *
 * mock services/api/humanTask 与 pharmacy 健康探针，验证：
 *  - 健康门禁（up/down/抛错）；
 *  - 工单列表、详情加载（成功/失败）；
 *  - 认领/处理写门禁（dbUp=false 拒绝、成功刷新读模型、失败留 error）；
 *  - reset 回到初始。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/humanTask', () => ({
  listMyHumanTasksApi: vi.fn(),
  getHumanTaskApi: vi.fn(),
  claimHumanTaskApi: vi.fn(),
  resolveHumanTaskApi: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as htApi from '@/services/api/humanTask';
import { getSystemHealth } from '@/services/api/pharmacy';
import { useHumanTaskStore } from '@/store/humanTaskStore';
import type { HumanTaskDetailView, HumanTaskView } from '@/types/humanTask';

const m = htApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

const task = (over: Partial<HumanTaskView> = {}): HumanTaskView => ({
  id: 'task1',
  taskNo: 'HT20260929A1',
  instanceId: 'inst1',
  nodeId: 'human',
  title: '高风险操作确认',
  instructions: '请核对',
  assigneeRoles: ['admin'],
  assigneeUsers: [],
  formSchema: {},
  reviewData: [],
  status: 'pending',
  resolution: null,
  claimedBy: null,
  resolvedBy: null,
  dueAt: null,
  createdAt: '2026-09-29T08:00:00Z',
  resolvedAt: null,
  ...over,
});

const detail = (over: Partial<HumanTaskDetailView> = {}): HumanTaskDetailView => ({
  task: task(),
  instance: {
    id: 'inst1',
    instanceNo: 'WIN20260929I1',
    agentId: 'my-agent',
    agentVersion: '1.0.0',
    workflowId: 'main',
    state: 'waiting_human',
    triggerType: 'manual',
    traceId: 'trace_abc',
    input: {},
    output: null,
    contextVars: {},
    errorCode: null,
    errorMessage: null,
    actorId: null,
    patientRef: null,
    tokensIn: 0,
    tokensOut: 0,
    durationMs: null,
    startedAt: '2026-09-29T08:00:00Z',
    finishedAt: null,
  },
  ...over,
});

const initial = useHumanTaskStore.getState();

beforeEach(() => {
  initial.reset();
  vi.clearAllMocks();
});

describe('humanTaskStore 健康门禁', () => {
  it('健康 db=up：dbUp=true', async () => {
    healthMock.mockResolvedValue({ status: 'ok', version: '0.3.0', demoMode: false, db: 'up' });
    const up = await useHumanTaskStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useHumanTaskStore.getState().dbUp).toBe(true);
  });

  it('健康 db=down：dbUp=false', async () => {
    healthMock.mockResolvedValue({ status: 'ok', version: '0.3.0', demoMode: false, db: 'down' });
    const up = await useHumanTaskStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useHumanTaskStore.getState().dbUp).toBe(false);
  });

  it('健康探针抛错：dbUp=false 并留 error', async () => {
    healthMock.mockRejectedValue(new Error('网络错误'));
    const up = await useHumanTaskStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useHumanTaskStore.getState().error).toContain('网络错误');
  });
});

describe('humanTaskStore 读模型', () => {
  it('加载工单列表成功', async () => {
    m.listMyHumanTasksApi.mockResolvedValue([task()]);
    await useHumanTaskStore.getState().loadTasks();
    expect(useHumanTaskStore.getState().tasks).toHaveLength(1);
  });

  it('加载工单详情成功', async () => {
    m.getHumanTaskApi.mockResolvedValue(detail());
    const ok = await useHumanTaskStore.getState().openTask('task1');
    expect(ok).toBe(true);
    expect(useHumanTaskStore.getState().detail?.task.id).toBe('task1');
  });

  it('加载详情失败：detail=null 并留 error', async () => {
    m.getHumanTaskApi.mockRejectedValue(new Error('不存在'));
    const ok = await useHumanTaskStore.getState().openTask('x');
    expect(ok).toBe(false);
    expect(useHumanTaskStore.getState().detail).toBeNull();
  });
});

describe('humanTaskStore 写门禁', () => {
  it('dbUp=false 时认领被拒绝', async () => {
    const ok = await useHumanTaskStore.getState().claimTask('task1');
    expect(ok).toBe(false);
    expect(m.claimHumanTaskApi).not.toHaveBeenCalled();
  });

  it('dbUp=false 时处理被拒绝', async () => {
    const ok = await useHumanTaskStore.getState().resolveTask('task1', { approved: true });
    expect(ok).toBe(false);
    expect(m.resolveHumanTaskApi).not.toHaveBeenCalled();
  });

  it('认领成功：更新 detail 并刷新列表', async () => {
    useHumanTaskStore.setState({ dbUp: true });
    m.claimHumanTaskApi.mockResolvedValue(
      detail({ task: task({ status: 'claimed', claimedBy: 'u-admin' }) }),
    );
    m.listMyHumanTasksApi.mockResolvedValue([]);
    const ok = await useHumanTaskStore.getState().claimTask('task1');
    expect(ok).toBe(true);
    expect(useHumanTaskStore.getState().detail?.task.status).toBe('claimed');
  });

  it('处理成功：approved 透传', async () => {
    useHumanTaskStore.setState({ dbUp: true });
    m.resolveHumanTaskApi.mockResolvedValue(
      detail({
        task: task({
          status: 'resolved',
          resolvedAt: '2026-09-29T08:01:00Z',
          resolution: { approved: true, reviewerId: 'u-admin', comment: '确认' },
        }),
      }),
    );
    m.listMyHumanTasksApi.mockResolvedValue([]);
    const ok = await useHumanTaskStore.getState().resolveTask('task1', {
      approved: true,
      comment: '确认',
    });
    expect(ok).toBe(true);
    expect(m.resolveHumanTaskApi.mock.calls[0][1]).toEqual({
      approved: true,
      comment: '确认',
    });
  });

  it('认领失败：留 error 不更新', async () => {
    useHumanTaskStore.setState({ dbUp: true });
    m.claimHumanTaskApi.mockRejectedValue(new Error('已被认领'));
    const ok = await useHumanTaskStore.getState().claimTask('task1');
    expect(ok).toBe(false);
    expect(useHumanTaskStore.getState().error).toContain('已被认领');
  });
});

describe('humanTaskStore reset', () => {
  it('reset 回到初始空状态', () => {
    useHumanTaskStore.setState({ tasks: [task()], dbUp: true });
    useHumanTaskStore.getState().reset();
    const s = useHumanTaskStore.getState();
    expect(s.tasks).toHaveLength(0);
    expect(s.dbUp).toBe(false);
    expect(s.detail).toBeNull();
  });
});
