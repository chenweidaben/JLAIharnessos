/**
 * 健澜科技 jlmedaios - 【患者服务深化】一站式服务中心路由（M156-D）
 *
 * 集团与科研：
 *   GET /api/v1/patient/service?patientId=xxx
 *       → 患者一站式服务全集（六大卡片 / 院内导航 / 健康档案 / 急诊提示）；
 *   GET /api/v1/patient/service?patientId=xxx&condition=头痛头晕
 *       → 附加智能导诊推荐医生列表（症状 → 科室 → 医生）。
 *
 * 老人友好：一屏六张大卡片，大字、大按钮，不藏二级菜单。
 * 鉴权：未登录 401。生产安全：出参 patientId 已脱敏（P0****23），
 *   不暴露患者级 PII；入参非法一律 400 结构化错误信封，不抛 500；
 *   落库 best-effort，断库不阻断主流程。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildPatientFullService,
  persistServiceAction,
  recommendDoctor,
  type Doctor,
  type FullService,
} from '../aggregators/patientServiceDeepAggregator';

export const patientServiceDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/service',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const patientId = c.query.get('patientId') ?? '';
      if (!patientId) {
        return json(fail(ErrorCode.BAD_REQUEST, '患者标识 patientId 不能为空', c.traceId), 400);
      }

      try {
        // 【患者服务深化】构建一站式服务全集（纯函数，老人友好一屏）
        const service: FullService = buildPatientFullService(patientId);

        // 可选：带 condition 时附加智能导诊推荐医生
        const condition = c.query.get('condition') ?? '';
        let doctors: Doctor[] = [];
        if (condition) {
          doctors = recommendDoctor(patientId, condition);
        }

        // best-effort 落库本次服务浏览（断库降级，不阻断）
        await persistServiceAction(patientId, 'appointment', '', 'service-center', {
          cards: service.cards.length,
          hasCondition: Boolean(condition),
          doctorCount: doctors.length,
        });

        return json(
          ok({ service, doctors }, '患者服务中心已加载'),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : '患者服务中心加载失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
