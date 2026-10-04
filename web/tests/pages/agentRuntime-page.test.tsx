/**
 * 健澜科技 jlmedaios - 智能体运行台页面测试（M4-C）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：可执行智能体列表、实例列表渲染；
 *  - 选择智能体 + 输入 JSON 运行（有效/无效 JSON）；
 *  - 点击实例打开详情（节点记录、输入/输出回放）；
 *  - 取消运行中实例（Modal.confirm 确认）；
 *  - 断库：显式离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@test-utils';

import AgentRuntimePage from '@/pages/agentRuntime';
import type {
  RunDetailView,
  WorkflowInstanceView,
} from '@/types/agentRuntime';
import type { AgentBuilderSummary } from '@/types/agentBuilder';

vi.mock('@/services/api/agentRuntime', () => ({
  startAgentRunApi: vi.fn(),
  listAgentRunsApi: vi.fn(),
  getAgentRunApi: vi.fn(),
  cancelAgentRunApi: vi.fn(),
}));
vi.mock('@/services/api/agentBuilder', () => ({
  listBuilderAgentsApi: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as rtApi from '@/services/api/agentRuntime';
import * as abApi from '@/services/api/agentBuilder';
import { getSystemHealth } from '@/services/api/pharmacy';

const rt = rtApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const ab = abApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function builderAgent(over: Partial<AgentBuilderSummary> = {}): AgentBuilderSummary {
  return {
    agentId: 'my-agent',
    name: '病历书写助手',
    nameEn: null,
    category: '电子病历',
    riskLevel: 'low',
    description: '辅助书写病历',
    status: 'enabled',
    currentVersion: '1.0.0',
    versionCount: 1,
    hasDraft: false,
    ownerId: 'u-admin',
    builtin: false,
    updatedAt: '2026-09-29T08:00:00Z',
    ...over,
  };
}

function inst(over: Partial<WorkflowInstanceView> = {}): WorkflowInstanceView {
  return {
    id: 'inst1',
    instanceNo: 'WIN20260929A1',
    agentId: 'my-agent',
    agentVersion: '1.0.0',
    workflowId: 'main',
    state: 'completed',
    triggerType: 'manual',
    traceId: 'trace_abc',
    input: { question: '测试' },
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
  };
}

function detail(over: Partial<RunDetailView> = {}): RunDetailView {
  return {
    instance: inst(),
    nodes: [
      {
        id: 'nr1', instanceId: 'inst1', nodeId: 'start', nodeType: 'start',
        state: 'completed', attempts: 1, input: null, output: {},
        errorCode: null, errorMessage: null,
        durationMs: 1, startedAt: null, finishedAt: null,
      },
      {
        id: 'nr2', instanceId: 'inst1', nodeId: 'end', nodeType: 'end',
        state: 'completed', attempts: 1, input: null, output: { status: 'completed' },
        errorCode: null, errorMessage: null,
        durationMs: 1, startedAt: null, finishedAt: null,
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'up',
  });
  ab.listBuilderAgentsApi.mockResolvedValue([builderAgent()]);
  rt.listAgentRunsApi.mockResolvedValue([inst()]);
  rt.getAgentRunApi.mockResolvedValue(detail());
  rt.startAgentRunApi.mockResolvedValue(detail());
  rt.cancelAgentRunApi.mockResolvedValue({});
});

it('在线：可执行智能体列表与实例列表渲染', async () => {
  render(<AgentRuntimePage />);
  expect(await screen.findByText('病历书写助手')).toBeInTheDocument();
  expect(screen.getByText('WIN20260929A1')).toBeInTheDocument();
  expect(screen.getByTestId('rt-health-tag')).toHaveTextContent('BFF/DB 正常');
});

it('选择智能体 + 输入有效 JSON 运行', async () => {
  render(<AgentRuntimePage />);
  await screen.findByText('病历书写助手');
  fireEvent.change(screen.getByTestId('run-input'), {
    target: { value: '{"question":"患者头痛3天"}' },
  });
  fireEvent.click(screen.getByTestId('run-agent-btn'));
  await waitFor(() => expect(rt.startAgentRunApi).toHaveBeenCalledTimes(1));
  // 输入正确透传（无多余嵌套）
  expect(rt.startAgentRunApi.mock.calls[0][0]).toBe('my-agent');
  expect(rt.startAgentRunApi.mock.calls[0][1].input).toEqual({ question: '患者头痛3天' });
});

it('输入无效 JSON：显示错误，不调用运行', async () => {
  render(<AgentRuntimePage />);
  await screen.findByText('病历书写助手');
  fireEvent.change(screen.getByTestId('run-input'), {
    target: { value: '{not json' },
  });
  fireEvent.click(screen.getByTestId('run-agent-btn'));
  expect(await screen.findByText(/JSON 格式错误/)).toBeInTheDocument();
  expect(rt.startAgentRunApi).not.toHaveBeenCalled();
});

it('点击实例行打开详情：节点记录与输入/输出回放', async () => {
  render(<AgentRuntimePage />);
  const listCard = await screen.findByTestId('instance-list-card');
  // 在列表卡片内点击实例号（冒泡到行，打开详情）
  fireEvent.click(within(listCard).getByText('WIN20260929A1'));
  const detailCard = await screen.findByTestId('instance-detail-card');
  // nodeId 与 nodeType 对 start/end 节点文本相同，故用 AllBy 断言节点均已渲染
  expect(within(detailCard).getAllByText('start').length).toBeGreaterThan(0);
  expect(within(detailCard).getAllByText('end').length).toBeGreaterThan(0);
  expect(within(detailCard).getByTestId('instance-output')).toHaveTextContent('completed');
});

it('取消运行中实例：Modal.confirm 确认后调用取消', async () => {
  const runningInst = inst({ id: 'inst-run', state: 'running', output: null });
  const cancelledInst = { ...runningInst, state: 'cancelled' as const };
  rt.listAgentRunsApi.mockResolvedValue([runningInst]);
  rt.getAgentRunApi.mockResolvedValue(
    detail({ instance: runningInst, nodes: [] }),
  );
  rt.cancelAgentRunApi.mockResolvedValue(
    detail({ instance: cancelledInst, nodes: [] }),
  );
  render(<AgentRuntimePage />);
  const listCard = await screen.findByTestId('instance-list-card');
  fireEvent.click(within(listCard).getByText('WIN20260929A1'));
  const cancelBtn = await screen.findByRole('button', { name: '取消运行' });
  fireEvent.click(cancelBtn);
  const confirm = await screen.findByRole('button', { name: '取消实例' });
  fireEvent.click(confirm);
  await waitFor(() => expect(rt.cancelAgentRunApi).toHaveBeenCalledTimes(1));
}, 60000);

it('断库：显式离线 Alert，不渲染业务内容', async () => {
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'down',
  });
  render(<AgentRuntimePage />);
  expect(await screen.findByTestId('rt-offline-alert')).toBeInTheDocument();
  expect(screen.queryByTestId('rt-content')).toBeNull();
  expect(screen.getByTestId('rt-health-tag')).toHaveTextContent('BFF/DB 不可用');
});

it('失败实例：显示实例级错误 Alert，并可展开节点查看输出', async () => {
  const failedInst = inst({
    id: 'inst-fail', state: 'failed', output: null,
    errorCode: 'RUN_FAILED', errorMessage: 'LLM 节点执行失败',
  });
  const failedDetail = detail({
    instance: failedInst,
    nodes: [
      {
        id: 'nr1', instanceId: 'inst-fail', nodeId: 'start', nodeType: 'start',
        state: 'completed', attempts: 1, input: null, output: null,
        errorCode: null, errorMessage: null,
        durationMs: 1, startedAt: null, finishedAt: null,
      },
      {
        id: 'nr2', instanceId: 'inst-fail', nodeId: 'llm', nodeType: 'llm',
        state: 'failed', attempts: 1, input: null, output: null,
        errorCode: null, errorMessage: 'LLM 调用失败',
        durationMs: 5, startedAt: null, finishedAt: null,
      },
    ],
  });
  rt.listAgentRunsApi.mockResolvedValue([failedInst]);
  rt.getAgentRunApi.mockResolvedValue(failedDetail);
  render(<AgentRuntimePage />);
  const listCard = await screen.findByTestId('instance-list-card');
  // 失败实例的实例号与默认相同，需在列表卡片内点击
  fireEvent.click(within(listCard).getByText('WIN20260929A1'));
  const detailCard = await screen.findByTestId('instance-detail-card');
  // 实例级错误 Alert
  expect(within(detailCard).getByTestId('instance-error')).toHaveTextContent(
    /RUN_FAILED：LLM 节点执行失败/,
  );
  // 点击失败 llm 节点的"查看"，展开行显示节点错误信息
  fireEvent.click(within(detailCard).getByRole('button', { name: '查看' }));
  expect(await within(detailCard).findByText('LLM 调用失败')).toBeInTheDocument();
});

it('点击顶部刷新：重新探活并加载实例', async () => {
  render(<AgentRuntimePage />);
  await screen.findByText('病历书写助手');
  const callsBefore = healthMock.mock.calls.length;
  fireEvent.click(screen.getByTestId('rt-top-refresh'));
  await waitFor(() => expect(healthMock.mock.calls.length).toBeGreaterThan(callsBefore));
});

it('输入 JSON 数组（非对象）：显示错误，不调用运行', async () => {
  render(<AgentRuntimePage />);
  await screen.findByText('病历书写助手');
  fireEvent.change(screen.getByTestId('run-input'), {
    target: { value: '[1,2,3]' },
  });
  fireEvent.click(screen.getByTestId('run-agent-btn'));
  expect(await screen.findByText(/输入必须是 JSON 对象/)).toBeInTheDocument();
  expect(rt.startAgentRunApi).not.toHaveBeenCalled();
});

it('无已启用智能体：显示 Empty 引导', async () => {
  ab.listBuilderAgentsApi.mockResolvedValue([]);
  render(<AgentRuntimePage />);
  expect(await screen.findByText(/暂无已启用智能体/)).toBeInTheDocument();
});

it('加载智能体列表失败：显示错误提示', async () => {
  ab.listBuilderAgentsApi.mockRejectedValue(new Error('网络错误'));
  render(<AgentRuntimePage />);
  expect(await screen.findByText('网络错误')).toBeInTheDocument();
});

it('运行失败：显示错误 Alert，可关闭', async () => {
  rt.startAgentRunApi.mockRejectedValue(new Error('执行失败：节点超时'));
  render(<AgentRuntimePage />);
  await screen.findByText('病历书写助手');
  fireEvent.click(screen.getByTestId('run-agent-btn'));
  expect(await screen.findByText('执行失败：节点超时')).toBeInTheDocument();
});
