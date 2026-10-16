/**
 * 健澜科技 jlmedaios — 【科研教学后勤】医院后勤智能化深化路由（M171-C）
 *
 *   POST /api/v1/logistics/deep-dispatch
 *       body: {
 *         tasks?: LogisticsTask[];          // 待派工单（维修/被服/餐饮/保洁可混排）
 *         resources?: LogisticsResource[];     // 在岗后勤人员
 *         constraints?: Partial<LogisticsConstraints>;
 *         vehicles?: Vehicle[];              // 配送车辆（路线优化）
 *         demandPeriods?: DemandPeriod[];     // 待预测时段
 *         seasonality?: Seasonality;          // 季节/趋势系数
 *         completedTasks?: CompletedTask[];   // 已完工工单（满意度）
 *         feedback?: TaskFeedback[];          // 反馈
 *       }
 *
 * 薄壳路由：业务规则全部在 aggregators/logisticsDeepAggregator.ts 纯函数层。
 * 本切片不写 SQL、不触库、不新增表；不触碰 WebSocket；不新增依赖。
 * 缺哪段输入就不跑哪段；完全无 tasks 时返回 400。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  deepLogisticsDispatch,
  optimizeLogisticsRoute,
  predictLogisticsDemand,
  trackLogisticsSatisfaction,
  type CompletedTask,
  type DemandPeriod,
  type LogisticsConstraints,
  type LogisticsResource,
  type LogisticsTask,
  type Seasonality,
  type TaskFeedback,
  type Vehicle,
} from '../aggregators/logisticsDeepAggregator';

interface DeepDispatchBody {
  tasks?: LogisticsTask[];
  resources?: LogisticsResource[];
  constraints?: Partial<LogisticsConstraints>;
  vehicles?: Vehicle[];
  demandPeriods?: DemandPeriod[];
  seasonality?: Seasonality;
  completedTasks?: CompletedTask[];
  feedback?: TaskFeedback[];
}

/** 默认约束：单人每班 8 单、步行 60 米/分 */
const DEFAULT_CONSTRAINTS: LogisticsConstraints = {
  maxLoadPerResource: 8,
  speedMpm: 60,
  linenCategory: 'bed_linen',
};

export const logisticsDeepRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/logistics/deep-dispatch',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const body = await c.body<DeepDispatchBody>().catch(() => ({} as DeepDispatchBody));

      const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
      const resources = Array.isArray(body?.resources) ? body.resources : [];

      if (tasks.length === 0) {
        return json(
          fail(ErrorCode.BAD_REQUEST, 'tasks 不能为空（后勤工单数组）', c.traceId),
          400,
        );
      }

      try {
        const constraints: LogisticsConstraints = {
          ...DEFAULT_CONSTRAINTS,
          ...(body?.constraints ?? {}),
        };

        // 1) 深度派单（有人员才跑）
        const dispatch = resources.length > 0
          ? deepLogisticsDispatch(tasks, resources, constraints)
          : null;

        // 2) 路线优化（有车辆才跑；被服/餐饮类配送任务参与）
        const vehicles = Array.isArray(body?.vehicles) ? body.vehicles : [];
        const route = vehicles.length > 0
          ? optimizeLogisticsRoute(tasks, vehicles)
          : null;

        // 3) 需求预测（有基期时段才跑）
        const demandPeriods = Array.isArray(body?.demandPeriods) ? body.demandPeriods : [];
        const demand = demandPeriods.length > 0
          ? predictLogisticsDemand(demandPeriods, body?.seasonality ?? { factors: {} })
          : null;

        // 4) 满意度跟踪（有完工工单才跑）
        const completedTasks = Array.isArray(body?.completedTasks) ? body.completedTasks : [];
        const feedback = Array.isArray(body?.feedback) ? body.feedback : [];
        const satisfaction = completedTasks.length > 0
          ? trackLogisticsSatisfaction(completedTasks, feedback)
          : null;

        return json(ok({
          summary: {
            taskCount: tasks.length,
            resourceCount: resources.length,
            assignedCount: dispatch?.assignments.length ?? 0,
            unassignedCount: dispatch?.unassigned.length ?? 0,
          },
          dispatch,
          route,
          demand,
          satisfaction,
          generatedAt: new Date().toISOString(),
        }));
      } catch (err) {
        console.error(`[logisticsDeep] POST /deep-dispatch [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '后勤调度计算失败', c.traceId),
          500,
        );
      }
    },
  },
];
