/**
 * 健澜科技 jlmedaios - 【AI深化与智能运营】患者全旅程路由（M168-C）
 *
 * 患者旅程要真实，不能虚构：
 *   GET /api/v1/patient/journey/:patientId?from=&to=
 *     → 一次返回患者全旅程四件套：
 *       时间线 buildPatientJourney（八节点到达/等待/服务时长）、
 *       瓶颈识别 identifyJourneyBottleneck（超门诊基准的环节排序）、
 *       流程优化 optimizePatientFlow（可落地动作 + 预计释放等待）、
 *       满意度预测 predictPatientSatisfaction（分数/档位/投诉风险）。
 *
 * 鉴权：未登录 401。入参非法一律 400 结构化错误信封，不抛 500。
 * 节点事件落内存台账（断库时旅程页仍可真实回读；接入 PG 后
 * best-effort 回写 medmuse.patient_journey_event）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  SEED_JOURNEY_EVENTS,
  buildPatientJourney,
  defaultPeriod,
  identifyJourneyBottleneck,
  optimizePatientFlow,
  predictPatientSatisfaction,
  type JourneyPeriod,
  type PatientJourneyEvent,
} from '../aggregators/patientJourneyAggregator';

/**
 * 内存旅程事件台账：BFF 进程启动时由种子事件初始化；
 * 导诊/随访登记节点时原地追加（断库亦可真实回放）。
 */
const journeyLedger: PatientJourneyEvent[] = [...SEED_JOURNEY_EVENTS];

/** 解析时段参数：缺省锚定当前时间最近 30 天；非法日期一律 400 */
function resolvePeriod(c: Ctx): { period: JourneyPeriod } | { error: string } {
  const fromRaw = c.query.get('from') ?? '';
  const toRaw = c.query.get('to') ?? '';

  if (!fromRaw && !toRaw) {
    return { period: defaultPeriod(new Date().toISOString()) };
  }
  if (!fromRaw || !toRaw) {
    return { error: 'from 与 to 必须同时提供（ISO 日期）' };
  }
  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return { error: 'from/to 不是合法 ISO 日期' };
  }
  if (from.getTime() > to.getTime()) {
    return { error: 'from 不能晚于 to' };
  }
  return { period: { from: from.toISOString(), to: to.toISOString() } };
}

export const patientJourneyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/journey/:patientId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const patientId = (c.params.patientId ?? '').trim();
      if (!patientId) {
        return json(fail(ErrorCode.BAD_REQUEST, 'patientId 不能为空', c.traceId), 400);
      }

      const resolved = resolvePeriod(c);
      if ('error' in resolved) {
        return json(fail(ErrorCode.BAD_REQUEST, resolved.error, c.traceId), 400);
      }

      try {
        // 【AI深化与智能运营】四件套一次返回，纯函数不触库
        const journey = buildPatientJourney(patientId, resolved.period, journeyLedger);
        const bottlenecks = identifyJourneyBottleneck(patientId, resolved.period, journeyLedger);
        const optimization = optimizePatientFlow(journey);
        const satisfaction = predictPatientSatisfaction(journey);

        return json(
          ok(
            {
              patientId,
              journey,
              bottlenecks,
              optimization,
              satisfaction,
            },
            '患者全旅程已加载（八节点时间线 + 瓶颈 + 优化 + 满意度预测）',
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : '患者全旅程加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
