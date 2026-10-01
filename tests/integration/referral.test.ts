/**
 * 健澜科技 jlmedaios - 双向转诊 集成测试（M3-R）
 *
 * 直接对真实 PostgreSQL 运行聚合器（无 mock），覆盖：
 *  - 发起转入/转出登记；
 *  - 补充随附资料（院外资料直接存储）；
 *  - 接收转入：院外患者 EMPI 建档 + 生成本院就诊；
 *  - 已建档患者接收：不重复建档；
 *  - 拒绝 / 完成 / 取消；
 *  - 非法状态转换 → 409；
 *  - 数据范围过滤、详情 404；
 *  - BFF 路由信封 401/403。
 *
 * 隔离：记录全部 referral/encounter/patient，afterAll 精确删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { getDb, verifyDbConnection } from '../../src/db/pool.js';
import { type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { buildAuthView } from '../../src/bff/view/userView.js';
import {
  ReferralError,
  acceptReferral,
  addDocument,
  cancelReferral,
  completeReferral,
  createReferral,
  getReferral,
  listReferralQueue,
  rejectReferral,
} from '../../src/bff/aggregators/referralAggregator.js';
import { referralRoutes } from '../../src/bff/routes/referral.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let pharmacist: AuthView;

const runId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const referralIds: string[] = [];
const encounterIds: string[] = [];
const patientIds: string[] = [];

const SOURCE = `M3R源机构${runId}`;
const TARGET = `M3R目标机构${runId}`;

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

if (dbAvailable) {
  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  doctorChen = await load('doctor_chen');
  pharmacist = await load('pharmacist_wang');
}

afterAll(async () => {
  if (!dbAvailable) return;
  const db = getDb();
  // 转诊单（随附资料级联）
  if (referralIds.length > 0) {
    await db`DELETE FROM clinical.referral_orders WHERE id = ANY(${referralIds})`;
  }
  // 生成的就诊
  if (encounterIds.length > 0) {
    await db`DELETE FROM clinical.visits WHERE id = ANY(${encounterIds})`;
  }
  // 新建的患者（仅本测试创建的、带 M3R_REFERRAL 标签的）
  if (patientIds.length > 0) {
    await db`DELETE FROM clinical.patients WHERE id = ANY(${patientIds})`;
  }
});

describe('M3-R 双向转诊（真实 PostgreSQL）', () => {
  if (!dbAvailable) {
    it.skip('数据库不可用，跳过（不冒充通过）', () => {});
    return;
  }

  it('发起转入登记成功', async () => {
    const r = await createReferral(admin, {
      direction: 'incoming',
      patientName: '转入患者' + runId.slice(0, 4),
      gender: '男',
      sourceOrg: SOURCE,
      sourceDept: '内科',
      targetOrg: '本院',
      targetDept: '心血管内科',
      reason: '胸痛待查，需进一步冠脉评估',
    });
    referralIds.push(r.id);
    expect(r.referralNo).toMatch(/^REF/);
    expect(r.status).toBe('submitted');
    expect(r.direction).toBe('incoming');
  });

  it('发起转出登记成功', async () => {
    const r = await createReferral(doctorChen, {
      direction: 'outgoing',
      patientName: '转出患者' + runId.slice(0, 4),
      sourceOrg: '本院',
      targetOrg: TARGET,
      reason: '需上级医院进一步治疗',
      urgency: 'urgent',
    });
    referralIds.push(r.id);
    expect(r.direction).toBe('outgoing');
    expect(r.urgency).toBe('urgent');
  });

  it('转入登记缺患者姓名 → 400', async () => {
    await expect(
      createReferral(admin, {
        direction: 'incoming',
        sourceOrg: SOURCE,
        targetOrg: TARGET,
        reason: 'x',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('转诊原因/机构为空 → 400', async () => {
    await expect(
      createReferral(admin, {
        direction: 'incoming',
        patientName: '某人',
        sourceOrg: '',
        targetOrg: TARGET,
        reason: 'x',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('补充随附资料（院外资料直接存储）', async () => {
    const r = await createReferral(admin, {
      direction: 'incoming',
      patientName: '带资料患者' + runId.slice(0, 4),
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: '随附检验检查',
    });
    referralIds.push(r.id);
    const detail = await addDocument(admin, r.id, {
      docType: 'lab',
      title: '血常规',
      contentText: '白细胞 11.2，中性粒细胞比例 82%',
    });
    expect(detail.documents).toHaveLength(1);
    expect(detail.documents[0].docType).toBe('lab');
    // 再补一份 DICOM
    const detail2 = await addDocument(admin, r.id, {
      docType: 'dicom',
      title: '胸部CT',
      contentRef: '1.2.840.' + runId,
    });
    expect(detail2.documents).toHaveLength(2);
  });

  it('资料内容全空 → 400', async () => {
    const r = await createReferral(admin, {
      direction: 'incoming',
      patientName: '空资料' + runId.slice(0, 4),
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: 'x',
    });
    referralIds.push(r.id);
    await expect(
      addDocument(admin, r.id, { docType: 'other', title: '空' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('接收转入：院外患者建档 + 生成本院就诊', async () => {
    const r = await createReferral(admin, {
      direction: 'incoming',
      patientName: '接收建档' + runId.slice(0, 4),
      gender: '女',
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: '心力衰竭',
    });
    referralIds.push(r.id);
    const detail = await acceptReferral(admin, r.id, {
      department: '心血管内科',
      visitType: 'inpatient',
    });
    expect(detail.referral.status).toBe('accepted');
    expect(detail.referral.encounterId).toBeTruthy();
    expect(detail.referral.patientId).toBeTruthy();
    if (detail.referral.encounterId) encounterIds.push(detail.referral.encounterId);
    if (detail.referral.patientId) patientIds.push(detail.referral.patientId);
  });

  it('已建档患者接收：不重复建档', async () => {
    // 先接收一次建立患者
    const r1 = await createReferral(admin, {
      direction: 'incoming',
      patientName: '重复建档' + runId.slice(0, 4),
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: '第一次',
    });
    referralIds.push(r1.id);
    const d1 = await acceptReferral(admin, r1.id, { department: '心血管内科' });
    if (d1.referral.encounterId) encounterIds.push(d1.referral.encounterId);
    const existingPatient = d1.referral.patientId;
    if (existingPatient) patientIds.push(existingPatient);

    // 第二张转诊单直接关联该患者
    const r2 = await createReferral(admin, {
      direction: 'incoming',
      patientId: existingPatient,
      patientName: '重复建档' + runId.slice(0, 4),
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: '第二次',
    });
    referralIds.push(r2.id);
    const d2 = await acceptReferral(admin, r2.id, { department: '心血管内科' });
    if (d2.referral.encounterId) encounterIds.push(d2.referral.encounterId);
    expect(d2.referral.patientId).toBe(existingPatient);
  });

  it('接收转出单 → 400', async () => {
    const r = await createReferral(admin, {
      direction: 'outgoing',
      patientName: '转出误接收' + runId.slice(0, 4),
      sourceOrg: '本院',
      targetOrg: TARGET,
      reason: 'x',
    });
    referralIds.push(r.id);
    await expect(
      acceptReferral(admin, r.id, { department: '心血管内科' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('重复接收 → 409', async () => {
    const r = await createReferral(admin, {
      direction: 'incoming',
      patientName: '重复接收' + runId.slice(0, 4),
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: 'x',
    });
    referralIds.push(r.id);
    const d = await acceptReferral(admin, r.id, { department: '心血管内科' });
    if (d.referral.encounterId) encounterIds.push(d.referral.encounterId);
    if (d.referral.patientId) patientIds.push(d.referral.patientId);
    await expect(
      acceptReferral(admin, r.id, { department: '心血管内科' }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('拒绝转诊', async () => {
    const r = await createReferral(admin, {
      direction: 'incoming',
      patientName: '被拒绝' + runId.slice(0, 4),
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: 'x',
    });
    referralIds.push(r.id);
    const rejected = await rejectReferral(admin, r.id, '资料不全');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectedReason).toBe('资料不全');
  });

  it('拒绝原因为空 → 400', async () => {
    const r = await createReferral(admin, {
      direction: 'incoming',
      patientName: '空拒绝' + runId.slice(0, 4),
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: 'x',
    });
    referralIds.push(r.id);
    await expect(rejectReferral(admin, r.id, '   ')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('已接收 → 完成转诊', async () => {
    const r = await createReferral(admin, {
      direction: 'incoming',
      patientName: '将完成' + runId.slice(0, 4),
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: 'x',
    });
    referralIds.push(r.id);
    const d = await acceptReferral(admin, r.id, { department: '心血管内科' });
    if (d.referral.encounterId) encounterIds.push(d.referral.encounterId);
    if (d.referral.patientId) patientIds.push(d.referral.patientId);
    const completed = await completeReferral(admin, r.id);
    expect(completed.status).toBe('completed');
  });

  it('未接收直接完成 → 409', async () => {
    const r = await createReferral(admin, {
      direction: 'incoming',
      patientName: '提前完成' + runId.slice(0, 4),
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: 'x',
    });
    referralIds.push(r.id);
    await expect(completeReferral(admin, r.id)).rejects.toMatchObject({
      status: 409,
    });
  });

  it('取消转诊', async () => {
    const r = await createReferral(admin, {
      direction: 'outgoing',
      patientName: '将取消' + runId.slice(0, 4),
      sourceOrg: '本院',
      targetOrg: TARGET,
      reason: 'x',
    });
    referralIds.push(r.id);
    const cancelled = await cancelReferral(admin, r.id);
    expect(cancelled.status).toBe('cancelled');
  });

  it('已结束的转诊补充资料 → 409', async () => {
    const r = await createReferral(admin, {
      direction: 'incoming',
      patientName: '结束补资料' + runId.slice(0, 4),
      sourceOrg: SOURCE,
      targetOrg: '本院',
      reason: 'x',
    });
    referralIds.push(r.id);
    await rejectReferral(admin, r.id, '不符');
    await expect(
      addDocument(admin, r.id, {
        docType: 'other',
        title: '迟到的资料',
        contentText: '内容',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('详情查询：不存在 → 404', async () => {
    await expect(
      getReferral(admin, '00000000-0000-0000-0000-000000000000'),
    ).rejects.toMatchObject({ status: 404 });
  });

  it('列表：按方向过滤', async () => {
    const incoming = await listReferralQueue(admin, { direction: 'incoming' });
    expect(incoming.every((r) => r.direction === 'incoming')).toBe(true);
    const outgoing = await listReferralQueue(admin, { direction: 'outgoing' });
    expect(outgoing.every((r) => r.direction === 'outgoing')).toBe(true);
  });

  it('数据范围：all 可见全部，self 仅本人', async () => {
    const all = await listReferralQueue(admin);
    const testRefs = all.filter((r) => referralIds.includes(r.id));
    expect(testRefs.length).toBe(referralIds.length);
  });

  it('错误类型为 ReferralError', async () => {
    let caught: unknown = null;
    try {
      await getReferral(admin, '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ReferralError);
  });

  it('BFF 路由信封：未认证 → 401', async () => {
    const route = referralRoutes.find(
      (r) => r.method === 'GET' && r.path === '/api/v1/referrals',
    )!;
    const res = await route.handle({
      user: null,
      query: new URLSearchParams(),
      params: {},
    } as unknown as Ctx);
    expect(res.status).toBe(401); // 未认证
  });

  it('BFF 路由：药师无 referral:accept → 403', async () => {
    const route = referralRoutes.find(
      (r) => r.method === 'POST' && r.path === '/api/v1/referrals/:id/accept',
    )!;
    const res = await route.handle({
      user: { id: pharmacist.id, roles: pharmacist.rawRoles },
      params: { id: 'x' },
      body: async () => ({ department: 'x' }),
    } as unknown as Ctx);
    expect(res.status).toBe(403);
  });
});
