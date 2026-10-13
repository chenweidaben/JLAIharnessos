/**
 * 健澜科技 jlmedaios - M53-A 评估汇总 store 单测
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/nurseStation', () => ({ visitEvaluations: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as nurseApi from '@/services/api/nurseStation';
import { useEvalSummaryStore } from '@/store/evalSummaryStore';

const fake = {
  visitId: 'v1', patientId: 'p1', department: 'cardio',
  summary: {
    rehabTreatment: { modality: 'pt', status: 'completed', efficacy: 'poor', poorEfficacy: true },
    painClinic: { baselineNrs: 9, currentNrs: 8, breakthroughCount: 0, adjustmentSuggestion: 'x', severeNrs: true },
    flags: ['rehab_poor_efficacy', 'pain_severe_nrs'],
  },
};

describe('evalSummaryStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEvalSummaryStore.setState({ dbUp: null, data: null, loading: false, error: null });
  });

  it('checkHealth 成功置 dbUp', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    expect(await useEvalSummaryStore.getState().checkHealth()).toBe(true);
  });

  it('load 拉取评估汇总两块', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (nurseApi.visitEvaluations as ReturnType<typeof vi.fn>).mockResolvedValue(fake);
    await useEvalSummaryStore.getState().checkHealth();
    await useEvalSummaryStore.getState().load('v1');
    expect(nurseApi.visitEvaluations).toHaveBeenCalledWith('v1');
    expect(useEvalSummaryStore.getState().data?.summary.rehabTreatment.poorEfficacy).toBe(true);
    expect(useEvalSummaryStore.getState().data?.summary.painClinic.severeNrs).toBe(true);
  });
});
