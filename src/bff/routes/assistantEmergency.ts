/**
 * 健澜科技 jlmedaios - 急诊分诊智能助手 BFF 路由（M121-A，依据宪法第七章 Doctor MUSE）
 *
 * GET /api/v1/assistant/emergency?patientId=xxx[&level=1]
 *   急诊分诊台右侧智能面板：既往史匹配 + 相似病例经验 + 分级校核建议 + 处置去向。
 *
 * 仅登录鉴权（auth:true），不新增权限码、不触碰 WebSocket。
 * 依据宪法第七章：doctorId 取当前登录医生，输出不含明文患者标识（聚合器内已脱敏）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView } from '../aggregators/emergencyTriageAssistantAggregator.js';

export const assistantEmergencyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/assistant/emergency',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const patientId = c.query.get('patientId')?.trim() ?? '';
      if (!patientId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 patientId 参数'), 400);
      }
      // level 缺省为 3（Ⅲ级·急症）；越界值由聚合器归一化兜底，此处不拒请求
      const levelRaw = c.query.get('level')?.trim() || '3';
      try {
        const view = await listView(c.user.id, patientId, levelRaw);
        return json(ok(view));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '急诊智能助手加载失败'),
          500,
        );
      }
    },
  },
];
