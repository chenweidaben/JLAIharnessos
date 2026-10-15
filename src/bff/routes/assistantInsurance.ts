/**
 * 健澜科技 jlmedaios - 医保控费智能提醒 BFF 路由（M121-D）
 *
 * GET /api/v1/assistant/insurance?prescriptionId=xxx
 *   医生开方侧事前医保合规扫描：合规结论 + 医保支付限制 + 历史违规 + 替代方案。
 *
 * 仅登录鉴权（auth:true），不新增权限码、不触碰 WebSocket。
 * 依据宪法：doctorId 取当前登录医生，输出不含明文患者标识（聚合器内已脱敏）；
 * 本路由为只读提醒，不阻断处方、不改变结算状态。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { listView } from '../aggregators/insuranceComplianceAggregator.js';

export const assistantInsuranceRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/assistant/insurance',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const prescriptionId = c.query.get('prescriptionId')?.trim() ?? '';
      if (!prescriptionId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 prescriptionId 参数'), 400);
      }
      // patientId 当前由演示数据兜底；真实接入时由处方 -> 就诊 -> 患者链路装载
      const patientId = c.query.get('patientId')?.trim() || '';
      try {
        const view = await listView(c.user.id, prescriptionId, patientId);
        return json(ok(view));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '医保合规提醒加载失败'),
          500,
        );
      }
    },
  },
];
