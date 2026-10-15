/**
 * 健澜科技 jlmedaios - 护理工作台「越用越准」风险模式 BFF 路由（依据宪法第四章）
 *
 * GET /api/v1/nursing/ward/:id/risk-patterns：
 *   返回本周重点风险患者——按历史频次 × 平均严重度 × 近因衰减 × 在院画像命中
 *   排序后的风险模式，供护理工作台巡视/排班参考。
 *
 * 医疗安全：本端点只读；排序结果为辅助决策，最终处置由责任护士本人判断执行。
 * 权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { listWardFocusRisks } from '../aggregators/nursingRiskPatternAggregator';

export const nursingRiskPatternRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nursing/ward/:id/risk-patterns',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;
      const wardId = c.params.id;
      if (!wardId) return json(fail(ErrorCode.BAD_REQUEST, '病区 ID 不能为空'), 400);
      try {
        const data = await listWardFocusRisks(wardId);
        return json(ok(data));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '护理风险模式加载失败'),
          500,
        );
      }
    },
  },
];
