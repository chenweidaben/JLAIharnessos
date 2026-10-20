/**
 * 健澜科技 jlmedaios - 患者门户路由
 *
 * 历史 M80-A 真实聚合端点：
 *   GET /api/v1/patient/portal        患者端门户（portalView 聚合，真实/DEMO 双路）
 *
 * M454 患者侧自助服务（DEMO_MODE=1 短路 mock）：
 *   GET /api/v1/portal/appointments     预约挂号
 *   GET /api/v1/portal/reports            报告查询
 *   GET /api/v1/portal/bills             费用账单
 *   GET /api/v1/portal/guide             智能导诊
 *   GET /api/v1/portal/reminders          就诊提醒
 *   GET /api/v1/portal/health-archive    个人健康档案
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import { requirePermissionCode } from '../middleware/auth';
import { portalView, PatientPortalError } from '../aggregators/patientPortalAggregator.js';

// ---- M80-A 真实门户聚合端点（保留，不被 M454 mock 覆盖） ----

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  // demo 模式无 DB，直接用 JWT 中的身份信息构建视图
  if (process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true') {
    const rawRoles = c.user.roles ?? ['patient'];
    return {
      id: c.user.id,
      username: c.user.name ?? 'patient',
      realName: c.user.name ?? '测试患者',
      employeeNo: '',
      gender: 'unknown',
      deptCode: 'outpatient',
      deptName: '门诊',
      title: '',
      phone: '',
      email: '',
      status: 'active',
      roles: rawRoles.map((r) => ({ id: `role_${r}`, code: r, name: r, description: r, level: 'dept', dataScope: 'self', status: 'enabled', userCount: 0, permissionCount: 0, permissionCodes: [], createdAt: '', createdBy: 'system' })),
      roleCodes: rawRoles,
      rawRoles,
      permissions: c.user.permissions ?? [],
      dataScope: 'self',
    };
  }
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PatientPortalError) {
    const code = err.status === 403 ? ErrorCode.FORBIDDEN : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '门户聚合失败'), 500);
}

export const patientPortalRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/portal',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'patient_portal:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try { return json(ok(await portalView(view))); } catch (e) { return mapError(e); }
    },
  },
];

// ---- M454 患者侧自助服务（DEMO_MODE=1 短路 mock） ----

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `pt-${i + 1}`, ...builder(i + 1) })) };
}

export const portalM454Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/portal/appointments',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, department: `科室-${n}`, doctor: `医生-${n}`, slot: `时段-${n}`, status: n % 2 === 0 ? 'confirmed' : 'pending' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/portal/reports',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ reportNo: `RP-${28000 + n}`, type: `报告类型-${n}`, issuedAt: new Date(Date.now() - n * 86400000).toISOString(), viewStatus: n % 2 === 0 ? 'viewed' : 'unviewed', pushed: true })))),
  },
  {
    method: 'GET',
    path: '/api/v1/portal/bills',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ billNo: `BL-${29000 + n}`, item: `项目-${n}`, amount: n * 120, payStatus: n % 2 === 0 ? 'paid' : 'unpaid', date: new Date(Date.now() - n * 86400000).toISOString().slice(0, 10) })))),
  },
  {
    method: 'GET',
    path: '/api/v1/portal/guide',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ symptom: `症状-${n}`, suggestedDept: `建议科室-${n}`, recommendedDoctor: `推荐医生-${n}`, match: 0.8 + n * 0.03, time: new Date(Date.now() - n * 3600000).toISOString() })))),
  },
  {
    method: 'GET',
    path: '/api/v1/portal/reminders',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ reminderNo: `RM-${30000 + n}`, type: `提醒类型-${n}`, triggerAt: new Date(Date.now() + n * 3600000).toISOString(), channel: n % 2 === 0 ? 'sms' : 'app', read: n % 2 === 0 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/portal/health-archive',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ patient: `患者-${n}`, basic: `基本信息-${n}`, visitHistory: `就诊史-${n}`, allergyHistory: `过敏史-${n}`, updatedAt: new Date(Date.now() - n * 86400000).toISOString() })))),
  },
];
