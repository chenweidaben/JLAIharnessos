/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * ImagingAiReport 集成：报告渲染(18器官/146发现) + 离线降级空态
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@test-utils';

// Mock service 层（测试环境 VITE_MOCK_ENABLED=false，避免真实 HTTP）
vi.mock('@/services/api/imagingAi', () => ({
  fetchRadarCatalog: vi.fn(async () => buildCatalog()),
  runRadarReport: vi.fn(async (studyUid: string) => ({
    job: { job_id: 'job_test', status: 'completed', progress: 1, mode: 'demo', study_uid: studyUid, error: null },
    result: buildDemoResult(studyUid, 'demo'),
  })),
  submitRadarReview: vi.fn(),
}));

import ImagingAiReport from '@/components/imagingAi/ImagingAiReport';
import { useImagingAiStore } from '@/store/imagingAiStore';
import { buildCatalog, buildDemoResult } from '@/mock/imagingAi';
import { RADAR_ORGAN_KEYS } from '@/mock/radarCatalogData';
import { runRadarReport } from '@/services/api/imagingAi';

// typed as mocked fn
const mockRunRadarReport = vi.mocked(runRadarReport);

describe('ImagingAiReport', () => {
  beforeEach(() => {
    useImagingAiStore.getState().resetReport();
    mockRunRadarReport.mockResolvedValue({
      job: {
        job_id: 'job_test',
        status: 'completed',
        progress: 1,
        mode: 'demo',
        study_uid: 'STUDY',
        error: null,
        result: buildDemoResult('STUDY', 'demo'),
      },
      result: buildDemoResult('STUDY', 'demo'),
    });
  });

  it('加载完成后渲染头部、18 器官导航与 146 发现列表', async () => {
    render(<ImagingAiReport studyUid="STUDY-INTEG-1" />);

    // 头部
    expect(await screen.findByTestId('ai-report-header')).toBeInTheDocument();
    expect(screen.getByText('damo-radar')).toBeInTheDocument();
    expect(screen.getByText('eaec6129')).toBeInTheDocument();
    expect(screen.getByTestId('demo-watermark')).toBeInTheDocument();

    // 组合报告容器
    expect(await screen.findByTestId('imaging-ai-report')).toBeInTheDocument();

    // 146 发现行
    expect(screen.getAllByTestId('finding-row')).toHaveLength(146);

    // 18 器官导航
    for (const organ of RADAR_ORGAN_KEYS) {
      expect(screen.getByText(organ)).toBeInTheDocument();
    }

    // 复核面板存在
    expect(screen.getByTestId('review-panel')).toBeInTheDocument();
  });

  it('离线 / 推理服务不可用时渲染降级空态而非白屏', async () => {
    mockRunRadarReport.mockRejectedValueOnce(new Error('radar-inference 连接失败'));
    render(<ImagingAiReport studyUid="STUDY-INTEG-2" />);
    expect(await screen.findByTestId('ai-error')).toBeInTheDocument();
    expect(screen.getByText(/AI 推理服务暂不可用/)).toBeInTheDocument();
  });
});
