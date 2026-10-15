/**
 * 健澜科技 jlmedaios - 转诊协同知识沉淀 BFF 路由（依据宪法第三章）
 *
 * GET /api/v1/referral/knowledge?reason=xxx：
 *   按转诊原因返回历史最佳转往科室推荐——从 medmuse.referral_knowledge 读取
 *   沉淀（哪种转诊原因最常被哪个科室成功接住、平均几天闭环），按成功率降序、
 *   平均耗时升序排序后返回。
 *
 * 医疗安全：本端点只读；推荐为辅助建议，最终转往科室由接诊医师与患方共同确认。
 * 权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { getReferralKnowledgeView } from '../aggregators/referralKnowledgeAggregator';

export const referralKnowledgeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/referral/knowledge',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;
      const reason = c.query.get('reason') ?? '';
      if (!reason) {
        return json(fail(ErrorCode.BAD_REQUEST, '查询参数 reason 不能为空'), 400);
      }
      try {
        const data = await getReferralKnowledgeView(reason);
        return json(ok(data));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '转诊知识推荐加载失败'),
          500,
        );
      }
    },
  },
];
