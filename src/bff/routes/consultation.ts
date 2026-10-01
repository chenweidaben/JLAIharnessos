/**
 * 健澜科技 jlmedaios - 互联网问诊 BFF 路由（M3-K）
 *
 * 患者端（发起/列表/详情/消息/取消）与医生端（待接诊/我的会话/接诊/消息/结束）。
 * 患者使用患者 JWT（roles=['patient']），医生使用权限码 internet:consultation。
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
  ConsultationError,
  startConsultation,
  listMySessions,
  listDoctorsForPatient,
  getMySession,
  patientSendMessage,
  patientCancel,
  listPending,
  listDoctorSessions,
  acceptSession,
  doctorSendMessage,
  completeSession,
} from '../aggregators/consultationAggregator';

function mapError(err: unknown, c: Ctx): Response {
  if (err instanceof ConsultationError) {
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
  // 非业务错误：服务端记录完整错误（含 traceId），客户端仅返回通用文案（等保三级）。
  console.error(`[bff error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
  return json(
    fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
    500,
  );
}

/** 患者鉴权：返回 accountId */
function patientGuard(c: Ctx): string | Response {
  const denied = requireRole(c, 'patient');
  if (denied) return denied;
  return c.user!.id;
}

/** 医生鉴权：权限码，返回 userId */
function doctorGuard(c: Ctx): string | Response {
  const denied = requirePermissionCode(c, 'internet:consultation');
  if (denied) return denied;
  return c.user!.id;
}

export const consultationRoutes: RouteDef[] = [
  /* ============================ 患者端 ============================ */

  // 发起复诊问诊
  {
    method: 'POST',
    path: '/api/v1/internet/consultation/start',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const body = await c.body<{
          profileId: string;
          doctorId: string;
          chiefComplaint?: string;
        }>();
        return json(ok(await startConsultation(guard, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 可问诊医生列表（患者端）
  {
    method: 'GET',
    path: '/api/v1/internet/consultation/doctors',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        return json(
          ok(await listDoctorsForPatient(c.query.get('department') ?? undefined)),
        );
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 我的会话列表
  {
    method: 'GET',
    path: '/api/v1/internet/consultation/sessions',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        return json(ok(await listMySessions(guard)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 会话详情（含消息）
  {
    method: 'GET',
    path: '/api/v1/internet/consultation/sessions/:id',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        return json(ok(await getMySession(guard, c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 患者发送消息
  {
    method: 'POST',
    path: '/api/v1/internet/consultation/sessions/:id/messages',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const body = await c.body<{ content: string; msgType?: 'text' | 'image' }>();
        return json(ok(await patientSendMessage(guard, c.params.id, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 患者取消会话
  {
    method: 'POST',
    path: '/api/v1/internet/consultation/sessions/:id/cancel',
    handle: async (c) => {
      const guard = patientGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const body = await c.body<{ reason?: string }>();
        return json(ok(await patientCancel(guard, c.params.id, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },

  /* ============================ 医生端 ============================ */

  // 待接诊队列
  {
    method: 'GET',
    path: '/api/v1/internet/consultation/pending',
    handle: async (c) => {
      const guard = doctorGuard(c);
      if (guard instanceof Response) return guard;
      try {
        return json(ok(await listPending(c.query.get('department') ?? undefined)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 医生的会话列表
  {
    method: 'GET',
    path: '/api/v1/internet/consultation/doctor/sessions',
    handle: async (c) => {
      const guard = doctorGuard(c);
      if (guard instanceof Response) return guard;
      try {
        return json(
          ok(await listDoctorSessions(guard, (c.query.get('status') as never) ?? undefined)),
        );
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 医生接诊
  {
    method: 'POST',
    path: '/api/v1/internet/consultation/sessions/:id/accept',
    handle: async (c) => {
      const guard = doctorGuard(c);
      if (guard instanceof Response) return guard;
      try {
        return json(ok(await acceptSession(guard, c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 医生发送消息
  {
    method: 'POST',
    path: '/api/v1/internet/consultation/sessions/:id/doctor-messages',
    handle: async (c) => {
      const guard = doctorGuard(c);
      if (guard instanceof Response) return guard;
      try {
        const body = await c.body<{ content: string; msgType?: 'text' | 'image' }>();
        return json(ok(await doctorSendMessage(guard, c.params.id, body)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
  // 医生结束问诊
  {
    method: 'POST',
    path: '/api/v1/internet/consultation/sessions/:id/complete',
    handle: async (c) => {
      const guard = doctorGuard(c);
      if (guard instanceof Response) return guard;
      try {
        return json(ok(await completeSession(guard, c.params.id)));
      } catch (err) {
        return mapError(err, c);
      }
    },
  },
];
