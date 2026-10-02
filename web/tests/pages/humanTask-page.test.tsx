/**
 * 健澜科技 jlmedaios - 人工工单中心页面测试（M4-D）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：工单列表渲染（工单号/标题/角色/状态）；
 *  - 点击工单打开详情（审核上下文 + 关联实例）；
 *  - 认领（pending→claimed）；
 *  - 批准并签名 / 驳回（resolve，approved 透传）；
 *  - 已处理工单显示 resolution；
 *  - 未选择工单显示 Empty；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import HumanTaskPage from '@/pages/humanTask';
import type { HumanTaskDetailView, HumanTaskView } from '@/types/humanTask';

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

const ht = htApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function task(over: Partial<HumanTaskView> = {}): HumanTaskView {
  return {
    id: 'task1',
    taskNo: 'HT20260929A1',
    instanceId: 'inst1',
    nodeId: 'human',
    title: '高风险操作确认',
    instructions: '请核对以下内容',
    assigneeRoles: ['admin'],
    assigneeUsers: [],
    formSchema: {},
    reviewData: [{ nodeId: 'start', state: 'completed', output: {} }],
    status: 'pending',
    resolution: null,
    claimedBy: null,
    resolvedBy: null,
    dueAt: null,
    createdAt: '2026-09-29T08:00:00Z',
    resolvedAt: null,
    ...over,
  };
}

function detail(over: Partial<HumanTaskDetailView> = {}): HumanTaskDetailView {
  return {
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
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useHumanTaskStore.getState().reset();
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'up',
  });
  ht.listMyHumanTasksApi.mockResolvedValue([task()]);
  ht.getHumanTaskApi.mockResolvedValue(detail());
  ht.claimHumanTaskApi.mockResolvedValue(
    detail({ task: task({ status: 'claimed', claimedBy: 'u-admin' }) }),
  );
  ht.resolveHumanTaskApi.mockResolvedValue(
    detail({
      task: task({
        status: 'resolved',
        resolvedBy: 'u-admin',
        resolvedAt: '2026-09-29T08:01:00Z',
        resolution: { approved: true, reviewerId: 'u-admin', comment: '确认' },
      }),
    }),
  );
});

/** 渲染页面并打开第一条工单详情 */
async function renderAndOpen(): Promise<void> {
  render(<HumanTaskPage />);
  const listCard = await screen.findByTestId('ht-task-list');
  fireEvent.click(within(listCard).getByRole('button', { name: '处理' }));
  await screen.findByTestId('ht-task-detail');
}

it('在线：工单列表渲染（工单号/标题/状态）', async () => {
  render(<HumanTaskPage />);
  expect(await screen.findByText('HT20260929A1')).toBeInTheDocument();
  expect(screen.getByText('高风险操作确认')).toBeInTheDocument();
  expect(screen.getByTestId('ht-health-tag')).toHaveTextContent('BFF/DB 正常');
});

it('点击工单打开详情：显示审核上下文与关联实例', async () => {
  await renderAndOpen();
  const detailCard = screen.getByTestId('ht-task-detail');
  expect(within(detailCard).getByTestId('ht-review-data')).toBeInTheDocument();
  // instanceNo 与 agentId、state 在同一文本节点，用正则匹配
  expect(within(detailCard).getByText(/WIN20260929I1/)).toBeInTheDocument();
});

it('认领工单：调用 claim，状态更新', async () => {
  await renderAndOpen();
  fireEvent.click(screen.getByTestId('ht-claim-btn'));
  await waitFor(() => expect(ht.claimHumanTaskApi).toHaveBeenCalledTimes(1));
  expect(ht.claimHumanTaskApi.mock.calls[0][0]).toBe('task1');
});

it('批准并签名：approved=true 透传', async () => {
  ht.getHumanTaskApi.mockResolvedValue(
    detail({ task: task({ status: 'claimed', claimedBy: 'u-admin' }) }),
  );
  await renderAndOpen();
  fireEvent.click(screen.getByTestId('ht-approve-btn'));
  await waitFor(() => expect(ht.resolveHumanTaskApi).toHaveBeenCalledTimes(1));
  expect(ht.resolveHumanTaskApi.mock.calls[0][1].approved).toBe(true);
});

it('驳回：approved=false 透传并带意见', async () => {
  ht.getHumanTaskApi.mockResolvedValue(
    detail({ task: task({ status: 'claimed', claimedBy: 'u-admin' }) }),
  );
  await renderAndOpen();
  fireEvent.change(screen.getByPlaceholderText(/请填写审核意见/), {
    target: { value: '存在风险' },
  });
  fireEvent.click(screen.getByTestId('ht-reject-btn'));
  await waitFor(() => expect(ht.resolveHumanTaskApi).toHaveBeenCalledTimes(1));
  const call = ht.resolveHumanTaskApi.mock.calls[0];
  expect(call[1].approved).toBe(false);
  expect(call[1].comment).toBe('存在风险');
});

it('已处理工单：显示 resolution 结论', async () => {
  ht.listMyHumanTasksApi.mockResolvedValue([
    task({
      status: 'resolved',
      resolvedBy: 'u-admin',
      resolvedAt: '2026-09-29T08:01:00Z',
      resolution: { approved: true, reviewerId: 'u-admin', comment: '确认无误' },
    }),
  ]);
  ht.getHumanTaskApi.mockResolvedValue(
    detail({
      task: task({
        status: 'resolved',
        resolvedBy: 'u-admin',
        resolvedAt: '2026-09-29T08:01:00Z',
        resolution: { approved: true, reviewerId: 'u-admin', comment: '确认无误' },
      }),
    }),
  );
  await renderAndOpen();
  const resolution = await screen.findByTestId('ht-resolution');
  expect(resolution).toHaveTextContent('已批准');
  expect(resolution).toHaveTextContent('确认无误');
});

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'down',
  });
  render(<HumanTaskPage />);
  expect(await screen.findByTestId('ht-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('ht-content')).toBeNull();
});

it('未选择工单：详情区显示 Empty 引导', async () => {
  render(<HumanTaskPage />);
  await screen.findByTestId('ht-task-list');
  expect(screen.getByTestId('ht-detail-empty')).toBeInTheDocument();
});
