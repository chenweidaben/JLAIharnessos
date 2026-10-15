/**
 * 健澜科技 jlmedaios - 互联网医院在线问诊路由（M143-A · 互联网医院与远程医疗）
 *
 * 【互联网医院与远程医疗】在线问诊三入口：
 *   POST /api/v1/consult/create
 *       患者发起问诊。body: { patientId, doctorId?(可空=公共候诊), dept, symptoms, mode? }
 *       返回创建后的问诊单（status=pending 待接单）。
 *   PUT  /api/v1/consult/:id/accept
 *       医师接单。body: { doctorId }。接单即起算 30 分钟倒计时（deadlineAt）。
 *   PUT  /api/v1/consult/:id/end
 *       医师结束问诊。body: { summary }。若此刻已越 30 分钟，
 *       由聚合器自动判 timeout 关单并回写实际时长。
 *
 * 鉴权：未登录 401 / admin 放行 / 其余需显式权限码
 *   consult:create（发起）、consult:accept（接单）、consult:end（结束），否则 403。
 *
 * 生产安全：入参非法一律 400 结构化错误信封，不抛 500；
 *   落库 best-effort，断库不阻断问诊主流程。
 *   不触碰 WebSocket（前端本地倒计时 + 动作后刷新，长连接不在本期范围）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  acceptConsultation,
  createConsultation,
  endConsultation,
  persistConsult,
  sweepTimeouts,
  type ConsultMode,
} from '../aggregators/onlineConsultAggregator';

/** 发起问诊请求体 */
interface CreateBody {
  patientId?: unknown;
  doctorId?: unknown;
  dept?: unknown;
  symptoms?: unknown;
  mode?: unknown;
}

/** 接单请求体 */
interface AcceptBody {
  doctorId?: unknown;
}

/** 结束问诊请求体 */
interface EndBody {
  summary?: unknown;
}

function asMode(v: unknown): ConsultMode {
  const m = typeof v === 'string' ? v.trim() : '';
  if (m === 'image' || m === 'video') return m;
  return 'text';
}

export const onlineConsultRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/consult/create',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'consult:create');
      if (denied) return denied;

      let body: CreateBody;
      try {
        body = await c.body<CreateBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : '';
      const doctorId = typeof body.doctorId === 'string' ? body.doctorId.trim() : '';
      const dept = typeof body.dept === 'string' ? body.dept.trim() : '';
      const symptoms = typeof body.symptoms === 'string' ? body.symptoms.trim() : '';

      try {
        const consult = createConsultation(patientId, doctorId, dept, symptoms, asMode(body.mode));
        await persistConsult(consult);
        return json(ok({ consult }, '问诊已提交，等待医师接单'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '问诊提交失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'PUT',
    path: '/api/v1/consult/:id/accept',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'consult:accept');
      if (denied) return denied;

      const consultId = (c.params.id || '').trim();
      if (!consultId) {
        return json(fail(ErrorCode.BAD_REQUEST, '路径参数 id 不能为空', c.traceId), 400);
      }

      let body: AcceptBody;
      try {
        body = await c.body<AcceptBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }
      const doctorId = typeof body.doctorId === 'string' ? body.doctorId.trim() : '';

      try {
        const consult = acceptConsultation(consultId, doctorId);
        await persistConsult(consult);
        return json(ok({ consult }, '接单成功，已起算 30 分钟问诊时长'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '接单失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'PUT',
    path: '/api/v1/consult/:id/end',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'consult:end');
      if (denied) return denied;

      const consultId = (c.params.id || '').trim();
      if (!consultId) {
        return json(fail(ErrorCode.BAD_REQUEST, '路径参数 id 不能为空', c.traceId), 400);
      }

      let body: EndBody;
      try {
        body = await c.body<EndBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }
      const summary = typeof body.summary === 'string' ? body.summary.trim() : '';

      try {
        // 结束前先巡检一次超时单（30 分钟未结束自动关单）
        await Promise.all(sweepTimeouts().map((s) => persistConsult(s)));
        const consult = endConsultation(consultId, summary);
        await persistConsult(consult);
        const notice =
          consult.endReason === 'timeout' ? '问诊已超 30 分钟，系统自动结束关单' : '问诊已结束';
        return json(ok({ consult }, notice));
      } catch (err) {
        const message = err instanceof Error ? err.message : '结束问诊失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
