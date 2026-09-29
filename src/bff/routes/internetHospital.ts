/**
 * 健澜科技 jlmedaios - 互联网医院 BFF 路由（M3-J）
 *
 * 患者端（微信登录/就诊人/实名认证）与医护端（线上资质/审核）。
 * 患者使用患者 JWT（roles=['patient']），医护资质审核使用权限码。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  type Ctx,
  ErrorCode,
  fail,
  json,
  ok,
  type RouteDef,
} from '../types';
import { requirePermissionCode, requireRole } from '../middleware/auth';
import {
  InternetPatientError,
  loginWithWechat,
  bindPhone,
  listMyProfiles,
  addProfile,
  getMyProfile,
  verifyRealname,
  submitPractitioner,
  listPractitioners,
  auditPractitioner,
  getMyPractitioner,
} from '../aggregators/internetPatientAggregator';

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof InternetPatientError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 409
          ? ErrorCode.CONFLICT
          : err.status === 403
            ? ErrorCode.FORBIDDEN
            : err.status === 400
              ? ErrorCode.BAD_REQUEST
              : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message, c.traceId), err.status);
  }
  // 非业务错误（如 DB 连接失败）：服务端记录完整错误（含 traceId），
  // 客户端仅返回通用文案 + traceId，不泄露堆栈/SQL/连接细节（等保三级）。
  console.error(`[bff error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
  return json(
    fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
    500,
  );
}

/** 患者鉴权：要求患者 JWT，返回 accountId */
function patientGuard(c: Ctx): string | Response {
  const denied = requireRole(c, 'patient');
  if (denied) return denied;
  return c.user!.id;
}

export const internetHospitalRoutes: RouteDef[] = [
  // ----- 患者端：微信登录（无需 token） -----
  {
    method: 'POST',
    path: '/api/v1/internet/patient/login',
    handle: async (c) => {
      try {
        const body = await c.body<{ code: string }>();
        const ip = c.req.headers.get('x-forwarded-for') ?? undefined;
        return json(ok(await loginWithWechat({ code: body.code, ip })));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 绑定手机号 -----
  {
    method: 'POST',
    path: '/api/v1/internet/patient/phone',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const body = await c.body<{ phone: string }>();
        return json(ok(await bindPhone(guard, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 就诊人列表 -----
  {
    method: 'GET',
    path: '/api/v1/internet/patient/profiles',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        return json(ok(await listMyProfiles(guard)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 添加就诊人 -----
  {
    method: 'POST',
    path: '/api/v1/internet/patient/profiles',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const body = await c.body<Parameters<typeof addProfile>[1]>();
        return json(ok(await addProfile(guard, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 就诊人详情 -----
  {
    method: 'GET',
    path: '/api/v1/internet/patient/profiles/:id',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        return json(ok(await getMyProfile(guard, c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 实名认证 -----
  {
    method: 'POST',
    path: '/api/v1/internet/patient/realname',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const body = await c.body<{
          profileId: string;
          realName: string;
          idCard: string;
          faceImageBase64?: string;
          guardianProfileId?: string;
        }>();
        return json(ok(await verifyRealname(guard, body, c.traceId)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 医护：提交线上资质 -----
  {
    method: 'POST',
    path: '/api/v1/internet/practitioner/submit',
    handle: async (c) => {
      const denied = requireRole(c, 'doctor', 'pharmacist', 'nurse');
      if (denied) return denied;
      try {
        const body = await c.body<Parameters<typeof submitPractitioner>[1]>();
        return json(ok(await submitPractitioner(c.user!.id, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 医护：本人资质 -----
  {
    method: 'GET',
    path: '/api/v1/internet/practitioner/me',
    handle: async (c) => {
      const denied = requireRole(c, 'doctor', 'pharmacist', 'nurse');
      if (denied) return denied;
      try {
        return json(ok(await getMyPractitioner(c.user!.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 管理端：资质列表 -----
  {
    method: 'GET',
    path: '/api/v1/internet/practitioners',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'internet:practitioner:audit');
      if (denied) return denied;
      try {
        return json(ok(await listPractitioners(c.query.get('status') ?? undefined)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // ----- 管理端：资质审核 -----
  {
    method: 'POST',
    path: '/api/v1/internet/practitioners/:id/audit',
    handle: async (c) => {
      const denied = requirePermissionCode(c, 'internet:practitioner:audit');
      if (denied) return denied;
      try {
        const body = await c.body<{ decision: 'approved' | 'rejected'; reason?: string }>();
        return json(ok(await auditPractitioner(c.params.id, c.user!.id, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
