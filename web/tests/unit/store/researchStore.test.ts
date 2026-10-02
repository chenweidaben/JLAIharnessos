/**
 * 健澜科技 jlmedaios - 科研队列 researchStore 单元测试（M5-B）
 *
 * mock services/api/research 与 pharmacy 健康探针，验证：
 *  - 健康门禁（up/down/抛错）；
 *  - 队列列表、详情加载（成功/失败）；
 *  - 创建/发布/归档/运行/导出 写门禁
 *    （dbUp=false 拒绝、成功刷新、失败留 error）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/research', () => ({
  fetchCohorts: vi.fn(),
  createCohortApi: vi.fn(),
  fetchCohort: vi.fn(),
  updateCohortApi: vi.fn(),
  publishCohort: vi.fn(),
  archiveCohort: vi.fn(),
  runCohort: vi.fn(),
  fetchCohortMembers: vi.fn(),
  fetchCohortStats: vi.fn(),
  exportCohort: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as researchApi from '@/services/api/research';
import { getSystemHealth } from '@/services/api/pharmacy';
import { useResearchStore } from '@/store/researchStore';
import type { CohortStats, ResearchCohort } from '@/types/research';

const m = researchApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

const cohort = (over: Partial<ResearchCohort> = {}): ResearchCohort => ({
  id: 'c1',
  name: '2型糖尿病队列',
  disease: '2型糖尿病',
  diseaseCode: 'E11',
  criteria: { include: { minAge: 40 }, exclude: {} },
  status: 'draft',
  createdBy: 'u1',
  lastRunAt: null,
  lastRunAdded: 0,
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
  ...over,
});

const stats = (): CohortStats => ({
  total: 1,
  byGender: { 男: 1 },
  ageBuckets: { '<40': 0, '40-59': 1, '60-74': 0, '≥75': 0, 未知: 0 },
  topTags: [{ tag: '糖尿病', count: 1 }],
});

const initial = useResearchStore.getState();

beforeEach(() => {
  useResearchStore.setState({
    ...initial,
    cohorts: [],
    current: null,
    currentId: null,
    members: [],
    stats: null,
  });
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.3.0',
    demoMode: false,
    db: 'up',
  });
});

describe('researchStore 健康门禁', () => {
  it('探活成功：dbUp=true', async () => {
    const up = await useResearchStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useResearchStore.getState().dbUp).toBe(true);
  });

  it('探活抛错：dbUp=false 且留 error', async () => {
    healthMock.mockRejectedValueOnce(new Error('network down'));
    const up = await useResearchStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useResearchStore.getState().error).toContain('network down');
  });
});

describe('researchStore 读模型', () => {
  it('loadCohorts 成功/失败', async () => {
    m.fetchCohorts.mockResolvedValueOnce([cohort()]);
    await useResearchStore.getState().loadCohorts();
    expect(useResearchStore.getState().cohorts).toHaveLength(1);

    m.fetchCohorts.mockRejectedValueOnce(new Error('bad'));
    await useResearchStore.getState().loadCohorts();
    expect(useResearchStore.getState().error).toBe('bad');
  });

  it('openCohort 成功：加载详情/成员/统计', async () => {
    m.fetchCohort.mockResolvedValueOnce(cohort());
    m.fetchCohortMembers.mockResolvedValueOnce([]);
    m.fetchCohortStats.mockResolvedValueOnce(stats());
    const ok = await useResearchStore.getState().openCohort('c1');
    expect(ok).toBe(true);
    expect(useResearchStore.getState().current?.id).toBe('c1');
    expect(useResearchStore.getState().stats?.total).toBe(1);
  });

  it('openCohort 失败：留 error', async () => {
    m.fetchCohort.mockRejectedValueOnce(new Error('no'));
    const ok = await useResearchStore.getState().openCohort('c2');
    expect(ok).toBe(false);
    expect(useResearchStore.getState().error).toBe('no');
  });
});

describe('researchStore 写门禁', () => {
  it('createCohort：dbUp=false 拒绝；成功后刷新', async () => {
    useResearchStore.setState({ dbUp: false });
    expect(
      await useResearchStore.getState().createCohort({
        name: 'x',
        disease: 'x',
        criteria: { include: {}, exclude: {} },
      }),
    ).toBe(false);
    expect(m.createCohortApi).not.toHaveBeenCalled();

    useResearchStore.setState({ dbUp: true });
    m.createCohortApi.mockResolvedValueOnce(cohort({ id: 'c9' }));
    m.fetchCohorts.mockResolvedValueOnce([]);
    m.fetchCohort.mockResolvedValueOnce(cohort({ id: 'c9' }));
    m.fetchCohortMembers.mockResolvedValueOnce([]);
    m.fetchCohortStats.mockResolvedValueOnce(stats());
    const ok = await useResearchStore.getState().createCohort({
      name: '队列',
      disease: '2型糖尿病',
      criteria: { include: {}, exclude: {} },
    });
    expect(ok).toBe(true);
  });

  it('createCohort：失败留 error', async () => {
    useResearchStore.setState({ dbUp: true });
    m.createCohortApi.mockRejectedValueOnce(new Error('400 字段缺失'));
    expect(
      await useResearchStore.getState().createCohort({
        name: 'x',
        disease: 'x',
        criteria: { include: {}, exclude: {} },
      }),
    ).toBe(false);
    expect(useResearchStore.getState().error).toBe('400 字段缺失');
  });

  it('publishCohort：dbUp=false 拒绝；成功刷新', async () => {
    useResearchStore.setState({ dbUp: false });
    expect(await useResearchStore.getState().publishCohort('c1')).toBe(false);

    useResearchStore.setState({ dbUp: true });
    m.publishCohort.mockResolvedValueOnce(cohort({ status: 'active' }));
    m.fetchCohorts.mockResolvedValueOnce([]);
    m.fetchCohort.mockResolvedValueOnce(cohort({ status: 'active' }));
    m.fetchCohortMembers.mockResolvedValueOnce([]);
    m.fetchCohortStats.mockResolvedValueOnce(stats());
    expect(await useResearchStore.getState().publishCohort('c1')).toBe(true);
  });

  it('archiveCohort：dbUp=false 拒绝；成功刷新', async () => {
    useResearchStore.setState({ dbUp: false });
    expect(await useResearchStore.getState().archiveCohort('c1')).toBe(false);

    useResearchStore.setState({ dbUp: true });
    m.archiveCohort.mockResolvedValueOnce(cohort({ status: 'archived' }));
    m.fetchCohorts.mockResolvedValueOnce([]);
    expect(await useResearchStore.getState().archiveCohort('c1')).toBe(true);
  });

  it('runMatching：dbUp=false 拒绝；成功更新结果', async () => {
    useResearchStore.setState({ dbUp: false });
    expect(await useResearchStore.getState().runMatching('c1')).toBe(false);

    useResearchStore.setState({ dbUp: true });
    m.runCohort.mockResolvedValueOnce({
      cohortId: 'c1',
      scanned: 100,
      added: 5,
      totalMembers: 5,
    });
    m.fetchCohort.mockResolvedValueOnce(cohort({ status: 'active' }));
    m.fetchCohortMembers.mockResolvedValueOnce([]);
    m.fetchCohortStats.mockResolvedValueOnce(stats());
    expect(await useResearchStore.getState().runMatching('c1')).toBe(true);
    expect(useResearchStore.getState().runResult?.added).toBe(5);
  });

  it('runMatching：失败留 error', async () => {
    useResearchStore.setState({ dbUp: true });
    m.runCohort.mockRejectedValueOnce(new Error('409 未发布'));
    expect(await useResearchStore.getState().runMatching('c1')).toBe(false);
    expect(useResearchStore.getState().error).toBe('409 未发布');
  });

  it('doExport：dbUp=false 拒绝；成功存导出', async () => {
    useResearchStore.setState({ dbUp: false });
    expect(await useResearchStore.getState().doExport('c1')).toBe(false);

    useResearchStore.setState({ dbUp: true });
    m.exportCohort.mockResolvedValueOnce([{ age: 55, gender: '男' }]);
    expect(await useResearchStore.getState().doExport('c1')).toBe(true);
    expect(useResearchStore.getState().exportRows).toHaveLength(1);
  });

  it('clearError：清除错误', () => {
    useResearchStore.setState({ error: 'x' });
    useResearchStore.getState().clearError();
    expect(useResearchStore.getState().error).toBeNull();
  });
});
