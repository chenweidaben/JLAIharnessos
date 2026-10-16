/**
 * 健澜科技 jlmedaios - AI 辅助诊断深化·更多病种 V2（M174-C）BFF 路由
 *
 * POST /api/v1/ai/diagnose/expand-v2
 *   body: {
 *     symptoms?: [{ name, onset? }],
 *     history?: string[] | { chronicDiseases?: string[], notes?: string },
 *     labResults?: [{ name, value?, unit?, abnormal? }],
 *     patientFeatures?: { age?, gender?, vitals?, comorbidities?, pregnant? },
 *     mode?: 'library' | 'differential' | 'treatment' | 'all',
 *     newDiseases?: Array<{ diagnosis, icd10?, specialty? }>,
 *     targetDiagnosis?: string,   // mode=treatment 时使用
 *   }
 *
 * 【持续优化与新场景】
 *   在 M163-C / M168-A 基础上，对「神经 / 泌尿 / 血液 / 风湿免疫」四大系统
 *   的 16 个高频病种做 V2 深化，输出：病种库扩展、鉴别诊断深化、治疗方案推荐。
 *
 * 医疗安全红线：AI 只是辅助，最终由医生确认；返回值自带 disclaimer；
 *   规则引擎纯函数计算，不直连 LLM、不落敏感明文、不写诊断结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  BUILTIN_DISEASE_COUNT_V2,
  expandDiagnosisLibraryV2,
  improveDifferentialDiagnosisV2,
  suggestTreatmentPlanV2,
  type V2LabResult,
  type V2PatientFeatures,
  type V2SymptomInput,
} from '../aggregators/diagnoseV2Aggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

interface DiagnoseV2Body {
  symptoms?: V2SymptomInput[];
  history?: string[] | { chronicDiseases?: string[]; notes?: string };
  labResults?: V2LabResult[];
  patientFeatures?: V2PatientFeatures;
  mode?: 'library' | 'differential' | 'treatment' | 'all';
  newDiseases?: Array<{ diagnosis: string; icd10?: string; specialty?: '神经' | '泌尿' | '血液' | '风湿免疫' }>;
  targetDiagnosis?: string;
}

export const diagnoseV2Routes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai/diagnose/expand-v2',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = (await c.body<DiagnoseV2Body>().catch(() => ({}))) as DiagnoseV2Body;

        const symptoms = Array.isArray(body?.symptoms) ? body.symptoms : [];
        const history = body?.history ?? [];
        const labResults = Array.isArray(body?.labResults) ? body.labResults : [];
        const features: V2PatientFeatures = body?.patientFeatures ?? {};
        const mode = body?.mode ?? 'all';
        const targetDiagnosis = (body?.targetDiagnosis ?? '').trim();

        const library = mode === 'library' || mode === 'all'
          ? expandDiagnosisLibraryV2(body?.newDiseases ?? [])
          : null;

        const differential = mode === 'differential' || mode === 'all'
          ? improveDifferentialDiagnosisV2(symptoms, history, labResults)
          : null;

        const treatment = (mode === 'treatment' || mode === 'all') && targetDiagnosis
          ? suggestTreatmentPlanV2(targetDiagnosis, features)
          : null;

        return json(ok({
          builtinCount: BUILTIN_DISEASE_COUNT_V2,
          library,
          differential,
          treatment,
        }));
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : 'AI 诊断 V2 生成失败',
          ),
          500,
        );
      }
    },
  },
];
