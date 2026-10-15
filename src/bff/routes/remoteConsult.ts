/**
 * 健澜科技 jlmedaios - 远程会诊路由（M143-B · 互联网医院与远程医疗）
 *
 * 【互联网医院与远程医疗】三类会诊统一闭环：
 *   POST /api/v1/remote-consult/request
 *       发起会诊。Body: { reqDept, reqDoctor, patientId, reason,
 *                         expertHospital?, expertDoctor }。
 *       院内多学科（expertHospital 留空）/ 院间远程 / 国际远程自动判别；
 *       reason 含「急」即急会诊，2 小时内必须有专家接受。
 *   PUT  /api/v1/remote-consult/:id/accept
 *       受邀专家接受会诊。Body: { expertDoctor }。
 *       MDT 逐位接受，全部接受后整体进入 accepted；院间 / 国际接受即 accepted。
 *   PUT  /api/v1/remote-consult/:id/report
 *       受邀专家提交会诊报告。Body: { report }。须先 accepted。
 *
 * 鉴权：未登录 401 / admin 放行 / 其余需显式权限码——
 *   remote_consult:request（申请）、remote_consult:accept（接受）、
 *   remote_consult:report（报告）、remote_consult:view（列表只读），否则 403。
 *
 * 生产安全：入参非法一律 400 结构化错误信封，不抛 500；
 *   落库 best-effort，断库不阻断会诊主流程。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  acceptRemoteConsultation,
  listRemoteConsults,
  persistConsult,
  requestRemoteConsultation,
  submitRemoteReport,
} from '../aggregators/remoteConsultAggregator';

/** 发起会诊请求体 */
interface RequestBody {
  reqDept?: unknown;
  reqDoctor?: unknown;
  patientId?: unknown;
  reason?: unknown;
  expertHospital?: unknown;
  expertDoctor?: unknown;
}

/** 接受会诊请求体 */
interface AcceptBody {
  expertDoctor?: unknown;
}

/** 提交报告请求体 */
interface ReportBody {
  report?: unknown;
}

function toStr(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export const remoteConsultRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/remote-consult/request',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'remote_consult:request');
      if (denied) return denied;

      let body: RequestBody;
      try {
        body = await c.body<RequestBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      try {
        const consult = requestRemoteConsultation(
          toStr(body.reqDept),
          toStr(body.reqDoctor),
          toStr(body.patientId),
          toStr(body.reason),
          toStr(body.expertHospital),
          toStr(body.expertDoctor),
        );
        await persistConsult(consult);
        return json(ok({ consult }, '会诊申请已提交'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '会诊申请失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'PUT',
    path: '/api/v1/remote-consult/:id/accept',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'remote_consult:accept');
      if (denied) return denied;

      const consultId = toStr(c.params.id);
      let body: AcceptBody;
      try {
        body = await c.body<AcceptBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      try {
        const consult = acceptRemoteConsultation(consultId, toStr(body.expertDoctor));
        await persistConsult(consult);
        return json(ok({ consult }, '会诊已接受'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '接受会诊失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'PUT',
    path: '/api/v1/remote-consult/:id/report',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'remote_consult:report');
      if (denied) return denied;

      const consultId = toStr(c.params.id);
      let body: ReportBody;
      try {
        body = await c.body<ReportBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      try {
        const consult = submitRemoteReport(consultId, toStr(body.report));
        await persistConsult(consult);
        return json(ok({ consult }, '会诊报告已提交'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '提交会诊报告失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/remote-consult/list',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'remote_consult:view');
      if (denied) return denied;

      try {
        const consults = listRemoteConsults();
        return json(ok({ consults }, '会诊单已加载'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '会诊单加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
