/**
 * 健澜科技 jlmedaios - AI 能力深化：更多病种与更准诊断（M163-C）BFF 路由
 *
 * POST /api/v1/ai/diagnose/expand
 *   按 body.mode 分四种动作：
 *   - 'library'      病种入库：{ mode:'library', newDiseases:[{name,icd10,specialty,typicalSymptoms...}] }
 *   - 'accuracy'     准确率再校准：{ mode:'accuracy', currentModel:[{disease,accuracy,sampleCount}],
 *                                    feedback:[{disease,correct,doctorFinalDiagnosis?}] }
 *   - 'differential' 增补鉴别诊断：{ mode:'differential', disease:'脑卒中',
 *                                    differential:[{diagnosis, discriminator}] }
 *   - 'examine'(默认) 推荐进一步检查：{ mode:'examine', diagnosis:'脑卒中',
 *                                       patientFeatures:{ age, gender, hasRedFlag, completedExams } }
 *
 * 医疗安全红线：所有输出为教科书级辅助建议，不构成诊断结论，最终由执业医师确认。
 * 【安全与运营】新病种入库、低准确率病种均留痕，供医学委员会复核；本切片纯函数计算，
 * 不落敏感明文、不写 SQL。仅要求登录态。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import {
  addDifferentialDiagnosis,
  expandDiseaseLibrary,
  improveDiagnosisAccuracy,
  suggestFurtherExamination,
  type DifferentialEntry,
  type ModelDiseaseStat,
  type PatientExamFeatures,
} from '../aggregators/diseaseExpandAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

type ExpandMode = 'library' | 'accuracy' | 'differential' | 'examine';

interface ExpandBody {
  mode?: ExpandMode;
  // library
  newDiseases?: Array<{
    name?: string;
    icd10?: string;
    specialty?: string;
    typicalSymptoms?: string[];
  }>;
  // accuracy
  currentModel?: ModelDiseaseStat[];
  feedback?: Array<{ disease?: string; correct?: boolean; doctorFinalDiagnosis?: string }>;
  // differential
  disease?: string;
  differential?: DifferentialEntry[];
  // examine
  diagnosis?: string;
  patientFeatures?: PatientExamFeatures;
}

export const diseaseExpandRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai/diagnose/expand',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const body = (await c.body<ExpandBody>().catch(() => ({} as ExpandBody))) ?? ({} as ExpandBody);
        const mode: ExpandMode =
          body.mode === 'library' || body.mode === 'accuracy' || body.mode === 'differential'
            ? body.mode
            : 'examine';

        if (mode === 'library') {
          const result = expandDiseaseLibrary(
            (body.newDiseases ?? []) as Parameters<typeof expandDiseaseLibrary>[0],
          );
          return json(ok(result));
        }

        if (mode === 'accuracy') {
          const feedback = (body.feedback ?? []).map((f) => ({
            disease: f.disease ?? '',
            correct: f.correct === true,
            doctorFinalDiagnosis: f.doctorFinalDiagnosis,
          }));
          const result = improveDiagnosisAccuracy(body.currentModel ?? [], feedback);
          return json(ok(result));
        }

        if (mode === 'differential') {
          if (!body.disease) {
            return json(fail(ErrorCode.BAD_REQUEST, 'differential 模式需提供 disease（病种名）'), 400);
          }
          const result = addDifferentialDiagnosis(body.disease, body.differential ?? []);
          return json(ok(result));
        }

        // examine（默认）：推荐进一步检查
        if (!body.diagnosis) {
          return json(fail(ErrorCode.BAD_REQUEST, 'examine 模式需提供 diagnosis（病种名）'), 400);
        }
        const result = suggestFurtherExamination(body.diagnosis, body.patientFeatures ?? {});
        return json(ok(result));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : 'AI 诊断扩展处理失败'),
          500,
        );
      }
    },
  },
];
