/**
 * 健澜科技 jlmedaios - 场景化经验推荐路由（M118-A，依据宪法第七章）
 *
 * GET /api/v1/muse/recommend?action=prescription&context=老年,抗菌药
 *   在全院层已脱敏经验库中，按「当前临床动作 + 患者脱敏上下文」自动推荐相关历史
 *   经验与失败教训；失败教训置顶、命中分排序；无任何命中时退回默认信号排序兜底。
 *
 * 医疗安全（依据宪法第七章）：本接口只读，推荐为辅助参考，不改医嘱、不强制改派
 * 诊疗方案。权限：medmuse:view。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  buildDefaultContextualExperiences,
  recommendContextualExperience,
  type PatientContext,
  type ScoredExperience,
} from '../aggregators/contextualExperienceAggregator';

/** 推荐接口响应信封 */
export interface MuseRecommendResponse {
  /** 当前临床动作 */
  action: string;
  /** 原始上下文字符串 */
  context: string;
  /** 命中经验条数 */
  total: number;
  /** 推荐结果（已按相关度排序） */
  recommended: ScoredExperience[];
}

export const museRecommendRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/recommend',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'medmuse:view');
      if (denied) return denied;

      const action = c.query.get('action') ?? '';
      const contextStr = c.query.get('context') ?? '';
      const staffId = c.user?.id ?? '';

      // context 形如「老年,抗菌药」，解析为合并症标签（已脱敏，不含身份信息）
      const patientContext: PatientContext = {
        conditions: contextStr
          .split(/[,，、;；\s]+/)
          .map((s) => s.trim())
          .filter(Boolean),
      };

      try {
        // 真实环境替换为全院 muse 持久层读取；此处使用确定性种子（依据宪法第七章）
        const allExperiences = buildDefaultContextualExperiences();
        const recommended = recommendContextualExperience(
          staffId,
          patientContext,
          action,
          allExperiences,
        );

        const payload: MuseRecommendResponse = {
          action,
          context: contextStr,
          total: recommended.length,
          recommended,
        };
        return json(ok(payload));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '场景化经验推荐失败'),
          500,
        );
      }
    },
  },
];
