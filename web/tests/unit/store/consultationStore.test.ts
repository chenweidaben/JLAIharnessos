/**
 * 健澜科技 jlmedaios - 互联网问诊工作站 store 单测（M3-K）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConsultationStore } from '@/store/consultationStore';

vi.mock('@/services/api/consultation', () => ({
  listPendingConsultations: vi.fn(),
  listDoctorConsultations: vi.fn(),
  getConsultation: vi.fn(),
  acceptConsultation: vi.fn(),
  sendDoctorMessage: vi.fn(),
  completeConsultation: vi.fn(),
}));

vi.mock('@/services/api/pharmacy', () => ({
  getSystemHealth: vi.fn(),
}));

import * as api from '@/services/api/consultation';
import { getSystemHealth } from '@/services/api/pharmacy';

const session = {
  id: 's1',
  sessionNo: 'CONS20260930001',
  accountId: 'a1',
  profileId: 'p1',
  patientId: 'pt1',
  doctorId: 'd1',
  department: '内科',
  visitType: 'followup' as const,
  status: 'in_consultation' as const,
  eligibilityPassed: true,
  lastVisitId: 'v1',
  lastVisitAt: null,
  chiefComplaint: '复诊',
  cancelReason: null,
  acceptedAt: null,
  completedAt: null,
  cancelledAt: null,
  createdAt: '',
  updatedAt: '',
};

const detail = {
  session,
  messages: [
    { id: 'm1', sessionId: 's1', senderType: 'patient' as const, senderId: 'a1', msgType: 'text' as const, content: '你好', createdAt: '' },
  ],
};

const onlineHealth = { online: true, dbUp: true, checkedAt: null };

describe('consultationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useConsultationStore.setState({
      pending: [],
      doctorSessions: [],
      current: null,
      input: '',
      loading: false,
      sending: false,
      health: onlineHealth,
      healthChecking: false,
    });
  });

  it('checkHealth 成功（BFF 返回 status=healthy）时 online=true', async () => {
    (getSystemHealth as any).mockResolvedValue({ status: 'healthy', db: 'up' });
    const up = await useConsultationStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useConsultationStore.getState().health.online).toBe(true);
    expect(useConsultationStore.getState().healthChecking).toBe(false);
  });

  it('checkHealth 失败时 online=false 且 healthChecking 复位', async () => {
    (getSystemHealth as any).mockRejectedValue(new Error('BFF 不可达'));
    const up = await useConsultationStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useConsultationStore.getState().health.online).toBe(false);
    expect(useConsultationStore.getState().healthChecking).toBe(false);
  });

  it('loadPending 拉取待接诊队列', async () => {
    (api.listPendingConsultations as any).mockResolvedValue([session]);
    await useConsultationStore.getState().loadPending();
    expect(useConsultationStore.getState().pending).toHaveLength(1);
  });

  it('loadDoctorSessions 拉取我的会话', async () => {
    (api.listDoctorConsultations as any).mockResolvedValue([session]);
    await useConsultationStore.getState().loadDoctorSessions();
    expect(useConsultationStore.getState().doctorSessions).toHaveLength(1);
  });

  it('openSession 加载会话详情', async () => {
    (api.getConsultation as any).mockResolvedValue(detail);
    await useConsultationStore.getState().openSession('s1');
    expect(useConsultationStore.getState().current?.session.id).toBe('s1');
  });

  it('offline 时 loadPending 不发起请求', async () => {
    useConsultationStore.setState({ health: { online: false, dbUp: false, checkedAt: null } });
    await useConsultationStore.getState().loadPending();
    expect(api.listPendingConsultations).not.toHaveBeenCalled();
  });

  it('accept 接诊后刷新当前会话', async () => {
    (api.acceptConsultation as any).mockResolvedValue({ ...session, status: 'in_consultation' });
    (api.getConsultation as any).mockResolvedValue(detail);
    (api.listPendingConsultations as any).mockResolvedValue([]);
    (api.listDoctorConsultations as any).mockResolvedValue([]);
    await useConsultationStore.getState().accept('s1');
    expect(api.acceptConsultation).toHaveBeenCalledWith('s1');
  });

  it('send 发送后清空输入框', async () => {
    useConsultationStore.setState({ current: detail, input: '回复' });
    (api.sendDoctorMessage as any).mockResolvedValue({ id: 'm2', createdAt: '' });
    (api.getConsultation as any).mockResolvedValue(detail);
    await useConsultationStore.getState().send();
    expect(api.sendDoctorMessage).toHaveBeenCalledWith('s1', { content: '回复' });
    expect(useConsultationStore.getState().input).toBe('');
  });

  it('send 空内容不发请求', async () => {
    useConsultationStore.setState({ current: detail, input: '   ' });
    await useConsultationStore.getState().send();
    expect(api.sendDoctorMessage).not.toHaveBeenCalled();
  });

  it('complete 结束后刷新', async () => {
    (api.completeConsultation as any).mockResolvedValue({ ...session, status: 'completed' });
    (api.getConsultation as any).mockResolvedValue({
      session: { ...session, status: 'completed' },
      messages: [],
    });
    (api.listPendingConsultations as any).mockResolvedValue([]);
    (api.listDoctorConsultations as any).mockResolvedValue([]);
    await useConsultationStore.getState().complete('s1');
    expect(api.completeConsultation).toHaveBeenCalledWith('s1');
  });
});
