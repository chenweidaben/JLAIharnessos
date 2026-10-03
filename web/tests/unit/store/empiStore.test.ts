/* ============================================================================
 * 健澜科技杠OS - EMPI empiStore 单元测试（M5-C）
 *
 * mock services/api/empi 与 pharmacy 健康探针，验证：
 *  - 健康门禁（up/down/抛错）；
 *  - 候选/链接加载（成功/失败）；
 *  - 扫描/确认/拒绝/登记 写门禁
 *    （dbUp=false 拒绝、成功刷新、失败留 error）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/empi', () => ({
  fetchCandidates: vi.fn(),
  fetchEmpiLinks: vi.fn(),
  runEmpiScanApi: vi.fn(),
  registerIdentifierApi: vi.fn(),
  fetchPatientIdentifiers: vi.fn(),
  confirmCandidateApi: vi.fn(),
  rejectCandidateApi: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as empiApi from '@/services/api/empi';
import { getSystemHealth } from '@/services/api/pharmacy';
import { useEmpiStore } from '@/store/empiStore';
import type { EmpiLink, MatchCandidate } from '@/types/empi';

const m = empiApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

const candidate = (over: Partial<MatchCandidate> = {}): MatchCandidate => ({
  id: 'c1',
  patientAId: 'a',
  patientBId: 'b',
  matchScore: 80,
  matchReasons: ['姓名、性别、出生日期一致'],
  status: 'pending',
  reviewedBy: null,
  reviewedAt: null,
  createdAt: '2026-10-01T08:00:00Z',
  ...over,
});

const link = (over: Partial<EmpiLink> = {}): EmpiLink => ({
  id: 'l1',
  masterPatientId: 'a',
  linkedPatientId: 'b',
  candidateId: 'c1',
  createdBy: 'u1',
  createdAt: '2026-10-01T08:00:00Z',
  ...over,
});

const initial = useEmpiStore.getState();

beforeEach(() => {
  useEmpiStore.setState({
    ...initial,
    candidates: [],
    links: [],
    scanSummary: null,
  });
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.5.0',
    demoMode: false,
    db: 'up',
  });
});

describe('empiStore 健康门禁', () => {
  it('探活成功：dbUp=true', async () => {
    expect(await useEmpiStore.getState().checkHealth()).toBe(true);
    expect(useEmpiStore.getState().dbUp).toBe(true);
  });

  it('探活抛错：dbUp=false 且留 error', async () => {
    healthMock.mockRejectedValueOnce(new Error('network down'));
    expect(await useEmpiStore.getState().checkHealth()).toBe(false);
    expect(useEmpiStore.getState().error).toContain('network down');
  });
});

describe('empiStore 读模型', () => {
  it('loadAll 成功：候选与链接', async () => {
    m.fetchCandidates.mockResolvedValueOnce([candidate()]);
    m.fetchEmpiLinks.mockResolvedValueOnce([link()]);
    await useEmpiStore.getState().loadAll();
    expect(useEmpiStore.getState().candidates).toHaveLength(1);
    expect(useEmpiStore.getState().links).toHaveLength(1);
  });

  it('loadAll 失败留 error', async () => {
    m.fetchCandidates.mockRejectedValueOnce(new Error('bad'));
    await useEmpiStore.getState().loadAll();
    expect(useEmpiStore.getState().error).toBe('bad');
  });
});

describe('empiStore 写门禁', () => {
  it('runScan：dbUp=false 拒绝；成功后刷新并存结果', async () => {
    useEmpiStore.setState({ dbUp: false });
    expect(await useEmpiStore.getState().runScan()).toBe(false);
    expect(m.runEmpiScanApi).not.toHaveBeenCalled();

    useEmpiStore.setState({ dbUp: true });
    m.runEmpiScanApi.mockResolvedValueOnce({
      scanned: 100, newCandidates: 3, pending: 3,
    });
    m.fetchCandidates.mockResolvedValueOnce([]);
    m.fetchEmpiLinks.mockResolvedValueOnce([]);
    expect(await useEmpiStore.getState().runScan()).toBe(true);
    expect(useEmpiStore.getState().scanSummary?.newCandidates).toBe(3);
  });

  it('runScan 失败留 error', async () => {
    useEmpiStore.setState({ dbUp: true });
    m.runEmpiScanApi.mockRejectedValueOnce(new Error('500'));
    expect(await useEmpiStore.getState().runScan()).toBe(false);
    expect(useEmpiStore.getState().error).toBe('500');
  });

  it('confirm：dbUp=false 拒绝；成功后刷新', async () => {
    useEmpiStore.setState({ dbUp: false });
    expect(await useEmpiStore.getState().confirm('c1')).toBe(false);

    useEmpiStore.setState({ dbUp: true });
    m.confirmCandidateApi.mockResolvedValueOnce(link());
    m.fetchCandidates.mockResolvedValueOnce([]);
    m.fetchEmpiLinks.mockResolvedValueOnce([]);
    expect(await useEmpiStore.getState().confirm('c1')).toBe(true);
  });

  it('confirm 失败留 error', async () => {
    useEmpiStore.setState({ dbUp: true });
    m.confirmCandidateApi.mockRejectedValueOnce(new Error('409'));
    expect(await useEmpiStore.getState().confirm('c1')).toBe(false);
    expect(useEmpiStore.getState().error).toBe('409');
  });

  it('reject：dbUp=false 拒绝；成功后刷新', async () => {
    useEmpiStore.setState({ dbUp: false });
    expect(await useEmpiStore.getState().reject('c1')).toBe(false);

    useEmpiStore.setState({ dbUp: true });
    m.rejectCandidateApi.mockResolvedValueOnce(candidate({ status: 'rejected' }));
    m.fetchCandidates.mockResolvedValueOnce([]);
    m.fetchEmpiLinks.mockResolvedValueOnce([]);
    expect(await useEmpiStore.getState().reject('c1')).toBe(true);
  });

  it('registerIdentifier：dbUp=false 拒绝；成功返回 true', async () => {
    useEmpiStore.setState({ dbUp: false });
    expect(
      await useEmpiStore.getState().registerIdentifier({
        patientId: 'a', domain: 'phone', rawValue: '13900000000',
      }),
    ).toBe(false);

    useEmpiStore.setState({ dbUp: true });
    m.registerIdentifierApi.mockResolvedValueOnce({ id: 'x' });
    expect(
      await useEmpiStore.getState().registerIdentifier({
        patientId: 'a', domain: 'phone', rawValue: '13900000000',
      }),
    ).toBe(true);
  });

  it('clearError：清除错误', () => {
    useEmpiStore.setState({ error: 'x' });
    useEmpiStore.getState().clearError();
    expect(useEmpiStore.getState().error).toBeNull();
  });
});
