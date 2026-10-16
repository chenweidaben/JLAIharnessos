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

/** 健澜科技：DEMO_MODE 下不连 PostgreSQL，GET 返回内存兜底（不伪造业务数字）。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
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
// M163-D：互联网医院深化——处方流转与药品配送（纯函数）
import {
  buildOnlineConsultationFlow,
  routePrescriptionToPharmacy,
  trackDelivery,
  verifyOnlinePrescription,
} from '../aggregators/internetHospitalAggregator';

/** M163-D：纯函数抛出的业务错误 → 结构化错误信封 */
function mapFlowError(err: unknown, c: Ctx): Response {
  const msg = err instanceof Error ? err.message : '处方流转失败';
  const status =
    msg.includes('不存在') || msg.includes('尚未生成') ? 404 : 400;
  const code = status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST;
  return json(fail(code, msg, c.traceId), status);
}

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
      if (isDemo) return json(ok({ demo: true }));
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

  /* ================== M163-D：处方流转与药品配送 ================== */

  // 流程蓝图：问诊七步（含每步合规卡口），供深化页渲染
  {
    method: 'GET',
    path: '/api/v1/internet/consultation-flow',
    auth: true,
    handle: async (c) => {
      try {
        return json(ok(buildOnlineConsultationFlow(), '问诊流程已加载'));
      } catch (err) {
        return mapFlowError(err, c);
      }
    },
  },

  // 合规复核：验方（麻精毒放禁开 / 二次方须审方）
  {
    method: 'GET',
    path: '/api/v1/internet/prescription/:id/verify',
    auth: true,
    handle: async (c) => {
      try {
        return json(ok(verifyOnlinePrescription(c.params.id), '处方合规复核完成'));
      } catch (err) {
        return mapFlowError(err, c);
      }
    },
  },

  // 处方流转：按患者定位就近选合规药房（合规不通过即阻断，不违规售药）
  {
    method: 'POST',
    path: '/api/v1/internet/prescription/route',
    auth: true,
    handle: async (c) => {
      try {
        const body = await c.body<{
          prescriptionId?: string;
          patientLocation?: { lng?: number; lat?: number; district?: string };
        }>();
        if (!body.prescriptionId?.trim()) {
          return json(
            fail(ErrorCode.BAD_REQUEST, '缺少 prescriptionId', c.traceId),
            400,
          );
        }
        const loc = body.patientLocation;
        if (
          !loc ||
          typeof loc.lng !== 'number' ||
          typeof loc.lat !== 'number'
        ) {
          return json(
            fail(ErrorCode.BAD_REQUEST, '缺少患者定位 patientLocation.lng/lat', c.traceId),
            400,
          );
        }
        const decision = routePrescriptionToPharmacy(
          body.prescriptionId.trim(),
          { lng: loc.lng, lat: loc.lat, district: loc.district },
        );
        // 合规不通过：以 409 明确告知“禁止流转售药”，前端据此阻断
        if (!decision.routed) {
          const detail =
            decision.warnings.length > 0
              ? `${decision.reason}：${decision.warnings.join('；')}`
              : decision.reason;
          return json(fail(ErrorCode.CONFLICT, detail, c.traceId), 409);
        }
        return json(ok(decision, '处方已流转至就近合规药房'));
      } catch (err) {
        return mapFlowError(err, c);
      }
    },
  },

  // 药品配送追踪：按处方 ID 回读配送链路
  {
    method: 'GET',
    path: '/api/v1/internet/delivery/track/:id',
    auth: true,
    handle: async (c) => {
      try {
        return json(ok(trackDelivery(c.params.id), '配送追踪已加载'));
      } catch (err) {
        return mapFlowError(err, c);
      }
    },
  },
];
