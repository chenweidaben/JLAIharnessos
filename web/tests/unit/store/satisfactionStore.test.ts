/**
 * 健澜科技 jlmedaios - 满意度评价 Store 单元测试（M3-O）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/system', () => ({
  systemApi: { health: vi.fn() },
}));
vi.mock('@/services/api/satisfaction', () => ({
  submitMySurveyApi: vi.fn(),
  submitSurveyByStaffApi: vi.fn(),
  listMySurveysApi: vi.fn(),
  listSurveysApi: vi.fn(),
  getSatisfactionStatsApi: vi.fn(),
}));

import { systemApi } from '@/services/api/system';
import {
  submitMySurveyApi,
  submitSurveyByStaffApi,
  listMySurveysApi,
  listSurveysApi,
  getSatisfactionStatsApi,
} from '@/services/api/satisfaction';
import { useSatisfactionStore } from '@/store/satisfactionStore';
import type { SatisfactionSurvey } from '@/types/satisfaction';

const sysM = vi.mocked(systemApi);

const survey = (over: Record<string, unknown> = {}): SatisfactionSurvey => ({
  id: 'sv1',
  surveyNo: 'SV20261001001',
  patientId: 'pt1',
  visitId: 'v1',
  consultId: null,
  sourceType: 'outpatient',
  overallScore: 5,
  medicalScore: 5,
  serviceScore: 4,
  environmentScore: 4,
  processScore: 4,
  waitScore: 3,
  comment: '好',
  status: 'submitted',
  submittedBy: 'acc1',
  submittedAt: '2026-10-01T08:00:00Z',
  ...over,
});

const stats = {
  total: 10,
  overallAvg: 4.6,
  medicalAvg: 4.7,
  serviceAvg: 4.5,
  environmentAvg: 4.4,
  processAvg: 4.3,
  waitAvg: 4.0,
  positiveRate: 90,
};

const scores = {
  overallScore: 5,
  medicalScore: 5,
  serviceScore: 4,
  environmentScore: 4,
  processScore: 4,
  waitScore: 3,
};

beforeEach(() => {
  useSatisfactionStore.getState().reset();
  vi.clearAllMocks();
});

describe('satisfactionStore', () => {
  it('健康门禁：db=up 时 healthOk=true', async () => {
    sysM.health.mockResolvedValue({ status: 'healthy', db: 'up' } as never);
    const ok = await useSatisfactionStore.getState().checkHealth();
    expect(ok).toBe(true);
    expect(useSatisfactionStore.getState().healthOk).toBe(true);
  });

  it('健康门禁：异常时 healthOk=false', async () => {
    sysM.health.mockRejectedValue(new Error('ECONNREFUSED') as never);
    const ok = await useSatisfactionStore.getState().checkHealth();
    expect(ok).toBe(false);
    expect(useSatisfactionStore.getState().healthMsg).toContain('ECONNREFUSED');
  });

  it('loadMy：我的评价落库', async () => {
    vi.mocked(listMySurveysApi).mockResolvedValue([survey()] as never);
    await useSatisfactionStore.getState().loadMy();
    expect(useSatisfactionStore.getState().mySurveys).toHaveLength(1);
  });

  it('loadAll：全部评价落库', async () => {
    vi.mocked(listSurveysApi).mockResolvedValue([survey(), survey({ id: 'sv2' })] as never);
    await useSatisfactionStore.getState().loadAll({});
    expect(useSatisfactionStore.getState().allSurveys).toHaveLength(2);
  });

  it('loadStats：统计落库', async () => {
    vi.mocked(getSatisfactionStatsApi).mockResolvedValue(stats as never);
    await useSatisfactionStore.getState().loadStats();
    expect(useSatisfactionStore.getState().stats?.total).toBe(10);
    expect(useSatisfactionStore.getState().stats?.positiveRate).toBe(90);
  });

  it('submitMy：患者提交返回 created', async () => {
    vi.mocked(submitMySurveyApi).mockResolvedValue({ survey: survey(), created: true } as never);
    const r = await useSatisfactionStore.getState().submitMy({ patientId: 'pt1', visitId: 'v1', ...scores });
    expect(r.created).toBe(true);
  });

  it('submitStaff：医护代提交返回 created', async () => {
    vi.mocked(submitSurveyByStaffApi).mockResolvedValue({ survey: survey(), created: true } as never);
    const r = await useSatisfactionStore.getState().submitStaff({ patientId: 'pt1', visitId: 'v1', ...scores });
    expect(r.created).toBe(true);
  });

  it('reset：状态清空', () => {
    useSatisfactionStore.setState({ mySurveys: [survey()] });
    useSatisfactionStore.getState().reset();
    expect(useSatisfactionStore.getState().mySurveys).toHaveLength(0);
  });
});
