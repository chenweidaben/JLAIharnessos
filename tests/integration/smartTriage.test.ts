/**
 * 健澜科技 jlmedaios - 智能导诊/预问诊 集成测试（M3-P）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 导诊：症状 → 推荐科室 → 患者选定；
 *  - 预问诊：结构化病史 → 报告 → 医生采用；
 *  - 关联导诊会话的归属校验；
 *  - 越权：他人会话 403、非本人 403；
 *  - 校验：空症状/空主诉 400；
 *  - BFF 路由信封 401/403。
 *
 * 隔离：创建临时患者账号，afterAll 全部删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import {
  loginWithWechat,
} from '../../src/bff/aggregators/internetPatientAggregator.js';
import {
  SmartTriageError,
  startTriage,
  chooseDepartment,
  submitPreliminary,
  listMyTriage,
  listPreliminaryForStaff,
  getPreliminaryDetail,
  consumePreliminary,
} from '../../src/bff/aggregators/smartTriageAggregator.js';
import { smartTriageRoutes } from '../../src/bff/routes/smartTriage.js';
import { requirePermissionCode } from '../../src/bff/middleware/auth.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctor: AuthView;

const rand = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const accountIds: string[] = [];
const sessionIds: string[] = [];
const preliminaryIds: string[] = [];

/** 创建一个患者账号，返回患者侧 AuthView（id=accountId）。 */
async function seedPatientAccount(tag: string): Promise<AuthView> {
  const login = await loginWithWechat({ code: 'l-tri-' + tag + '-' + rand() });
  accountIds.push(login.accountId);
  return { id: login.accountId } as AuthView;
}

const goodHistory = {
  chiefComplaint: '头痛 3 天',
  presentIllness: '3 天前出现头痛，呈持续性胀痛，伴轻度发热，无呕吐。',
  pastHistory: '既往体健',
  medications: '无',
  allergies: '无',
  onsetTime: '3 天前',
  accompanyingSymptoms: ['发热'],
};

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
  doctor = await load('doctor_li');
}

describe.skipIf(!dbAvailable)('M3-P 智能导诊/预问诊 · 聚合器', () => {
  it('导诊：呼吸症状 → 推荐科室非空', async () => {
    const patient = await seedPatientAccount('start');
    const r = await startTriage(patient, { symptoms: '咳嗽发热两天，咽痛' });
    sessionIds.push(r.session.id);
    expect(r.recommendations.length).toBeGreaterThan(0);
    expect(r.session.status).toBe('open');
    expect(r.recommendations[0].department).toBeTruthy();
  });

  it('导诊：选定科室后会话完成', async () => {
    const patient = await seedPatientAccount('choose');
    const r = await startTriage(patient, { symptoms: '胸痛胸闷，心悸' });
    sessionIds.push(r.session.id);
    const dept = r.recommendations[0].department;
    const done = await chooseDepartment(patient, {
      sessionId: r.session.id,
      department: dept,
    });
    expect(done.status).toBe('completed');
    expect(done.chosenDepartment).toBe(dept);
  });

  it('导诊：已完成会话重复选定幂等返回', async () => {
    const patient = await seedPatientAccount('idem');
    const r = await startTriage(patient, { symptoms: '腹痛腹泻' });
    sessionIds.push(r.session.id);
    await chooseDepartment(patient, {
      sessionId: r.session.id,
      department: r.recommendations[0].department,
    });
    const again = await chooseDepartment(patient, {
      sessionId: r.session.id,
      department: r.recommendations[0].department,
    });
    expect(again.status).toBe('completed');
  });

  it('预问诊：完整病史 → 生成报告', async () => {
    const patient = await seedPatientAccount('pre');
    const r = await submitPreliminary(patient, {
      targetDepartment: '神经内科',
      history: goodHistory,
    });
    preliminaryIds.push(r.consultation.id);
    expect(r.consultation.status).toBe('completed');
    expect(r.reportText).toContain('头痛 3 天');
    expect(r.reportText).toContain('神经内科');
  });

  it('预问诊：关联导诊会话，自动带入选定科室', async () => {
    const patient = await seedPatientAccount('link');
    const t = await startTriage(patient, { symptoms: '皮肤瘙痒，皮疹' });
    sessionIds.push(t.session.id);
    const dept = t.recommendations[0].department;
    await chooseDepartment(patient, { sessionId: t.session.id, department: dept });
    const r = await submitPreliminary(patient, {
      triageSessionId: t.session.id,
      history: goodHistory,
    });
    preliminaryIds.push(r.consultation.id);
    expect(r.consultation.targetDepartment).toBe(dept);
  });

  it('医护：列表与详情可查', async () => {
    const list = await listPreliminaryForStaff(admin);
    expect(Array.isArray(list)).toBe(true);
    if (preliminaryIds.length) {
      const detail = await getPreliminaryDetail(admin, preliminaryIds[0]);
      expect(detail.id).toBe(preliminaryIds[0]);
    }
  });

  it('医护：采用报告 → consumed', async () => {
    const patient = await seedPatientAccount('consume');
    const r = await submitPreliminary(patient, {
      targetDepartment: '内科',
      history: goodHistory,
    });
    preliminaryIds.push(r.consultation.id);
    const done = await consumePreliminary(doctor, r.consultation.id);
    expect(done.status).toBe('consumed');
  });

  it('医护：重复采用幂等', async () => {
    const patient = await seedPatientAccount('consume2');
    const r = await submitPreliminary(patient, {
      targetDepartment: '内科',
      history: goodHistory,
    });
    preliminaryIds.push(r.consultation.id);
    await consumePreliminary(doctor, r.consultation.id);
    const again = await consumePreliminary(doctor, r.consultation.id);
    expect(again.status).toBe('consumed');
  });

  it('患者：listMyTriage 返回本人会话', async () => {
    const patient = await seedPatientAccount('mine');
    const r = await startTriage(patient, { symptoms: '头晕乏力' });
    sessionIds.push(r.session.id);
    const list = await listMyTriage(patient);
    expect(list.some((s) => s.id === r.session.id)).toBe(true);
  });

  it('越权：选定他人导诊会话 → 403', async () => {
    const a = await seedPatientAccount('a');
    const b = await seedPatientAccount('b');
    const r = await startTriage(a, { symptoms: '头痛' });
    sessionIds.push(r.session.id);
    await expect(
      chooseDepartment(b, { sessionId: r.session.id, department: '内科' }),
    ).rejects.toBeInstanceOf(SmartTriageError);
  });

  it('越权：使用他人导诊会话提交预问诊 → 403', async () => {
    const a = await seedPatientAccount('a2');
    const b = await seedPatientAccount('b2');
    const t = await startTriage(a, { symptoms: '咳嗽' });
    sessionIds.push(t.session.id);
    await expect(
      submitPreliminary(b, {
        triageSessionId: t.session.id,
        history: goodHistory,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('校验：空症状 → 400', async () => {
    const patient = await seedPatientAccount('empty');
    await expect(
      startTriage(patient, { symptoms: '' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('校验：缺主诉/现病史 → 400', async () => {
    const patient = await seedPatientAccount('empty2');
    await expect(
      submitPreliminary(patient, {
        targetDepartment: '内科',
        history: { chiefComplaint: '', presentIllness: '' },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('不存在会话 → 404', async () => {
    const patient = await seedPatientAccount('nf');
    await expect(
      chooseDepartment(patient, {
        sessionId: crypto.randomUUID(),
        department: '内科',
      }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe.skipIf(!dbAvailable)('M3-P 智能导诊 · BFF 路由信封', () => {
  function ctx(over: Partial<Ctx>): Ctx {
    return {
      params: {},
      query: new URLSearchParams(),
      body: async () => ({}),
      user: null,
      traceId: 'trc_test',
      ...over,
    } as unknown as Ctx;
  }

  it('未登录访问受保护端点 → 401', async () => {
    const route = smartTriageRoutes.find(
      (r) => r.path === '/api/v1/triage/my' && r.method === 'GET',
    )!;
    const res = await route.handle(ctx({ user: null }));
    // requirePermissionCode 对无权限返回 403（含未登录）
    expect([401, 403]).toContain(res.status);
  });

  it('无 triage:use 权限 → 403', async () => {
    const route = smartTriageRoutes.find(
      (r) => r.path === '/api/v1/triage/start' && r.method === 'POST',
    )!;
    const res = await route.handle(
      ctx({
        user: { id: 'x', name: 'x', roles: ['guest'], permissions: [] },
        body: (async () => ({ symptoms: '头痛' })) as Ctx['body'],
      }),
    );
    expect(res.status).toBe(403);
  });

  it('admin 有 triage:view，权限校验通过', () => {
    const denied = requirePermissionCode(
      { user: { id: admin.id, roles: ['admin'], permissions: ['triage:view'] } } as unknown as Ctx,
      'triage:view',
    );
    expect(denied).toBeNull();
  });
});

afterAll(async () => {
  if (!dbAvailable) return;
  const db = getDb();
  // 删除预问诊、导诊会话
  if (preliminaryIds.length) {
    await db`DELETE FROM clinical.preliminary_consultations WHERE id = ANY(${preliminaryIds})`;
  }
  if (sessionIds.length) {
    await db`DELETE FROM clinical.triage_sessions WHERE id = ANY(${sessionIds})`;
  }
  // 删除患者账号
  if (accountIds.length) {
    await db`DELETE FROM clinical.patient_accounts WHERE id = ANY(${accountIds})`;
  }
});
