/**
 * 健澜科技 jlmedaios - 病历质控 medicalQcStore 单元测试（M2-B）
 *
 * mock services/api/medicalQc 与 pharmacy 健康探针，验证：
 *  - 健康门禁（up/down/抛错）；
 *  - 队列、详情、检查结果加载（成功/失败）；
 *  - 质控结论/重提写门禁（dbUp=false 拒绝、成功刷新读模型、失败留 error）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/medicalQc', () => ({
  fetchQcQueue: vi.fn(),
  fetchQcRecord: vi.fn(),
  checkQc: vi.fn(),
  submitQc: vi.fn(),
  resubmitQc: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as qcApi from '@/services/api/medicalQc';
import { getSystemHealth } from '@/services/api/pharmacy';
import { useMedicalQcStore } from '@/store/medicalQcStore';
import type {
  QcCheckResult,
  QcQueueItem,
  QcRecordDetail,
} from '@/types/medicalQc';

const m = qcApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

const queueItem = (over: Partial<QcQueueItem> = {}): QcQueueItem => ({
  recordId: 'rec1',
  recordType: 'outpatient',
  title: '门诊病历',
  status: 'submitted',
  nextLevel: 1,
  department: '心血管内科',
  visitNo: 'V001',
  mrn: 'M2B001',
  patientName: '控*甲',
  updatedAt: '2026-09-27T08:00:00Z',
  ...over,
});

const detail = (over: Partial<QcRecordDetail> = {}): QcRecordDetail => ({
  record: {
    id: 'rec1', visitId: 'v1', recordType: 'outpatient', title: '门诊病历',
    content: { chiefComplaint: '胸闷' }, plainText: '胸闷', authorId: 'doc1',
    aiGenerated: false, aiModel: null, status: 'submitted', qualityScore: null,
    qualityIssues: [], signedAt: null, signedBy: null, version: 1,
    createdAt: '2026-09-27T08:00:00Z', updatedAt: '2026-09-27T08:00:00Z',
  },
  visit: {
    id: 'v1', visitNo: 'V001', department: '心血管内科',
    admitAt: null, dischargeAt: null,
  },
  patient: { mrn: 'M2B001', nameMasked: '控*甲' },
  reviews: [],
  nextLevel: 1,
  latestRule: {
    issues: [], score: 100, canPass: true,
    blockCount: 0, majorCount: 0, minorCount: 0,
  },
  ...over,
});

const checkResult = (over: Partial<QcCheckResult> = {}): QcCheckResult => ({
  rule: {
    issues: [], score: 100, canPass: true,
    blockCount: 0, majorCount: 0, minorCount: 0,
  },
  ai: { issues: [], model: 'deepseek-chat', error: null },
  issues: [],
  score: 100,
  canPass: true,
  ...over,
});

const initial = useMedicalQcStore.getState();

beforeEach(() => {
  useMedicalQcStore.setState({ ...initial, queue: [], detail: null, checkResult: null });
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok', version: '0.3.0', demoMode: false, db: 'up',
  });
});

describe('medicalQcStore 健康门禁', () => {
  it('探活成功：dbUp=true', async () => {
    const up = await useMedicalQcStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useMedicalQcStore.getState().dbUp).toBe(true);
  });

  it('探活抛错：dbUp=false 且留 error', async () => {
    healthMock.mockRejectedValueOnce(new Error('network down'));
    const up = await useMedicalQcStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useMedicalQcStore.getState().error).toContain('network down');
  });
});

describe('medicalQcStore 读模型', () => {
  it('loadQueue 成功/失败', async () => {
    m.fetchQcQueue.mockResolvedValueOnce({ items: [queueItem()], total: 1 });
    await useMedicalQcStore.getState().loadQueue();
    expect(useMedicalQcStore.getState().queue).toHaveLength(1);

    m.fetchQcQueue.mockRejectedValueOnce(new Error('bad'));
    await useMedicalQcStore.getState().loadQueue();
    expect(useMedicalQcStore.getState().error).toBe('bad');
  });

  it('openRecord 成功/失败', async () => {
    m.fetchQcRecord.mockResolvedValueOnce(detail());
    const ok = await useMedicalQcStore.getState().openRecord('rec1');
    expect(ok).toBe(true);
    expect(useMedicalQcStore.getState().detail?.record.id).toBe('rec1');

    m.fetchQcRecord.mockRejectedValueOnce(new Error('no'));
    const fail = await useMedicalQcStore.getState().openRecord('rec2');
    expect(fail).toBe(false);
    expect(useMedicalQcStore.getState().error).toBe('no');
  });

  it('runCheck 成功/失败；无 currentId 直接 false', async () => {
    expect(await useMedicalQcStore.getState().runCheck(false)).toBe(false);

    useMedicalQcStore.setState({ currentId: 'rec1' });
    m.checkQc.mockResolvedValueOnce(checkResult());
    expect(await useMedicalQcStore.getState().runCheck(false)).toBe(true);
    expect(useMedicalQcStore.getState().checkResult?.score).toBe(100);

    m.checkQc.mockRejectedValueOnce(new Error('x'));
    expect(await useMedicalQcStore.getState().runCheck(true)).toBe(false);
    expect(useMedicalQcStore.getState().error).toBe('x');
  });
});

describe('medicalQcStore 写门禁', () => {
  it('review：dbUp=false 拒绝；成功后刷新队列与详情', async () => {
    useMedicalQcStore.setState({ dbUp: false });
    expect(
      await useMedicalQcStore.getState().review({ decision: 'pass', level: 1 }),
    ).toBe(false);
    expect(m.submitQc).not.toHaveBeenCalled();

    useMedicalQcStore.setState({ dbUp: true, currentId: 'rec1' });
    m.submitQc.mockResolvedValueOnce({});
    m.fetchQcQueue.mockResolvedValueOnce({ items: [], total: 0 });
    m.fetchQcRecord.mockResolvedValueOnce(detail({
      record: { ...detail().record, status: 'reviewed' },
      nextLevel: 2,
    }));
    const ok = await useMedicalQcStore.getState().review({ decision: 'pass', level: 1 });
    expect(ok).toBe(true);
    expect(m.submitQc).toHaveBeenCalledTimes(1);
  });

  it('review 失败留 error', async () => {
    useMedicalQcStore.setState({ dbUp: true, currentId: 'rec1' });
    m.submitQc.mockRejectedValueOnce(new Error('409 conflict'));
    expect(
      await useMedicalQcStore.getState().review({ decision: 'pass', level: 1 }),
    ).toBe(false);
    expect(useMedicalQcStore.getState().error).toBe('409 conflict');
  });

  it('resubmit：dbUp=false 拒绝；成功路径刷新', async () => {
    expect(await useMedicalQcStore.getState().resubmit()).toBe(false);

    useMedicalQcStore.setState({ dbUp: true, currentId: 'rec1' });
    m.resubmitQc.mockResolvedValueOnce({});
    m.fetchQcQueue.mockResolvedValueOnce({ items: [], total: 0 });
    m.fetchQcRecord.mockResolvedValueOnce(detail());
    expect(await useMedicalQcStore.getState().resubmit()).toBe(true);
    expect(m.resubmitQc).toHaveBeenCalledTimes(1);
  });

  it('clearError 清除错误', () => {
    useMedicalQcStore.setState({ error: 'x' });
    useMedicalQcStore.getState().clearError();
    expect(useMedicalQcStore.getState().error).toBeNull();
  });
});