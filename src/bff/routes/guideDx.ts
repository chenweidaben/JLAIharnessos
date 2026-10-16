/**
 * 健澜科技 jlmedaios - AI 辅助诊断深化（M160-C）：临床指南对齐 BFF 路由
 *
 * POST /api/v1/ai/diagnose/guide
 *   body.mode：
 *   - diagnose（默认）：
 *       { mode:'diagnose', symptoms:[{name,onset?}], history?, labResults? }
 *     返回：高血压/糖尿病/冠心病/肺炎 四病种指南阈值对齐评估 + 首要诊断。
 *   - treatment：核查某诊断的治疗方案是否符合指南：
 *       { mode:'treatment', diagnosis, treatment:{drugs,interventions,currentControl?} }
 *   - suggestion：生成某诊断的指南治疗建议：
 *       { mode:'suggestion', diagnosis }
 *   - deviation：实际治疗 vs 指南治疗偏离分析：
 *       { mode:'deviation', diagnosis, actualTreatment:[], guidelineTreatment:[] }
 *
 * 医疗安全红线：AI 仅做指南对齐辅助，最终诊疗决定权在执业医师；纯函数计算，
 * 不落敏感明文、不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  checkTreatmentGuideline,
  deviationFromGuideline,
  generateGuidelineSuggestion,
  guideBasedDiagnosis,
  type GuideHistoryInput,
  type GuideLabResults,
  type SymptomInput,
  type TreatmentPlan,
} from '../aggregators/guideDxAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

interface GuideDxBody {
  mode?: 'diagnose' | 'treatment' | 'suggestion' | 'deviation';
  symptoms?: SymptomInput[];
  history?: GuideHistoryInput;
  labResults?: GuideLabResults;
  diagnosis?: string;
  treatment?: TreatmentPlan;
  actualTreatment?: string[];
  guidelineTreatment?: string[];
}

export const guideDxRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai/diagnose/guide',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = await c.body<GuideDxBody>().catch(() => ({} as GuideDxBody));
        const mode = body?.mode ?? 'diagnose';

        if (mode === 'diagnose') {
          const symptoms = Array.isArray(body?.symptoms) ? body.symptoms : [];
          const result = guideBasedDiagnosis(
            symptoms,
            (body?.history ?? {}) as GuideHistoryInput,
            (body?.labResults ?? {}) as GuideLabResults,
          );
          return json(ok(result));
        }

        if (mode === 'treatment') {
          const diagnosis = (body?.diagnosis ?? '').trim();
          if (!diagnosis) return json(fail(ErrorCode.BAD_REQUEST, 'treatment 模式需提供 diagnosis'), 400);
          return json(ok(checkTreatmentGuideline(diagnosis, (body?.treatment ?? {}) as TreatmentPlan)));
        }

        if (mode === 'suggestion') {
          const diagnosis = (body?.diagnosis ?? '').trim();
          if (!diagnosis) return json(fail(ErrorCode.BAD_REQUEST, 'suggestion 模式需提供 diagnosis'), 400);
          const suggestion = generateGuidelineSuggestion(diagnosis);
          if (!suggestion) return json(fail(ErrorCode.BAD_REQUEST, '未匹配到内置指南病种'), 400);
          return json(ok(suggestion));
        }

        // deviation
        const diagnosis = (body?.diagnosis ?? '').trim();
        if (!diagnosis) return json(fail(ErrorCode.BAD_REQUEST, 'deviation 模式需提供 diagnosis'), 400);
        const analysis = deviationFromGuideline(
          diagnosis,
          Array.isArray(body?.actualTreatment) ? body.actualTreatment : [],
          Array.isArray(body?.guidelineTreatment) ? body.guidelineTreatment : [],
        );
        return json(ok(analysis));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '指南对齐计算失败'),
          500,
        );
      }
    },
  },
];
