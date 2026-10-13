/**
 * 健澜科技 jlmedaios - 满意度 store 单测（M63-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/satisfactionSurvey', () => ({
  submitSurvey: vi.fn(), surveyRanking: vi.fn(), listSurveyByVisit: vi.fn(),
}));

import * as careApi from '@/services/api/care';
import * as sApi from '@/services/api/satisfactionSurvey';
import { useSatisfactionStore } from '@/store/satisfactionSurveyStore';

describe('satisfactionSurveyStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSatisfactionStore.setState({
      dbUp: null, ranks: [], overallAvg: 0, loading: false, error: null,
    });
  });

  it('loadRanking 拉科室排名', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (sApi.surveyRanking as ReturnType<typeof vi.fn>).mockResolvedValue({
      ranks: [{ department: 'A', avg: 4.5, count: 2 }], overallAvg: 4.5,
    });
    await useSatisfactionStore.getState().checkHealth();
    await useSatisfactionStore.getState().loadRanking();
    expect(useSatisfactionStore.getState().ranks[0].department).toBe('A');
  });

  it('submit 提交后刷新排名', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (sApi.submitSurvey as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (sApi.surveyRanking as ReturnType<typeof vi.fn>).mockResolvedValue({ ranks: [], overallAvg: 0 });
    await useSatisfactionStore.getState().checkHealth();
    await useSatisfactionStore.getState().submit({
      visitId: 'v1', patientId: 'p1', medicalScore: 5, nursingScore: 4, logisticsScore: 3, environmentScore: 4, department: 'A',
    });
    expect(sApi.submitSurvey).toHaveBeenCalled();
  });
});
