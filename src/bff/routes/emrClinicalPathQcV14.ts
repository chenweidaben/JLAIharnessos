/**
 * 健澜科技 jlmedaios - 临床路径质控 V14 路由（M480-B）
 *
 * GET /api/v1/emr-clinical-path-qc  （read，auth:true，query 用 new URL 取 patientId）返回临床路径变异记录
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { buildClinicalPathQc, detectPathVariation, type PathStepV14 } from "../aggregators/emrClinicalPathQcV14Aggregator.js";

const demoSteps: PathStepV14[] = [
  { name: "入院评估", planned: "入院当天", actual: "入院当天" },
  { name: "检查检验", planned: "入院第1天", actual: "入院第2天" },
  { name: "治疗方案", planned: "入院第2天", actual: "入院第2天" },
];

const demoRecord = buildClinicalPathQc("P001", "肺炎");
const demoVariations = detectPathVariation(demoSteps);

export const emrClinicalPathQcV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-clinical-path-qc",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-clinical-path-qc:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const patientId = url.searchParams.get("patientId") ?? demoRecord.patientId;
      return json(ok({ record: { ...demoRecord, patientId }, steps: demoSteps, variations: demoVariations }));
    },
  },
];
