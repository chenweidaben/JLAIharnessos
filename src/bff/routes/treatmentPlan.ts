/**
 * 健澜科技 jlmedaios - AI 治疗方案推荐 · 个体化用药 BFF 路由（M161-C）「AI核心能力深化」
 *
 * POST /api/v1/ai/treatment/plan
 *   入参：patientId、diagnosis（诊断）、patientFeatures（年龄/体重/肝肾功能/孕哺/过敏）、
 *         currentMeds（当前在用用药通用名）。
 *   出参：一线方案（已按患者特征个体化调剂量）、备选方案、药物相互作用冲突、疗程与复查、
 *         以及面向患者的安全免责声明。全部由纯函数即时计算，不落敏感明文，不自动开方。
 *
 * 鉴权 + 统一错误信封；最终用药由医师/药师确认（人在回路）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  adjustDose,
  checkDrugInteraction,
  DEFAULT_GUIDELINE_LIBRARY,
  generateTreatmentPlan,
  type PatientFeatures,
} from '../aggregators/treatmentPlanAggregator.js';

/** POST 请求体 */
interface TreatmentPlanBody {
  patientId?: string;
  diagnosis?: string;
  patientFeatures?: PatientFeatures | null;
  /** 当前在用用药通用名列表 */
  currentMeds?: string[];
}

function badRequest(message: string): Response {
  return json(fail(ErrorCode.BAD_REQUEST, message), 400);
}

export const treatmentPlanRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai/treatment/plan',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);

      let body: TreatmentPlanBody;
      try {
        body = await c.body<TreatmentPlanBody>();
      } catch {
        return badRequest('请求体不是合法 JSON');
      }
      if (!body || typeof body !== 'object') return badRequest('请求体为空');

      const diagnosis = typeof body.diagnosis === 'string' ? body.diagnosis : '';
      if (!diagnosis.trim()) return badRequest('diagnosis（诊断）为必填项');

      const features: PatientFeatures = body.patientFeatures ?? {};
      const currentMeds = Array.isArray(body.currentMeds) ? body.currentMeds : [];

      // 1) 指南对齐骨架（一线/备选/疗程复查）
      const skeleton = generateTreatmentPlan(
        body.patientId ?? '',
        diagnosis,
        DEFAULT_GUIDELINE_LIBRARY,
      );

      // 2) 一线方案逐药个体化调剂量；同时收集新药通用名用于相互作用检查
      const adjustedFirstLine = skeleton.firstLine.map((drug) => adjustDose(features, drug));
      const newDrugNames = skeleton.firstLine
        .filter((d) => {
          const adj = adjustedFirstLine.find((x) => x.drug === d.drug);
          return !(adj?.contraindicated);
        })
        .map((d) => d.drug);

      // 3) 在用用药 × 拟用新药 相互作用冲突检查
      const interactions = checkDrugInteraction(currentMeds, newDrugNames);

      // 4) 备选方案（原样回传，由医师按不耐受/禁忌触发选用）
      const alternatives = skeleton.alternatives.map((a) => ({
        reason: a.reason,
        // 备选药物同样做一次剂量个体化，便于直接参考
        drugs: a.drugs.map((d) => adjustDose(features, d)),
      }));

      return json(
        ok({
          patientId: skeleton.patientId,
          diagnosis: skeleton.diagnosis,
          matched: skeleton.matched,
          guideline: skeleton.guideline ?? null,
          icd10: skeleton.icd10 ?? null,
          // 推荐维度：一线治疗（含个体化剂量）
          firstLine: adjustedFirstLine,
          // 推荐维度：备选方案（不耐受/禁忌替代）
          alternatives,
          // 推荐维度：药物相互作用（冲突检查）
          interactions,
          // 推荐维度：疗程与复查
          courseWeeks: skeleton.courseWeeks ?? null,
          followUpWeeks: skeleton.followUpWeeks ?? null,
          followUpItems: skeleton.followUpItems,
          disclaimer: skeleton.disclaimer,
        }),
      );
    },
  },
];
