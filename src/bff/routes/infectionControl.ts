/**
 * 健澜科技 jlmedaios - 医院感染控制 BFF 路由（M141-D，管理驾驶舱）
 *
 * 【质量与安全】实时预警，不能等爆发了才发现：
 *   GET  /api/v1/admin/infection/events  院感上报事件台账 + 聚集预警总览（仅 admin）
 *   POST /api/v1/admin/infection/report  一线上报一例院感，落账即判 24h 聚集预警
 *
 * 业务规则全部下沉到纯函数 reportInfection / trackInfectionSpread，本路由只做
 *   鉴权（requireRole admin）、入参校验与数据装配；不读库、不发请求、不触碰 WebSocket。
 * 当前接入进程级事件日志（灰度/演示，后续替换为 clinical.infection_control_event 真实
 *   落库，函数签名与路由契约不变）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  generateInfectionReport,
  listInfectionEvents,
  reportInfection,
  trackInfectionSpread,
  TYPE_LABEL,
  type InfectionEvent,
  type InfectionSource,
  type InfectionType,
} from '../aggregators/infectionControlAggregator.js';

const VALID_TYPES: readonly InfectionType[] = ['ssi', 'clabsi', 'vap', 'mdro'];
const VALID_SOURCES: readonly InfectionSource[] = ['nurse', 'doctor', 'microbiology', 'surveillance', 'other'];

/**
 * GET /api/v1/admin/infection/events
 * 院感事件台账 + 各科室近 7 天聚集预警总览（实时，不等暴发）。
 */
async function handleListEvents(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const events = listInfectionEvents();

    // 近 7 天聚集传播预警：对出现过的每个科室各做一次回看
    const depts = [...new Set(events.map((e) => e.dept))];
    const spread: ReturnType<typeof trackInfectionSpread>[] = depts.map((d) =>
      trackInfectionSpread(d, 7),
    );
    const alerts = spread.flat();

    // 本期（当月）月报摘要
    const period = new Date().toISOString().slice(0, 7);
    const monthly = generateInfectionReport(period);

    return json(
      ok({
        generatedAt: new Date().toISOString(),
        period,
        totalEvents: events.length,
        autoAlertCount: events.filter((e) => e.autoAlert).length,
        events,
        spreadAlerts: alerts,
        monthlySummary: monthly,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '院感事件台账查询失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

/** POST /report 入参 */
interface ReportBody {
  patientId?: string;
  dept?: string;
  type?: string;
  source?: string;
}

/**
 * POST /api/v1/admin/infection/report
 * 上报一例院感，落账即实时判定同科室同类型 24h 聚集预警。
 */
async function handleReport(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const body = await c.body<ReportBody>();
    const patientId = (body.patientId ?? '').trim();
    const dept = (body.dept ?? '').trim();
    const type = (body.type ?? '').trim() as InfectionType;
    const source = ((body.source ?? 'nurse').trim() || 'nurse') as InfectionSource;

    if (!patientId) {
      return json(fail(ErrorCode.BAD_REQUEST, 'patientId 不能为空', c.traceId), 400);
    }
    if (!dept) {
      return json(fail(ErrorCode.BAD_REQUEST, 'dept（科室）不能为空', c.traceId), 400);
    }
    if (!VALID_TYPES.includes(type)) {
      return json(
        fail(ErrorCode.BAD_REQUEST, `type 必须为 ${VALID_TYPES.join('/')}`, c.traceId),
        400,
      );
    }
    if (!VALID_SOURCES.includes(source)) {
      return json(
        fail(ErrorCode.BAD_REQUEST, `source 必须为 ${VALID_SOURCES.join('/')}`, c.traceId),
        400,
      );
    }

    // 【质量与安全】登记即实时预警判定
    const event: InfectionEvent = reportInfection(patientId, dept, type, source);

    // 本次上报后，该科室近 24h 聚集是否升级（供前端即时提示）
    const immediateAlerts = trackInfectionSpread(dept, 1).filter(
      (a) => a.type === type,
    );

    return json(
      ok(
        {
          event,
          typeLabel: TYPE_LABEL[type],
          // 【质量与安全】autoAlert=true 即实时聚集预警，前端立即红色提示
          autoAlert: event.autoAlert,
          immediateAlerts,
          message: event.autoAlert
            ? `${dept}「${TYPE_LABEL[type]}」24h 内已达 2 例，自动聚集预警，请院感科立即介入`
            : `${TYPE_LABEL[type]} 已登记，持续监测同科室同类型聚集`,
        },
        '院感事件已上报',
        c.traceId,
      ),
      201,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '院感事件上报失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const infectionControlRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/infection/events',
    auth: true,
    handle: handleListEvents,
  },
  {
    method: 'POST',
    path: '/api/v1/admin/infection/report',
    auth: true,
    handle: handleReport,
  },
];
