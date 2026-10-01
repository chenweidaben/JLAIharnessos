/**
 * 健澜科技 jlmedaios - 双向转诊 referralStore 单元测试（M3-R）
 *
 * mock services/api/referral 与 pharmacy 健康探针，验证：
 *  - 健康门禁（up/down/抛错）；
 *  - 队列、方向过滤、详情加载（成功/失败）；
 *  - 发起/补资料/接收/拒绝/完成/取消 写门禁
 *    （dbUp=false 拒绝、currentId 空、成功刷新、失败留 error）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/api/referral', () => ({
  createReferralApi: vi.fn(),
  listReferralsApi: vi.fn(),
  getReferralApi: vi.fn(),
  addDocumentApi: vi.fn(),
  acceptReferralApi: vi.fn(),
  rejectReferralApi: vi.fn(),
  completeReferralApi: vi.fn(),
  cancelReferralApi: vi.fn(),
}));
vi.mock('@/services/api/pharmacy', () => ({ getSystemHealth: vi.fn() }));

import * as refApi from '@/services/api/referral';
import { getSystemHealth } from '@/services/api/pharmacy';
import { useReferralStore } from '@/store/referralStore';
import type { ReferralDetail, ReferralOrder } from '@/types/referral';

const m = refApi as unknown as Record<string, ReturnType<typeof vi.fn>>;
const healthMock = vi.mocked(getSystemHealth);

const order = (over: Partial<ReferralOrder> = {}): ReferralOrder => ({
  id: 'r1',
  referralNo: 'REF20261001001',
  direction: 'incoming',
  patientId: null,
  profileId: null,
  patientName: '张*三',
  gender: '男',
  birthDate: null,
  sourceOrg: '县人民医院',
  sourceDept: '内科',
  sourceDoctor: '李医生',
  targetOrg: '本院',
  targetDept: '心血管内科',
  reason: '胸痛待查',
  urgency: 'normal',
  status: 'submitted',
  encounterId: null,
  acceptedBy: null,
  acceptedAt: null,
  rejectedReason: null,
  createdBy: 'u1',
  createdAt: '2026-10-01T08:00:00Z',
  updatedAt: '2026-10-01T08:00:00Z',
  ...over,
});

const detail = (over: Partial<ReferralDetail> = {}): ReferralDetail => ({
  referral: order(),
  documents: [
    {
      id: 'd1',
      referralId: 'r1',
      docType: 'lab',
      title: '血常规',
      contentRef: null,
      contentText: '白细胞 11.2',
      sourceOrg: '县人民医院',
      receivedAt: '2026-10-01T08:00:00Z',
      createdAt: '2026-10-01T08:00:00Z',
    },
  ],
  ...over,
});

const initial = useReferralStore.getState();

beforeEach(() => {
  useReferralStore.setState({ ...initial, queue: [], detail: null, currentId: null });
  vi.clearAllMocks();
  healthMock.mockResolvedValue({
    status: 'ok',
    version: '0.3.0',
    demoMode: false,
    db: 'up',
  });
});

describe('referralStore 健康门禁', () => {
  it('探活成功：dbUp=true', async () => {
    const up = await useReferralStore.getState().checkHealth();
    expect(up).toBe(true);
    expect(useReferralStore.getState().dbUp).toBe(true);
  });

  it('探活抛错：dbUp=false 且留 error', async () => {
    healthMock.mockRejectedValueOnce(new Error('network down'));
    const up = await useReferralStore.getState().checkHealth();
    expect(up).toBe(false);
    expect(useReferralStore.getState().error).toContain('network down');
  });
});

describe('referralStore 读模型', () => {
  it('loadQueue 成功/失败', async () => {
    m.listReferralsApi.mockResolvedValueOnce([order()]);
    await useReferralStore.getState().loadQueue();
    expect(useReferralStore.getState().queue).toHaveLength(1);

    m.listReferralsApi.mockRejectedValueOnce(new Error('bad'));
    await useReferralStore.getState().loadQueue();
    expect(useReferralStore.getState().error).toBe('bad');
  });

  it('setDirectionFilter 触发带方向加载', async () => {
    m.listReferralsApi.mockResolvedValueOnce([]);
    await useReferralStore.getState().setDirectionFilter('incoming');
    expect(useReferralStore.getState().directionFilter).toBe('incoming');
    expect(m.listReferralsApi).toHaveBeenCalledWith({ direction: 'incoming' });
  });

  it('openDetail 成功/失败', async () => {
    m.getReferralApi.mockResolvedValueOnce(detail());
    const ok = await useReferralStore.getState().openDetail('r1');
    expect(ok).toBe(true);
    expect(useReferralStore.getState().detail?.referral.id).toBe('r1');

    m.getReferralApi.mockRejectedValueOnce(new Error('no'));
    const fail = await useReferralStore.getState().openDetail('r2');
    expect(fail).toBe(false);
    expect(useReferralStore.getState().error).toBe('no');
  });
});

describe('referralStore 写门禁', () => {
  it('createReferral：dbUp=false 拒绝；成功后刷新', async () => {
    useReferralStore.setState({ dbUp: false });
    expect(
      await useReferralStore.getState().createReferral({
        direction: 'incoming',
        patientName: '某人',
        sourceOrg: 'a',
        targetOrg: 'b',
        reason: 'x',
      }),
    ).toBe(false);
    expect(m.createReferralApi).not.toHaveBeenCalled();

    useReferralStore.setState({ dbUp: true });
    m.createReferralApi.mockResolvedValueOnce(order({ id: 'r9' }));
    m.listReferralsApi.mockResolvedValueOnce([]);
    const ok = await useReferralStore.getState().createReferral({
      direction: 'incoming',
      patientName: '某人',
      sourceOrg: 'a',
      targetOrg: 'b',
      reason: 'x',
    });
    expect(ok).toBe(true);
    expect(m.createReferralApi).toHaveBeenCalledTimes(1);
  });

  it('createReferral：失败留 error', async () => {
    useReferralStore.setState({ dbUp: true });
    m.createReferralApi.mockRejectedValueOnce(new Error('400 字段缺失'));
    expect(
      await useReferralStore.getState().createReferral({
        direction: 'incoming',
        patientName: 'x',
        sourceOrg: 'a',
        targetOrg: 'b',
        reason: 'x',
      }),
    ).toBe(false);
    expect(useReferralStore.getState().error).toBe('400 字段缺失');
  });

  it('addDocument：dbUp=false / currentId 空 / 成功', async () => {
    useReferralStore.setState({ dbUp: false });
    expect(
      await useReferralStore.getState().addDocument({
        docType: 'lab',
        title: '血常规',
        contentText: '正常',
      }),
    ).toBe(false);

    useReferralStore.setState({ dbUp: true, currentId: null });
    expect(
      await useReferralStore.getState().addDocument({
        docType: 'lab',
        title: '血常规',
        contentText: '正常',
      }),
    ).toBe(false);

    useReferralStore.setState({ dbUp: true, currentId: 'r1' });
    m.addDocumentApi.mockResolvedValueOnce(detail());
    const ok = await useReferralStore.getState().addDocument({
      docType: 'lab',
      title: '血常规',
      contentText: '正常',
    });
    expect(ok).toBe(true);
    expect(m.addDocumentApi).toHaveBeenCalledTimes(1);
  });

  it('addDocument：失败留 error', async () => {
    useReferralStore.setState({ dbUp: true, currentId: 'r1' });
    m.addDocumentApi.mockRejectedValueOnce(new Error('409 已结束'));
    expect(
      await useReferralStore.getState().addDocument({
        docType: 'lab',
        title: 'x',
        contentText: 'y',
      }),
    ).toBe(false);
    expect(useReferralStore.getState().error).toBe('409 已结束');
  });

  it('accept：dbUp=false / currentId 空 / 成功', async () => {
    useReferralStore.setState({ dbUp: false });
    expect(
      await useReferralStore.getState().accept({
        department: '心血管内科',
      }),
    ).toBe(false);

    useReferralStore.setState({ dbUp: true, currentId: null });
    expect(
      await useReferralStore.getState().accept({
        department: '心血管内科',
      }),
    ).toBe(false);

    useReferralStore.setState({ dbUp: true, currentId: 'r1' });
    m.acceptReferralApi.mockResolvedValueOnce(
      detail({
        referral: order({ status: 'accepted', encounterId: 'v1', patientId: 'pat1' }),
      }),
    );
    m.listReferralsApi.mockResolvedValueOnce([]);
    const ok = await useReferralStore.getState().accept({
      department: '心血管内科',
    });
    expect(ok).toBe(true);
    expect(m.acceptReferralApi).toHaveBeenCalledTimes(1);
  });

  it('accept：失败留 error', async () => {
    useReferralStore.setState({ dbUp: true, currentId: 'r1' });
    m.acceptReferralApi.mockRejectedValueOnce(new Error('409 重复接收'));
    expect(
      await useReferralStore.getState().accept({ department: 'x' }),
    ).toBe(false);
    expect(useReferralStore.getState().error).toBe('409 重复接收');
  });

  it('reject：dbUp=false / currentId 空 / 成功', async () => {
    useReferralStore.setState({ dbUp: false });
    expect(await useReferralStore.getState().reject('资料不全')).toBe(false);

    useReferralStore.setState({ dbUp: true, currentId: null });
    expect(await useReferralStore.getState().reject('资料不全')).toBe(false);

    useReferralStore.setState({ dbUp: true, currentId: 'r1' });
    m.rejectReferralApi.mockResolvedValueOnce(
      order({ status: 'rejected', rejectedReason: '资料不全' }),
    );
    m.listReferralsApi.mockResolvedValueOnce([]);
    m.getReferralApi.mockResolvedValueOnce(
      detail({
        referral: order({ status: 'rejected', rejectedReason: '资料不全' }),
      }),
    );
    const ok = await useReferralStore.getState().reject('资料不全');
    expect(ok).toBe(true);
    expect(m.rejectReferralApi).toHaveBeenCalledTimes(1);
  });

  it('reject：失败留 error', async () => {
    useReferralStore.setState({ dbUp: true, currentId: 'r1' });
    m.rejectReferralApi.mockRejectedValueOnce(new Error('400 原因为空'));
    expect(await useReferralStore.getState().reject('')).toBe(false);
    expect(useReferralStore.getState().error).toBe('400 原因为空');
  });

  it('complete：dbUp=false / currentId 空 / 成功', async () => {
    useReferralStore.setState({ dbUp: false });
    expect(await useReferralStore.getState().complete()).toBe(false);

    useReferralStore.setState({ dbUp: true, currentId: null });
    expect(await useReferralStore.getState().complete()).toBe(false);

    useReferralStore.setState({ dbUp: true, currentId: 'r1' });
    m.completeReferralApi.mockResolvedValueOnce(order({ status: 'completed' }));
    m.listReferralsApi.mockResolvedValueOnce([]);
    m.getReferralApi.mockResolvedValueOnce(
      detail({ referral: order({ status: 'completed' }) }),
    );
    const ok = await useReferralStore.getState().complete();
    expect(ok).toBe(true);
    expect(m.completeReferralApi).toHaveBeenCalledTimes(1);
  });

  it('complete：失败留 error', async () => {
    useReferralStore.setState({ dbUp: true, currentId: 'r1' });
    m.completeReferralApi.mockRejectedValueOnce(new Error('409 未接收'));
    expect(await useReferralStore.getState().complete()).toBe(false);
    expect(useReferralStore.getState().error).toBe('409 未接收');
  });

  it('cancel：dbUp=false / currentId 空 / 成功', async () => {
    useReferralStore.setState({ dbUp: false });
    expect(await useReferralStore.getState().cancel()).toBe(false);

    useReferralStore.setState({ dbUp: true, currentId: null });
    expect(await useReferralStore.getState().cancel()).toBe(false);

    useReferralStore.setState({ dbUp: true, currentId: 'r1' });
    m.cancelReferralApi.mockResolvedValueOnce(order({ status: 'cancelled' }));
    m.listReferralsApi.mockResolvedValueOnce([]);
    m.getReferralApi.mockResolvedValueOnce(
      detail({ referral: order({ status: 'cancelled' }) }),
    );
    const ok = await useReferralStore.getState().cancel();
    expect(ok).toBe(true);
    expect(m.cancelReferralApi).toHaveBeenCalledTimes(1);
  });

  it('cancel：失败留 error', async () => {
    useReferralStore.setState({ dbUp: true, currentId: 'r1' });
    m.cancelReferralApi.mockRejectedValueOnce(new Error('409 已结束'));
    expect(await useReferralStore.getState().cancel()).toBe(false);
    expect(useReferralStore.getState().error).toBe('409 已结束');
  });

  it('clearMessages 清除消息', () => {
    useReferralStore.setState({ error: 'x', success: 'y' });
    useReferralStore.getState().clearMessages();
    expect(useReferralStore.getState().error).toBeNull();
    expect(useReferralStore.getState().success).toBeNull();
  });
});
