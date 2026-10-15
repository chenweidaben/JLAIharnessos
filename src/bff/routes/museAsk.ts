/**
 * 健澜科技 jlmedaios - 智能经验问答路由（M118-B，依据宪法第七章）
 *
 * POST /api/v1/muse/ask：自然语言问答
 *   body: { query: string; staffRole?: string; deptCode?: string }
 *   resp: { query, answer, sources, confidence, matched }
 *
 * 在医院层已脱敏知识库中做关键词匹配 + 角色 / 科室加权，输出可读答案与可溯源来源。
 *
 * 医疗安全（依据宪法第七章）：本端点只读；答案为院内经验的辅助参考，不改变医嘱、
 * 不强制改派诊疗方案。权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import { askExperience, type ExperienceQaResult } from '../aggregators/experienceQaAggregator';
import { buildDefaultHospitalKnowledge } from '../aggregators/hospitalSearchAggregator';

/** 问答请求体 */
interface AskExperienceBody {
  query?: string;
  staffRole?: string;
  deptCode?: string;
}

/** 问答响应信封 */
export interface AskExperienceResponse extends ExperienceQaResult {
  /** 原始问句 */
  query: string;
}

export const museAskRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/muse/ask',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;

      let body: AskExperienceBody;
      try {
        body = await c.body<AskExperienceBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
      }

      const query = (body?.query ?? '').trim();
      if (!query) {
        return json(fail(ErrorCode.BAD_REQUEST, 'query 不能为空', c.traceId), 400);
      }

      try {
        // 真实环境替换为医院层 muse 持久层读取；此处使用确定性种子（依据宪法第七章）
        const allExperiences = buildDefaultHospitalKnowledge();
        const result = askExperience(query, body.staffRole, body.deptCode, allExperiences);

        const payload: AskExperienceResponse = { query, ...result };
        return json(ok(payload, 'ok', c.traceId));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '智能经验问答失败', c.traceId),
          500,
        );
      }
    },
  },
];
