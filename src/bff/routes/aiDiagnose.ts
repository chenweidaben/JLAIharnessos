/**
 * 健澜科技 jlmedaios - AI核心能力深化（M144-A）：AI 辅助诊断 BFF 路由
 *
 * POST /api/v1/ai/diagnose
 *   两种模式（body.mode，默认 generate）：
 *   - generate：
 *       { mode:'generate', symptoms:[{name, onset?}], patientAge, patientGender, history? }
 *     返回：Top3 可能诊断（带置信度）/ 鉴别诊断 / 建议检查 / 治疗方向 / 风险提示。
 *   - feedback（医生采纳/修改/驳回留痕，回流模型优化）：
 *       { mode:'feedback', userDiagnosis, suggestion:Suggestion, feedback:{doctorId, action, note?} }
 *     返回：该医生的诊断准确率统计（DiagnosisAccuracyStats）。
 *
 * 医疗安全红线：AI 只是建议，最终决定权在执业医师；采纳/驳回一律留痕。
 * 仅要求登录态；规则引擎纯函数计算，不落敏感明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  aiDiagnose,
  getDiagnosisAccuracy,
  refineDiagnosis,
  type AiHistoryInput,
  type AiSymptomInput,
  type DiagnosisFeedback,
  type Gender,
  type Suggestion,
} from '../aggregators/aiDiagnoseAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

interface AiDiagnoseBody {
  mode?: 'generate' | 'feedback';
  symptoms?: AiSymptomInput[];
  patientAge?: number;
  patientGender?: Gender;
  history?: AiHistoryInput;
  // feedback 模式
  userDiagnosis?: string;
  suggestion?: Suggestion;
  feedback?: DiagnosisFeedback;
}

export const aiDiagnoseRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai/diagnose',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = await c.body<AiDiagnoseBody>().catch(() => ({} as AiDiagnoseBody));
        const mode = body?.mode === 'feedback' ? 'feedback' : 'generate';

        if (mode === 'feedback') {
          // 医生采纳/修改/驳回留痕
          const suggestion = body?.suggestion;
          const feedback = body?.feedback;
          if (!suggestion || !feedback?.doctorId || !feedback?.action) {
            return json(fail(ErrorCode.BAD_REQUEST, 'feedback 模式需提供 suggestion 与 feedback.doctorId/action'), 400);
          }
          refineDiagnosis(body.userDiagnosis ?? '', suggestion, feedback);
          const stats = getDiagnosisAccuracy(feedback.doctorId);
          return json(ok(stats));
        }

        // generate：AI 辅助诊断建议
        const symptoms = Array.isArray(body?.symptoms) ? body.symptoms : [];
        const patientAge = Number(body?.patientAge ?? 0);
        const gender: Gender =
          body?.patientGender === 'male' || body?.patientGender === 'female'
            ? body.patientGender
            : '';
        const history = (body?.history ?? {}) as AiHistoryInput;
        const suggestion = aiDiagnose(symptoms, patientAge, gender, history);
        return json(ok(suggestion));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : 'AI 诊断建议生成失败'),
          500,
        );
      }
    },
  },
];
