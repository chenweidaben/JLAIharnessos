/**
 * 健澜科技 jlmedaios - AI 辅助诊断深化·更多病种与鉴别诊断（M168-A）BFF 路由
 *
 * POST /api/v1/ai/diagnose/expand-v2
 *   body: {
 *     symptoms?: [{ name, onset? }],
 *     history?: string[] | { chronicDiseases?: string[], notes?: string },
 *     labResults?: [{ name, value?, unit?, abnormal? }],
 *     patientFeatures?: { age?, gender?, vitals?, comorbidities?, pregnant? },
 *     mode?: 'library' | 'differential' | 'treatment' | 'consistency' | 'all',
 *     newDiseases?: Array<{ diagnosis, icd10?, specialty? }>,
 *     targetDiagnosis?: string,   // mode=treatment / consistency 时使用
 *   }
 *
 * 【AI深化与智能运营】
 *   在 M154-A / M163-C 基础上，继续向消化/呼吸/心血管/内分泌深耕 17 个
 *   高频病种，并输出：病种库扩展、鉴别诊断深化、治疗方案推荐、一致性核查。
 *
 * 医疗安全红线：AI 只是辅助，最终由医生确认；返回值自带 disclaimer；
 *   规则引擎纯函数计算，不直连 LLM、不落敏感明文、不写诊断结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  BUILTIN_DISEASE_COUNT,
  checkDiagnosisConsistency,
  expandDiagnosisLibrary,
  improveDifferentialDiagnosis,
  suggestTreatmentPlan,
  type DeepLabResult,
  type DeepPatientFeatures,
  type DeepSymptomInput,
} from '../aggregators/diagnoseDeepAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

interface DiagnoseDeepBody {
  symptoms?: DeepSymptomInput[];
  history?: string[] | { chronicDiseases?: string[]; notes?: string };
  labResults?: DeepLabResult[];
  patientFeatures?: DeepPatientFeatures;
  mode?: 'library' | 'differential' | 'treatment' | 'consistency' | 'all';
  newDiseases?: Array<{ diagnosis: string; icd10?: string; specialty?: '消化' | '呼吸' | '心血管' | '内分泌' }>;
  targetDiagnosis?: string;
}

export const diagnoseDeepRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai/diagnose/expand-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = (await c.body<DiagnoseDeepBody>().catch(() => ({}))) as DiagnoseDeepBody;

        const symptoms = Array.isArray(body?.symptoms) ? body.symptoms : [];
        const history = body?.history ?? [];
        const labResults = Array.isArray(body?.labResults) ? body.labResults : [];
        const features: DeepPatientFeatures = body?.patientFeatures ?? {};
        const mode = body?.mode ?? 'all';
        const targetDiagnosis = (body?.targetDiagnosis ?? '').trim();

        const library = mode === 'library' || mode === 'all'
          ? expandDiagnosisLibrary(body?.newDiseases ?? [])
          : null;

        const differential = mode === 'differential' || mode === 'all'
          ? improveDifferentialDiagnosis(symptoms, history, labResults)
          : null;

        const treatment = (mode === 'treatment' || mode === 'all') && targetDiagnosis
          ? suggestTreatmentPlan(targetDiagnosis, features)
          : null;

        const consistency = (mode === 'consistency' || mode === 'all') && targetDiagnosis
          ? checkDiagnosisConsistency(targetDiagnosis, symptoms, labResults)
          : null;

        return json(ok({
          builtinCount: BUILTIN_DISEASE_COUNT,
          library,
          differential,
          treatment,
          consistency,
        }));
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : 'AI 诊断深化生成失败',
          ),
          500,
        );
      }
    },
  },
];
