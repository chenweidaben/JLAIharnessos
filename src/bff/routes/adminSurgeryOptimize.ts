/**
 * 健澜科技 jlmedaios - M130-D 手术排班优化 BFF 路由（运营调度）
 *
 * POST /api/v1/admin/surgery/schedule/optimize
 *  - 入参：{ requests, availableRooms, surgeonAvailability }（见聚合器类型）；
 *  - 出参：{ assignments, unassigned, conflicts, metrics } 纯计算结果；
 *  - 权限守卫：未登录 401 / admin 放行 / 其余需 surgery:schedule:optimize；
 *  - 本路由仅做计算不落库，确认后排班结果由后续写接口落 clinical.surgery_schedule。
 *
 * 生产安全：
 *  - 纯函数计算，无数据库副作用，失败回 400 结构化信封；
 *  - 不暴露患者 PII，仅传申请 id / 术式 / 科室 / 医生 id；
 *  - 急诊优先 / 医生不冲突 / 同类集中 由聚合器保证，路由不重复实现。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  optimizeSurgerySchedule,
  type AvailableRoom,
  type ScheduleRequestInput,
  type SurgeonBusyWindow,
} from '../aggregators/surgeryScheduleAggregator';

interface OptimizeBody {
  requests?: ScheduleRequestInput[];
  availableRooms?: AvailableRoom[];
  surgeonAvailability?: SurgeonBusyWindow[];
}

export const adminSurgeryOptimizeRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/admin/surgery/schedule/optimize',
    handle: async (c: Ctx): Promise<Response> => {
      // 业务权限守卫：未登录 401 / admin 放行 / 其余需显式权限码
      const denied = requirePermissionCode(c, 'surgery:schedule:optimize');
      if (denied) return denied;

      try {
        const body = await c.body<OptimizeBody>();
        const requests = Array.isArray(body?.requests) ? body.requests : [];
        const availableRooms = Array.isArray(body?.availableRooms) ? body.availableRooms : [];
        const surgeonAvailability = Array.isArray(body?.surgeonAvailability)
          ? body.surgeonAvailability
          : [];

        if (requests.length === 0) {
          return json(
            fail(ErrorCode.BAD_REQUEST, 'requests 不能为空', c.traceId),
            400,
          );
        }
        if (availableRooms.length === 0) {
          return json(
            fail(ErrorCode.BAD_REQUEST, 'availableRooms 不能为空', c.traceId),
            400,
          );
        }

        const result = optimizeSurgerySchedule(requests, availableRooms, surgeonAvailability);
        return json(ok(result, 'ok', c.traceId));
      } catch (err) {
        const message = err instanceof Error ? err.message : '手术排班优化计算失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
    auth: true,
  },
];
