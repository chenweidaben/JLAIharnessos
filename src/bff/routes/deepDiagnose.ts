/**
 * 健澜科技 jlmedaios - AI 辅助诊断深化（M154-A）：深度诊断 BFF 路由
 *
 * POST /api/v1/ai/diagnose/deep
 *   body: {
 *     features?: { age?, gender?, vitals?: { temperature?, systolic?, diastolic?, heartRate?, spo2? } },
 *     symptoms?: [{ name, onset? }],
 *     history?: { chronicDiseases?, smoking?, notes? },
 *     durationHours?: number,   // 可选：用于鉴别诊断病程修正
 *     severity?: 0|1|2|3,       // 可选：严重度
 *   }
 *   返回: DeepDiagnosis（Top5 可能诊断 + 鉴别诊断 + 建议检验/影像 + 风险提示 + disclaimer）
 *
 * 【AI深化与运营预测】在 M144-A 初筛（Top3）基础上，下沉到 16 种专科病种库。
 *
 * 医疗安全红线：AI 只是辅助，最终由医生确认；返回值自带 disclaimer；
 *   规则引擎纯函数计算，不直连 LLM、不落敏感明文、不写诊断结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  deepDiagnose,
  differentialDiagnosis,
  suggestImaging,
  suggestLabTests,
  type DeepHistory,
  type DeepSymptom,
  type PatientFeatures,
} from '../aggregators/deepDiagnoseAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

interface DeepDiagnoseBody {
  features?: PatientFeatures;
  symptoms?: DeepSymptom[];
  history?: DeepHistory;
  durationHours?: number;
  severity?: number;
  /** 可选：单独按诊断名反查检验/影像（便于前端「该诊断还需做什么」） */
  lookupDiagnosis?: string;
}

export const deepDiagnoseRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai/diagnose/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = (await c.body<DeepDiagnoseBody>().catch(() => ({}))) as DeepDiagnoseBody;

        const features: PatientFeatures = body?.features ?? {};
        const symptoms = Array.isArray(body?.symptoms) ? body.symptoms : [];
        const history: DeepHistory = body?.history ?? {};
        const durationHours = Number(body?.durationHours ?? 0);
        const severity = Math.min(3, Math.max(0, Number(body?.severity ?? 1)));

        // 主输出：Top5 深度诊断
        const diagnosis = deepDiagnose(features, symptoms, history);

        // 可选叠加：按病程/严重度的鉴别诊断，以及按诊断名反查检验/影像
        const differential = differentialDiagnosis(symptoms, durationHours, severity);
        const lookup = body?.lookupDiagnosis
          ? {
              diagnosis: body.lookupDiagnosis,
              labTests: suggestLabTests(body.lookupDiagnosis),
              imaging: suggestImaging(body.lookupDiagnosis),
            }
          : null;

        return json(ok({ diagnosis, differential, lookup }));
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : 'AI 深度诊断生成失败',
          ),
          500,
        );
      }
    },
  },
];
