/**
 * 健澜科技 jlmedaios - 护士屏 PICC 块 store 单测（M69-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/care', () => ({ getSystemHealth: vi.fn() }));
vi.mock('@/services/api/nurseStation', () => ({ visitEvaluations: vi.fn() }));

import * as careApi from '@/services/api/care';
import * as nsApi from '@/services/api/nurseStation';
import { useEvalSummaryStore } from '@/store/evalSummaryStore';

describe('evalSummaryStore picc block', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useEvalSummaryStore.setState({ dbUp: null, data: null, loading: false, error: null });
  });

  it('load 返回 evaluations 含 picc 块', async () => {
    (careApi.getSystemHealth as ReturnType<typeof vi.fn>).mockResolvedValue({ db: 'up' });
    (nsApi.visitEvaluations as ReturnType<typeof vi.fn>).mockResolvedValue({
      summary: { picc: { deviceType: 'picc', lastMaintainedAt: '2026-10-10', complication: 'none', due: false, complicationAlert: false } },
    });
    await useEvalSummaryStore.getState().checkHealth();
    await useEvalSummaryStore.getState().load('v1');
    const picc = (useEvalSummaryStore.getState().data?.summary as unknown as { picc?: { deviceType?: string } })?.picc;
    expect(picc?.deviceType).toBe('picc');
  });
});
