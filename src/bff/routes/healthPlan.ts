/**
 * 健澜科技 jlmedaios - 个性化健康计划 BFF 路由（M160-D · 患者健康管理深化）
 *
 *  - GET  /api/v1/patient/health-plan/:patientId
 *      读取某患者的个性化五件套健康计划（运动 / 饮食 / 用药提醒 / 复查 / 红旗症状），
 *      未生成过则按入参 chronicConditions、goals 现生成一份。
 *  - POST /api/v1/patient/health-plan/track
 *      上报一次健康活动（运动分钟 / 饮食依从 / 用药是否按时），返回最新进度与漏药预警。
 *
 * 纯函数聚合，不触碰 WebSocket，不新增依赖。
 * 远期路线图：计划生成后写入 clinical.patient_health_plan 表持久化，并接入医生端审批。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  adjustHealthPlan,
  buildPersonalizedHealthPlan,
  trackHealthProgress,
  type ChronicCondition,
  type HealthActivity,
  type HealthGoal,
} from '../aggregators/healthPlanAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** GET 查询参数：用于首次生成计划 */
interface BuildQuery {
  chronicConditions?: string; // 逗号分隔
  goals?: string; // 逗号分隔
}

/** POST track 请求体 */
interface TrackBody {
  planId?: string;
  activity?: HealthActivity;
  /** 可选：患者反馈，触发动态调整 */
  feedback?: { difficulty: 'too_hard' | 'too_easy' | 'ok'; discomfort?: string; notes?: string };
}

function splitCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const healthPlanRoutes: RouteDef[] = [
  {
    // GET /api/v1/patient/health-plan/:patientId — 读取 / 首次生成个性化计划
    method: 'GET',
    path: '/api/v1/patient/health-plan/:patientId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const patientId = c.params.patientId;
      if (!patientId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 patientId', c.traceId), 400);
      }
      const q = c.query as unknown as BuildQuery;
      const chronicConditions = splitCsv(q.chronicConditions) as ChronicCondition[];
      const goals = splitCsv(q.goals) as HealthGoal[];

      const plan = buildPersonalizedHealthPlan(patientId, chronicConditions, goals);
      return json(ok(plan, 'ok', c.traceId));
    },
  },

  {
    // POST /api/v1/patient/health-plan/track — 进度上报（可选触发动态调整）
    method: 'POST',
    path: '/api/v1/patient/health-plan/track',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: TrackBody | null = null;
      try {
        body = (await c.body()) as TrackBody | null;
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
      }
      if (!body || !body.planId || !body.activity) {
        return json(
          fail(ErrorCode.BAD_REQUEST, '请求体应为 { planId, activity: { type, ... } }', c.traceId),
          400,
        );
      }

      try {
        const tracked = trackHealthProgress(body.planId, body.activity);
        let plan = tracked.plan;

        // 患者反馈 -> 动态调整计划（远期路线图：可由 AI 健康大脑按周主动触发）
        if (body.feedback) {
          plan = adjustHealthPlan(plan.planId, body.feedback);
        }

        return json(
          ok(
            {
              plan,
              progress: tracked.progress,
              alerts: tracked.alerts,
              adjusted: Boolean(body.feedback),
            },
            '进度已记录',
            c.traceId,
          ),
        );
      } catch (e) {
        return json(
          fail(ErrorCode.NOT_FOUND, e instanceof Error ? e.message : '进度记录失败', c.traceId),
          404,
        );
      }
    },
  },
];
