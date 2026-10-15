/**
 * 健澜科技 jlmedaios - 手术安全学习引擎 BFF 路由（依据宪法第四章）
 *
 * GET /api/v1/surgery/safety-patterns?surgeryType=xxx：
 *   返回该术式的术前风险提醒——从 medmuse.surgery_safety_pattern 读取历史沉淀
 *   （哪些术式最易出问题），拼成 Time-out 环节可直接展示的风险点文案。
 *
 * 医疗安全：本端点只读；提醒为辅助复核，最终开台决策由术者本人判断执行。
 * 权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { getPreopSafetyReminder } from '../aggregators/surgerySafetyLearningAggregator';

export const surgerySafetyLearningRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/surgery/safety-patterns',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;
      const surgeryType = c.query.get('surgeryType') ?? '';
      if (!surgeryType) {
        return json(fail(ErrorCode.BAD_REQUEST, '查询参数 surgeryType 不能为空'), 400);
      }
      try {
        const data = await getPreopSafetyReminder(surgeryType);
        return json(ok(data));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '手术安全风险提醒加载失败'),
          500,
        );
      }
    },
  },
];
