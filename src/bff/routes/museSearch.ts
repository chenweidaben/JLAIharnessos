/**
 * 健澜科技 jlmedaios - 全院知识检索路由（M115-D，依据宪法第七章）
 *
 * GET /api/v1/muse/search?q=keyword&role=doctor&dept=cardio：
 *   在医院层知识库（已脱敏、已标注来源）中按关键词检索，叠加来源角色与科室
 *   双维度过滤；失败经验（教训）置顶返回。
 *
 * 医疗安全（依据宪法第七章）：本端点只读；检索为辅助参考，不改变医嘱、
 * 不强制改派诊疗方案。权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  buildDefaultHospitalKnowledge,
  searchHospitalKnowledge,
  type HospitalSearchResponse,
} from '../aggregators/hospitalSearchAggregator';

export const museSearchRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/search',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;

      const q = c.query.get('q') ?? '';
      const role = c.query.get('role') ?? undefined;
      const dept = c.query.get('dept') ?? undefined;

      try {
        // 真实环境替换为医院层 muse 持久层读取；此处使用确定性种子（依据宪法第七章）
        const allKnowledge = buildDefaultHospitalKnowledge();
        const results = searchHospitalKnowledge(q, role, dept, allKnowledge);

        const payload: HospitalSearchResponse = {
          query: q,
          role: role as HospitalSearchResponse['role'],
          dept: dept?.trim() || undefined,
          total: results.length,
          results,
        };
        return json(ok(payload));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '全院知识检索失败'),
          500,
        );
      }
    },
  },
];
