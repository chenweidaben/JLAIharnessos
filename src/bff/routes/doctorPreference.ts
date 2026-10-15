/**
 * 健澜科技 jlmedaios - 门诊医生工作台「越用越懂医生」偏好 BFF 路由
 *
 * 依据宪法第四章（医生工作台智能化）：
 *  - GET  /api/v1/doctors/:id/preference
 *      返回该医生已沉淀的学习偏好（常用药品 / 检查检验 / 临床路径 TOP5）；
 *      无记录时返回空偏好兜底视图，不抛 404。
 *  - POST /api/v1/doctors/:id/preference/refresh
 *      触发后台异步重算（fire-and-forget）：立即 202 受理，
 *      重算在后台 best-effort 执行，失败仅告警、不影响响应。
 *
 * 权限：medmuse:view（仅医生 / 护士 / 药师 / 管理员；Agent 服务账号不授予）。
 * 不触碰 WebSocket，不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import {
  getStoredPreference,
  rebuildStoredPreference,
} from '../aggregators/doctorPreferenceAggregator.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 空偏好兜底视图（无学习记录 / 断库时返回） */
function emptyView(doctorId: string) {
  return {
    doctorId,
    learned: false,
    preferredDrugs: [] as const,
    preferredExams: [] as const,
    commonPathways: [] as const,
    avgVisitMinutes: null,
    visitCount: 0,
    updatedAt: new Date().toISOString(),
  };
}

export const doctorPreferenceRoutes: RouteDef[] = [
  {
    // GET /api/v1/doctors/:id/preference — 查看医生学习偏好
    method: 'GET',
    path: '/api/v1/doctors/:id/preference',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;

      const doctorId = (c.params.id ?? '').trim();
      if (!doctorId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少医生ID', c.traceId), 400);
      }

      try {
        const stored = await getStoredPreference(doctorId);
        if (!stored) return json(ok(emptyView(doctorId)));
        return json(ok({ ...stored, learned: true }));
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : '医生偏好加载失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },

  {
    // POST /api/v1/doctors/:id/preference/refresh — 触发后台异步重算
    method: 'POST',
    path: '/api/v1/doctors/:id/preference/refresh',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;

      const doctorId = (c.params.id ?? '').trim();
      if (!doctorId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少医生ID', c.traceId), 400);
      }

      // fire-and-forget：立即受理，重算在后台执行，异常仅告警不影响响应
      void rebuildStoredPreference(doctorId).catch((err: unknown) => {
        console.warn(
          '[doctor-preference] 后台重算异常:',
          err instanceof Error ? err.message : err,
        );
      });

      return json(
        ok(
          { doctorId, queued: true },
          '偏好重算已排入后台',
        ),
        202,
      );
    },
  },
];
