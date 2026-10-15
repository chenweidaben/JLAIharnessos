/**
 * 健澜科技 jlmedaios - 跨科室知识联邦推荐路由（依据宪法第三章）
 *
 * GET /api/v1/dept/:code/related-knowledge?type=pathway：
 *   当前科室在某知识类型上沉淀不足时，自动从 DEPT_SIMILARITY 关联科室
 *   联邦拉取高成功率知识（按采纳成功率降序），供主管医师跨科参考。
 *
 * 医疗安全（依据宪法第三章）：本端点只读；推荐为辅助建议，
 * 最终诊疗决策由主管医师作出并签名负责。权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { getCrossDeptKnowledgeView } from '../aggregators/crossDeptKnowledgeAggregator';

export const crossDeptKnowledgeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/dept/:code/related-knowledge',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;
      const code = c.params.code ?? '';
      if (!code) {
        return json(fail(ErrorCode.BAD_REQUEST, '路径参数 code 不能为空'), 400);
      }
      try {
        const data = await getCrossDeptKnowledgeView(code, c.query.get('type') ?? undefined);
        return json(ok(data));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '跨科室知识推荐加载失败'),
          500,
        );
      }
    },
  },
];
