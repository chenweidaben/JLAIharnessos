/**
 * 健澜科技 jlmedaios - 互联网问诊工作站页面测试（M3-K）
 * Copyright (c) 2026 杭州健澜科技有限公司.
 *
 * 覆盖：
 *  - 在线：待接诊列表、点击会话、接诊、切换我的会话、回复、结束；
 *  - 断库：离线 Alert，不渲染业务内容。
 *
 * BFF 经 vi.mock 隔离；真实断库/越权另有端到端取证。
 */
import { it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@test-utils';

import ConsultationWorkbench from '@/pages/consultation';
import { useConsultationStore } from '@/store/consultationStore';
import type { ConsultationSessionView } from '@/types/consultation';

vi.mock('@/services/api/consultation', () => ({
  listPendingConsultations: vi.fn(),
  listDoctorConsultations: vi.fn(),
  getConsultation: vi.fn(),
  acceptConsultation: vi.fn(),
  sendDoctorMessage: vi.fn(),
  completeConsultation: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as api from '@/services/api/consultation';
import { getSystemHealth } from '@/services/api/pharmacy';

const m = api as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

function session(over: Partial<ConsultationSessionView> = {}): ConsultationSessionView {
  return {
    id: 's1',
    sessionNo: 'CONS20260930101001123456',
    accountId: 'a1',
    profileId: 'p1',
    patientId: 'pt1',
    doctorId: 'd1',
    department: '内科',
    visitType: 'followup',
    status: 'pending',
    eligibilityPassed: true,
    lastVisitId: 'v1',
    lastVisitAt: null,
    chiefComplaint: '复诊',
    cancelReason: null,
    acceptedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: '2026-09-30T08:00:00Z',
    updatedAt: '2026-09-30T08:00:00Z',
    ...over,
  };
}

function detailFor(s: ConsultationSessionView, messages: unknown[] = []) {
  return { session: s, messages };
}

beforeEach(() => {
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'healthy',
    version: '0.3.0',
    demoMode: false,
    db: 'up',
  });
  useConsultationStore.setState({
    pending: [],
    doctorSessions: [],
    current: null,
    input: '',
    loading: false,
    sending: false,
    health: { online: false, dbUp: false, checkedAt: null },
    healthChecking: false,
  });
});

it('在线：BFF 返回 status=healthy 且 db=up 时判定在线（不误报断库）', async () => {
  m.listPendingConsultations.mockResolvedValue([]);
  m.listDoctorConsultations.mockResolvedValue([]);
  render(<ConsultationWorkbench />);
  // 不出现断库横幅（findByText 会等待并因找不到而抛错，改用 queryByText 轮询）
  await waitFor(() => expect(useConsultationStore.getState().health.online).toBe(true));
  expect(screen.queryByText('后端服务或数据库不可用，问诊业务已暂停')).not.toBeInTheDocument();
  expect(screen.getByText('请选择左侧会话')).toBeInTheDocument();
});

it('在线：待接诊列表 → 点击 → 接诊', async () => {
  const pending = session();
  m.listPendingConsultations.mockResolvedValue([pending]);
  m.listDoctorConsultations.mockResolvedValue([]);
  m.getConsultation.mockResolvedValue(detailFor(pending));
  m.acceptConsultation.mockResolvedValue(session({ status: 'in_consultation' }));

  render(<ConsultationWorkbench />);

  // 待接诊列表项（sessionNo 后6位）
  const item = await screen.findByText('123456');
  fireEvent.click(item);

  // 接诊按钮（antd 两字按钮自动插空格，用正则兼容）
  const acceptBtn = await screen.findByRole('button', { name: /接\s*诊/ });
  fireEvent.click(acceptBtn);
  await waitFor(() => expect(m.acceptConsultation).toHaveBeenCalledWith('s1'));
});

it('在线：我的会话 → 回复消息 → 结束', async () => {
  const consult = session({ id: 's2', status: 'in_consultation', sessionNo: 'CONS20260930654321' });
  m.listPendingConsultations.mockResolvedValue([]);
  m.listDoctorConsultations.mockResolvedValue([consult]);
  m.getConsultation.mockResolvedValue(
    detailFor(consult, [
      { id: 'msg1', sessionId: 's2', senderType: 'patient', senderId: 'a1', msgType: 'text', content: '医生您好', createdAt: '' },
    ]),
  );
  m.sendDoctorMessage.mockResolvedValue({ id: 'msg2', createdAt: '' });
  m.completeConsultation.mockResolvedValue(session({ id: 's2', status: 'completed' }));

  render(<ConsultationWorkbench />);

  // 切到"我的会话"
  fireEvent.click(await screen.findByText('我的会话'));
  const item = await screen.findByText('654321');
  fireEvent.click(item);

  // 患者消息显示
  expect(await screen.findByText('医生您好')).toBeInTheDocument();

  // 输入回复
  const input = screen.getByPlaceholderText('输入回复内容，回车发送');
  fireEvent.change(input, { target: { value: '最近怎么样' } });
  fireEvent.click(screen.getByRole('button', { name: /发\s*送/ }));
  await waitFor(() =>
    expect(m.sendDoctorMessage).toHaveBeenCalledWith('s2', { content: '最近怎么样' }),
  );

  // 结束
  fireEvent.click(screen.getByRole('button', { name: '结束问诊' }));
  await waitFor(() => expect(m.completeConsultation).toHaveBeenCalledWith('s2'));
});

it('断库：离线 Alert，业务阻断', async () => {
  healthMock.mockResolvedValue({
    status: 'healthy',
    version: '0.3.0',
    demoMode: false,
    db: 'down',
  });
  render(<ConsultationWorkbench />);
  expect(
    await screen.findByText('后端服务或数据库不可用，问诊业务已暂停'),
  ).toBeInTheDocument();
});

it('未选择会话时显示空状态提示', async () => {
  m.listPendingConsultations.mockResolvedValue([]);
  m.listDoctorConsultations.mockResolvedValue([]);
  render(<ConsultationWorkbench />);
  expect(await screen.findByText('请选择左侧会话')).toBeInTheDocument();
});
