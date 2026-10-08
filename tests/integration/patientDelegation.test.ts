/**
 * 健澜科技 jlmedaios - 家属代办授权 集成测试（M3-Q）
 *
 * 直接对真实 PostgreSQL 运行聚合器（无 mock），覆盖：
 *  - 授权：低风险范围授予；
 *  - 高风险（支付）：未二次确认 → 400，确认后成功；
 *  - 非法/空范围 → 400；
 *  - 更新授权、撤销授权；
 *  - 越权：对他人就诊人授权/撤销 → 403；
 *  - 授权历史、canActOnBehalf 代办校验；
 *  - BFF 路由信封 401/403。
 *
 * 隔离：创建临时患者账号，afterAll 全部删除。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { verifyDbConnection } from '../../src/db/pool.js';
import { type AuthView } from '../../src/bff/view/userView.js';
import {
  loginWithWechat,
  addProfile,
} from '../../src/bff/aggregators/internetPatientAggregator.js';
import {
  DelegationError,
  grantDelegation,
  revokeDelegation,
  listDelegations,
  canActOnBehalf,
} from '../../src/bff/aggregators/patientDelegationAggregator.js';
import { delegationRoutes } from '../../src/bff/routes/delegation.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';

const rand = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const accountIds: string[] = [];
const profileIds: string[] = [];

/** 创建患者账号并添加一个就诊人，返回 { accountId, profileId }。 */
async function seedAccountWithProfile(tag: string): Promise<{
  accountId: string;
  auth: AuthView;
  profileId: string;
}> {
  const login = await loginWithWechat({ code: 'l-del-' + tag + '-' + rand() });
  accountIds.push(login.accountId);
  const auth = { id: login.accountId } as AuthView;
  const p = await addProfile(login.accountId, {
    relation: 'parent',
    name: '测试老人' + rand().slice(0, 4),
  });
  profileIds.push(p.id);
  return { accountId: login.accountId, auth, profileId: p.id };
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}

describe.skipIf(!dbAvailable || !realMode)('M3-Q 家属代办授权（真实 PostgreSQL）', () => {
  if (!dbAvailable) {
    it.skip('数据库不可用，跳过（不冒充通过）', () => {});
  }

  it('授权：低风险范围授予成功', async () => {
    const { accountId, profileId } = await seedAccountWithProfile('low');
    const r = await grantDelegation(accountId, {
      profileId,
      scopes: ['booking', 'consultation'],
    });
    expect(r.scopes).toContain('booking');
    expect(r.scopes).toContain('consultation');
    expect(canActOnBehalf(r.scopes, 'booking')).toBe(true);
    expect(canActOnBehalf(r.scopes, 'payment')).toBe(false);
  });

  it('授权：范围自动去重、排序', async () => {
    const { accountId, profileId } = await seedAccountWithProfile('dedup');
    const r = await grantDelegation(accountId, {
      profileId,
      scopes: ['report', 'booking', 'booking'],
    });
    expect(r.scopes).toEqual(['booking', 'report']);
  });

  it('高风险：支付未二次确认 → 400', async () => {
    const { accountId, profileId } = await seedAccountWithProfile('pay-noconfirm');
    await expect(
      grantDelegation(accountId, { profileId, scopes: ['payment'] }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('高风险：支付二次确认后成功', async () => {
    const { accountId, profileId } = await seedAccountWithProfile('pay-confirm');
    const r = await grantDelegation(accountId, {
      profileId,
      scopes: ['payment'],
      confirmHighRisk: true,
    });
    expect(r.scopes).toContain('payment');
  });

  it('非法范围 → 400', async () => {
    const { accountId, profileId } = await seedAccountWithProfile('invalid');
    await expect(
      grantDelegation(accountId, {
        profileId,
        scopes: ['booking', 'not-a-scope'],
      }),
    ).rejects.toBeInstanceOf(DelegationError);
  });

  it('空范围 → 400', async () => {
    const { accountId, profileId } = await seedAccountWithProfile('empty');
    await expect(
      grantDelegation(accountId, { profileId, scopes: [] }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('更新：已授权后再次授予为 update', async () => {
    const { accountId, profileId } = await seedAccountWithProfile('update');
    await grantDelegation(accountId, { profileId, scopes: ['booking'] });
    const r = await grantDelegation(accountId, {
      profileId,
      scopes: ['booking', 'report'],
    });
    expect(r.scopes).toContain('report');
  });

  it('撤销：清空授权，canActOnBehalf 为 false', async () => {
    const { accountId, profileId } = await seedAccountWithProfile('revoke');
    await grantDelegation(accountId, {
      profileId,
      scopes: ['booking', 'payment'],
      confirmHighRisk: true,
    });
    await revokeDelegation(accountId, { profileId });
    const history = await listDelegations(accountId, { profileId });
    expect(history[0].action).toBe('revoke');
    expect(canActOnBehalf([], 'booking')).toBe(false);
  });

  it('撤销：本就无授权时幂等', async () => {
    const { accountId, profileId } = await seedAccountWithProfile('revoke-idem');
    const r = await revokeDelegation(accountId, { profileId });
    expect(r.profileId).toBe(profileId);
  });

  it('越权：对他人就诊人授权 → 403', async () => {
    const a = await seedAccountWithProfile('owner-a');
    const b = await seedAccountWithProfile('intruder-b');
    await expect(
      grantDelegation(b.accountId, {
        profileId: a.profileId,
        scopes: ['booking'],
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('越权：撤销他人就诊人 → 403', async () => {
    const a = await seedAccountWithProfile('owner-a2');
    const b = await seedAccountWithProfile('intruder-b2');
    await expect(
      revokeDelegation(b.accountId, { profileId: a.profileId }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('越权：查看他人就诊人历史 → 403', async () => {
    const a = await seedAccountWithProfile('owner-a3');
    const b = await seedAccountWithProfile('intruder-b3');
    await grantDelegation(a.accountId, {
      profileId: a.profileId,
      scopes: ['booking'],
    });
    await expect(
      listDelegations(b.accountId, { profileId: a.profileId }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it('历史：记录授予/更新/撤销全过程', async () => {
    const { accountId, profileId } = await seedAccountWithProfile('history');
    await grantDelegation(accountId, { profileId, scopes: ['booking'] });
    await grantDelegation(accountId, {
      profileId,
      scopes: ['booking', 'report'],
    });
    await revokeDelegation(accountId, { profileId });
    const history = await listDelegations(accountId, { profileId });
    // 最新在前：revoke, update, grant
    expect(history.map((h) => h.action)).toEqual([
      'revoke',
      'update',
      'grant',
    ]);
  });

  it('BFF 路由：未认证 → 401', async () => {
    const { profileId } = await seedAccountWithProfile('route-401');
    const req = new Request('http://127.0.0.1:8080/api/v1/delegation/grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, scopes: ['booking'] }),
    });
    const c = {
      req,
      user: null,
      traceId: 't1',
      body: async () => ({ profileId, scopes: ['booking'] }),
    } as unknown as Ctx;
    const route = delegationRoutes.find(
      (r) => r.path === '/api/v1/delegation/grant',
    )!;
    const res = await route.handle(c);
    expect(res.status).toBe(401);
  });

  it('BFF 路由：医护（非 patient）→ 403', async () => {
    const { profileId } = await seedAccountWithProfile('route-403');
    const req = new Request('http://127.0.0.1:8080/api/v1/delegation/grant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer x',
      },
      body: JSON.stringify({ profileId, scopes: ['booking'] }),
    });
    const c = {
      req,
      user: { id: 'admin1', roles: ['admin'] },
      traceId: 't2',
      body: async () => ({ profileId, scopes: ['booking'] }),
    } as unknown as Ctx;
    const route = delegationRoutes.find(
      (r) => r.path === '/api/v1/delegation/grant',
    )!;
    const res = await route.handle(c);
    expect(res.status).toBe(403);
  });
});

afterAll(async () => {
  // 清理：患者账号级联删除 profile、授权
  if (accountIds.length === 0) return;
  const { getDb } = await import('../../src/db/pool.js');
  const db = getDb();
  await db`DELETE FROM clinical.patient_accounts WHERE id = ANY(${accountIds})`;
});
