/**
 * 健澜科技 jlmedaios - 门诊医生智能助手 BFF 路由（依据宪法第七章 Doctor MUSE 医生个人智能体）
 *
 * GET /api/v1/assistant/outpatient?patientId=xxx[&deptCode=yyy]
 *   门诊开诊右侧轻量助手面板：患者摘要 + 相似病例经验推荐 + 科室路径 + 安全预警。
 *
 * 仅登录鉴权（auth:true），不新增权限码、不触碰 WebSocket。
 * 依据宪法第七章：doctorId 取当前登录医生，输出不含明文患者标识（聚合器内已脱敏）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView } from '../aggregators/outpatientAssistantAggregator.js';

export const assistantOutpatientRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/assistant/outpatient',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const patientId = c.query.get('patientId')?.trim() ?? '';
      if (!patientId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 patientId 参数'), 400);
      }
      const deptCode = c.query.get('deptCode')?.trim() || undefined;
      try {
        const view = await listView(c.user.id, patientId, deptCode);
        return json(ok(view));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '门诊智能助手加载失败'),
          500,
        );
      }
    },
  },
];
