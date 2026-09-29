/**
 * 健澜科技 jlmedaios - 病案首页 frontPageStore 单元测试（M3-A）
 *
 * mock services/api/frontPage 与 pharmacy 健康探针，验证：
 *  - 健康门禁（up/down/抛错）；
 *  - 队列、详情加载（成功/失败）；
 *  - 编码/质控/归档写门禁（dbUp=false 拒绝、成功刷新读模型、失败留 error）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/frontPage', () => ({
  fetchFrontPageQueue: vi.fn(),
  fetchFrontPage: vi.fn(),
  saveCoding: vi.fn(),
  submitReview: vi.fn(),
  archiveFrontPage: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as fpApi from '@/services/api/frontPage';
import { getSystemHealth } from '@/services/api/pharmacy';
import { useFrontPageStore } from '@/store/frontPageStore';
import type { FrontPageDetail, FrontPageQueueItem } from '@/types/frontPage';

const m = fpApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

const queueItem = (over: Partial<FrontPageQueueItem> = {}): FrontPageQueueItem => ({
  pageId: 'fp1',
  visitId: 'v1',
  visitNo: 'IP001',
  patientId: 'p1',
  mrn: 'M001',
  patientName: '病*甲',
  department: '心血管内科',
  status: 'coding',
  version: 2,
  primaryDiagnosis: '肺恶性肿瘤',
  updatedAt: '2026-09-29T08:00:00Z',
  ...over,
});

const detail = (over: Partial<FrontPageDetail> = {}): FrontPageDetail => ({
  page: {
    id: 'fp1', visitId: 'v1', patientId: 'p1', department: '心血管内科',
    status: 'coding', version: 2,
    admitAt: '2026-09-20T08:00:00Z', dischargeAt: '2026-09-27T08:00:00Z',
    ward: null, bedNo: null, primaryDiagnosis: '肺恶性肿瘤', primaryDiagnosisCode: null,
    secondaryDiagnoses: [], operations: [], totalFee: '12000.00',
    codedBy: 'u-admin', codedAt: '2026-09-28T08:00:00Z',
    defects: [], qualityScore: null, archivedBy: null, archivedAt: null,
    createdAt: '2026-09-27T08:00:00Z', updatedAt: '2026-09-28T08:00:00Z',
  },
  visit: { id: 'v1', visitNo: 'IP001', department: '心血管内科', admitAt: null, dischargeAt: null },
  patient: { mrn: 'M001', nameMasked: '病*甲' },
  reviews: [],
  ...over,
});

const initial = useFrontPageStore.getState();

beforeEach(() => {
  useFrontPageStore.setState({ ...initial, queue: [], detail: null });
  vi.clearAllMocks();
  healthMock.mockResolvedValue({ status: 'ok', version: '0.3.0', demoMode: false, db: 'up' });
});

describe('frontPageStore 健康门禁', () => {
  it('探活成功：dbUp=true', async () => {
    const up = await useFrontPageStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useFrontPageStore.getState().dbUp).toBe(true);
  });

  it('探活抛错：dbUp=false 且留 error', async () => {
    healthMock.mockRejectedValueOnce(new Error('network down'));
    const up = await useFrontPageStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useFrontPageStore.getState().error).toContain('network down');
  });
});

describe('frontPageStore 读模型', () => {
  it('loadQueue 成功/失败', async () => {
    m.fetchFrontPageQueue.mockResolvedValueOnce({ items: [queueItem()], total: 1 });
    await useFrontPageStore.getState().loadQueue();
    expect(useFrontPageStore.getState().queue).toHaveLength(1);

    m.fetchFrontPageQueue.mockRejectedValueOnce(new Error('bad'));
    await useFrontPageStore.getState().loadQueue();
    expect(useFrontPageStore.getState().error).toBe('bad');
  });

  it('openPage 成功/失败', async () => {
    m.fetchFrontPage.mockResolvedValueOnce(detail());
    const ok = await useFrontPageStore.getState().openPage('fp1');
    expect(ok).toBe(true);
    expect(useFrontPageStore.getState().detail?.page.id).toBe('fp1');

    m.fetchFrontPage.mockRejectedValueOnce(new Error('no'));
    const fail = await useFrontPageStore.getState().openPage('fp2');
    expect(fail).toBe(false);
    expect(useFrontPageStore.getState().error).toBe('no');
  });
});

describe('frontPageStore 写门禁', () => {
  it('saveCoding：dbUp=false 拒绝；成功后刷新', async () => {
    useFrontPageStore.setState({ dbUp: false });
    expect(
      await useFrontPageStore.getState().saveCoding({ version: 2 }),
    ).toBe(false);
    expect(m.saveCoding).not.toHaveBeenCalled();

    useFrontPageStore.setState({ dbUp: true, currentId: 'fp1', detail: detail() });
    m.saveCoding.mockResolvedValueOnce({});
    m.fetchFrontPageQueue.mockResolvedValueOnce({ items: [], total: 0 });
    m.fetchFrontPage.mockResolvedValueOnce(detail());
    const ok = await useFrontPageStore.getState().saveCoding({ version: 2, primaryDiagnosisCode: 'C34.900' });
    expect(ok).toBe(true);
    expect(m.saveCoding).toHaveBeenCalledTimes(1);
  });

  it('review：dbUp=false 拒绝；失败留 error', async () => {
    useFrontPageStore.setState({ dbUp: false });
    expect(
      await useFrontPageStore.getState().review({ version: 2, decision: 'pass' }),
    ).toBe(false);

    useFrontPageStore.setState({ dbUp: true, currentId: 'fp1', detail: detail() });
    m.submitReview.mockRejectedValueOnce(new Error('403 职责分离'));
    expect(
      await useFrontPageStore.getState().review({ version: 2, decision: 'pass' }),
    ).toBe(false);
    expect(useFrontPageStore.getState().error).toBe('403 职责分离');
  });

  it('archive：dbUp=false 拒绝；成功路径', async () => {
    expect(await useFrontPageStore.getState().archive()).toBe(false);

    useFrontPageStore.setState({
      dbUp: true, currentId: 'fp1',
      detail: detail({ page: { ...detail().page, status: 'qc' } }),
    });
    m.archiveFrontPage.mockResolvedValueOnce({});
    m.fetchFrontPageQueue.mockResolvedValueOnce({ items: [], total: 0 });
    m.fetchFrontPage.mockResolvedValueOnce(detail());
    expect(await useFrontPageStore.getState().archive()).toBe(true);
    expect(m.archiveFrontPage).toHaveBeenCalledTimes(1);
  });

  it('clearError 清除错误', () => {
    useFrontPageStore.setState({ error: 'x' });
    useFrontPageStore.getState().clearError();
    expect(useFrontPageStore.getState().error).toBeNull();
  });
});
