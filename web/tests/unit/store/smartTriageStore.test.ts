/**
 * 健澜科技 jlmedaios - 智能导诊 Store 单元测试（M3-P）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/system', () => ({
  systemApi: { health: vi.fn() },
}));
vi.mock('@/services/api/smartTriage', () => ({
  startTriageApi: vi.fn(),
  chooseDepartmentApi: vi.fn(),
  submitPreliminaryApi: vi.fn(),
  listMyTriageApi: vi.fn(),
  listPreliminaryApi: vi.fn(),
  consumePreliminaryApi: vi.fn(),
}));

import { systemApi } from '@/services/api/system';
import {
  startTriageApi,
  chooseDepartmentApi,
  submitPreliminaryApi,
  listMyTriageApi,
  listPreliminaryApi,
  consumePreliminaryApi,
} from '@/services/api/smartTriage';
import { useSmartTriageStore } from '@/store/smartTriageStore';
import type { TriageSession, PreliminaryConsultation } from '@/types/smartTriage';

const sysM = vi.mocked(systemApi);
const mStart = vi.mocked(startTriageApi);
const mChoose = vi.mocked(chooseDepartmentApi);
const mSubmit = vi.mocked(submitPreliminaryApi);
const mListMy = vi.mocked(listMyTriageApi);
const mListPrelim = vi.mocked(listPreliminaryApi);
const mConsume = vi.mocked(consumePreliminaryApi);

const session = (over: Partial<TriageSession> = {}): TriageSession => ({
  id: 's1',
  accountId: 'acc1',
  patientId: null,
  symptoms: '头痛',
  dialog: [],
  recommendations: [
    { department: '神经内科', confidence: 0.8, matchedKeywords: ['头痛'], reason: 'r' },
  ],
  chosenDepartment: null,
  engineType: 'rule',
  status: 'open',
  createdAt: '2026-10-01',
  completedAt: null,
  ...over,
});

const preliminary = (over: Partial<PreliminaryConsultation> = {}): PreliminaryConsultation => ({
  id: 'p1',
  triageSessionId: null,
  accountId: 'acc1',
  patientId: null,
  targetDepartment: '神经内科',
  chiefComplaint: '头痛',
  presentIllness: '头痛 3 天',
  pastHistory: null,
  medications: null,
  allergies: null,
  structured: {},
  reportText: '报告',
  engineType: 'form',
  status: 'completed',
  createdAt: '2026-10-01',
  completedAt: '2026-10-01',
  ...over,
});

beforeEach(() => {
  useSmartTriageStore.setState({
    healthOk: false,
    healthMsg: '',
    checking: false,
    loading: false,
    submitting: false,
    currentSession: null,
    recommendations: [],
    mySessions: [],
    staffPreliminary: [],
    currentReport: null,
  });
  vi.clearAllMocks();
});

describe('M3-P 智能导诊 Store', () => {
  it('checkHealth：db up → healthOk', async () => {
    sysM.health.mockResolvedValue({ db: 'up' } as never);
    const ok = await useSmartTriageStore.getState().checkHealth();
    expect(ok).toBe(true);
    expect(useSmartTriageStore.getState().healthOk).toBe(true);
  });

  it('checkHealth：抛错 → healthOk false', async () => {
    sysM.health.mockRejectedValue(new Error('BFF 不可用'));
    const ok = await useSmartTriageStore.getState().checkHealth();
    expect(ok).toBe(false);
    expect(useSmartTriageStore.getState().healthMsg).toContain('BFF');
  });

  it('startTriage：推荐结果落库', async () => {
    mStart.mockResolvedValue({
      session: session(),
      recommendations: session().recommendations,
    } as never);
    await useSmartTriageStore.getState().startTriage({ symptoms: '头痛' });
    expect(useSmartTriageStore.getState().currentSession?.id).toBe('s1');
    expect(useSmartTriageStore.getState().recommendations).toHaveLength(1);
  });

  it('chooseDepartment：会话更新', async () => {
    mChoose.mockResolvedValue(
      session({ status: 'completed', chosenDepartment: '神经内科' }),
    );
    await useSmartTriageStore.getState().chooseDepartment('s1', '神经内科');
    expect(useSmartTriageStore.getState().currentSession?.status).toBe('completed');
  });

  it('submitPreliminary：报告落库', async () => {
    mSubmit.mockResolvedValue({
      consultation: preliminary(),
      reportText: '报告',
    } as never);
    await useSmartTriageStore.getState().submitPreliminary({
      history: { chiefComplaint: '头痛', presentIllness: '头痛 3 天' },
    });
    expect(useSmartTriageStore.getState().currentReport?.id).toBe('p1');
  });

  it('loadMySessions：列表落库', async () => {
    mListMy.mockResolvedValue([session()] as never);
    await useSmartTriageStore.getState().loadMySessions();
    expect(useSmartTriageStore.getState().mySessions).toHaveLength(1);
  });

  it('loadStaffPreliminary：列表落库', async () => {
    mListPrelim.mockResolvedValue([preliminary()] as never);
    await useSmartTriageStore.getState().loadStaffPreliminary();
    expect(useSmartTriageStore.getState().staffPreliminary).toHaveLength(1);
  });

  it('consumePreliminary：采用后刷新列表', async () => {
    mConsume.mockResolvedValue(
      preliminary({ status: 'consumed' }),
    );
    mListPrelim.mockResolvedValue([preliminary({ status: 'consumed' })] as never);
    await useSmartTriageStore.getState().consumePreliminary('p1');
    expect(useSmartTriageStore.getState().staffPreliminary[0].status).toBe('consumed');
  });

  it('reset：状态清空', () => {
    useSmartTriageStore.setState({ currentSession: session() });
    useSmartTriageStore.getState().reset();
    expect(useSmartTriageStore.getState().currentSession).toBeNull();
  });
});
