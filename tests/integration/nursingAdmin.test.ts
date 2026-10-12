/**
 * 健澜科技 jlmedaios - 护理管理后台 集成测试（M16-B）
 *
 * 直连真实 PostgreSQL（无 mock）：
 *  - 权限：护士具备 schedule/view/enter；医师缺 schedule/enter → 403；
 *  - 班次定义种子 3 条；指标库种子 10 条；
 *  - 排班分配 + 合规校验 + 发布留痕；休假登记；
 *  - 指标人工录入校验（分子≤分母）；仪表盘自动计算 + 未接入标注 pending；
 *  - 路由未认证 401。
 *
 * 夹具用远期日期 2099-01-01 与期 2099-01，afterAll 仅删本行。
 * 需要 TEST_REAL=1。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { listWardsByDepartment } from '../../src/db/repositories/nursingAdminRepo.js';
import {
  assignShift,
  createLeave,
  enterIndicatorValue,
  getIndicatorDashboard,
  listIndicatorCatalog,
  listShiftOptions,
  publishSchedule,
} from '../../src/bff/aggregators/nursingAdminAggregator.js';
import { nursingAdminRoutes } from '../../src/bff/routes/nursingAdmin.js';
import type { Ctx } from '../../src/bff/types.js';

const FUTURE_DATE = '2099-01-01';
const FUTURE_PERIOD = '2099-01';

let dbAvailable = false;
const realMode = process.env.DEMO_MODE !== '1';
let admin: AuthView;
let nurseZhao: AuthView;
let doctorLin: AuthView;
let wardId: string;
let dayShiftId: string;

async function load(username: string): Promise<AuthView> {
  const u = await getUserByUsername(username);
  if (!u) throw new Error(`缺少测试账号 ${username}`);
  return buildAuthView(u, await getUserRoleLinks(u.id));
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}
if (dbAvailable) {
  admin = await load('admin');
  nurseZhao = await load('nurse_zhao');
  doctorLin = await load('doctor_lin');
  const wards = await listWardsByDepartment('心血管内科');
  wardId = wards[0].id;
  const shifts = await listShiftOptions(nurseZhao, wardId);
  dayShiftId = shifts.shifts.find((s) => s.code === 'DAY')!.id;
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.nursing_schedules WHERE schedule_date = ${FUTURE_DATE}::date`;
    await db`DELETE FROM clinical.nursing_leave WHERE leave_date = ${FUTURE_DATE}::date`;
    await db`DELETE FROM clinical.nursing_indicator_values WHERE period = ${FUTURE_PERIOD}`;
    await closeDbForTest();
  }
});

function makeCtx(user: { id: string } | null): Ctx {
  return {
    user: user ? { id: user.id, roles: ['admin'], permissions: [] } : null,
    query: new URLSearchParams(), params: {},
    body: async () => ({}), headers: new Headers(), method: 'GET', path: '/',
  } as unknown as Ctx;
}

describe.skipIf(!dbAvailable || !realMode)('M16-B 护理管理后台（真实 PostgreSQL）', () => {
  it('环境就绪：护士有排班/录入权限，医师缺排班写权限', () => {
    expect(nurseZhao.permissions).toContain('nursing_admin:schedule:view');
    expect(nurseZhao.permissions).toContain('nursing_admin:schedule');
    expect(nurseZhao.permissions).toContain('nursing_admin:indicator:enter');
    expect(doctorLin.permissions).toContain('nursing_admin:schedule:view');
    expect(doctorLin.permissions).toContain('nursing_admin:indicator:view');
    expect(doctorLin.permissions).not.toContain('nursing_admin:schedule');
  });

  it('班次定义种子 3 条（白/中/夜）', async () => {
    const { shifts } = await listShiftOptions(nurseZhao, wardId);
    expect(shifts.length).toBeGreaterThanOrEqual(3);
    expect(shifts.some((s) => s.isNight)).toBe(true);
  });

  it('指标库种子 10 条', async () => {
    const { indicators } = await listIndicatorCatalog(nurseZhao);
    expect(indicators.length).toBeGreaterThanOrEqual(10);
    expect(indicators.some((i) => i.code === 'NQI_MED_ERROR')).toBe(true);
  });

  it('排班分配 -> 合规校验 -> 发布留痕', async () => {
    const r = await assignShift(nurseZhao, {
      wardId, date: FUTURE_DATE, nurseId: nurseZhao.id, shiftId: dayShiftId,
    });
    expect(r.schedule.wardId).toBe(wardId);
    expect(r.compliance).toHaveProperty('violations');
    const pub = await publishSchedule(admin, { wardId, date: FUTURE_DATE });
    expect(pub.published).toBeGreaterThanOrEqual(1);
  });

  it('医师排班 403（职责分离）', async () => {
    { let __e: unknown = null; try { await (assignShift(doctorLin, { wardId, date: FUTURE_DATE, nurseId: doctorLin.id, shiftId: dayShiftId })); } catch (e) { __e = e; } expect(__e).toMatchObject({ status: 403 }); }
  });

  it('休假登记', async () => {
    const leave = await createLeave(nurseZhao, {
      nurseId: nurseZhao.id, date: FUTURE_DATE, leaveType: 'annual', reason: '年假',
    });
    expect(leave.leave.leaveDate).toBe(FUTURE_DATE);
  });

  it('指标人工录入：合法落库；分子>分母 400', async () => {
    const ok = await enterIndicatorValue(nurseZhao, {
      indicatorCode: 'NQI_FALL_INCIDENT', wardId, period: FUTURE_PERIOD,
      numerator: 1, denominator: 30, note: 'M16B 夹具',
    });
    expect(ok.value.indicatorCode).toBe('NQI_FALL_INCIDENT');
    { let __e: unknown = null; try { await (enterIndicatorValue(nurseZhao, {
        indicatorCode: 'NQI_FALL_INCIDENT', wardId, period: FUTURE_PERIOD,
        numerator: 99, denominator: 30,
      })); } catch (e) { __e = e; } expect(__e).toMatchObject({ status: 400 }); }
  });

  it('指标仪表盘：自动指标有数、未接入标 pending', async () => {
    const dash = await getIndicatorDashboard(nurseZhao, { wardId, period: '2026-10' });
    expect(dash.indicators.length).toBeGreaterThanOrEqual(8);
    const medError = dash.indicators.find((i) => i.code === 'NQI_MED_ERROR')!;
    expect(medError.sourceStatus).toBe('pending_manual');
    expect(medError.value).toBeNull();
    const ratio = dash.indicators.find((i) => i.code === 'NQI_BED_NURSE_RATIO')!;
    expect(ratio.sourceStatus).toBe('auto');
  });

  it('路由：未认证 401', async () => {
    const route = nursingAdminRoutes.find((r) => r.path === '/api/v1/admin/schedules')!;
    const res = await route.handle(makeCtx(null));
    expect(res.status).toBe(401);
  });
});
