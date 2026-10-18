/**
 * 健澜科技 jlmedaios - 质控 PDCA 改进计划 V14 路由（M504-A）
 *
 * POST /api/v1/emr-qc-pdca-plan  （auth:true）PDCA 计划提交
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import { advancePdcaPhase, buildPdcaPlan, buildPdcaReport, type PdcaPlanV14 } from "../aggregators/emrQcPdcaPlanV14Aggregator.js";

let samplePlan: PdcaPlanV14 = buildPdcaPlan("降低病历缺陷率", "P");

export const emrQcPdcaPlanV14Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/emr-qc-pdca-plan",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-pdca-plan:write");
      if (denied) return denied;
      const body = await c.req.json();
      const title = typeof body?.title === "string" ? body.title : "";
      const currentPhase = typeof body?.currentPhase === "string" ? body.currentPhase : "P";
      const plan = buildPdcaPlan(title, currentPhase);
      samplePlan = plan;
      const report = buildPdcaReport(plan);
      const nextPhase = advancePdcaPhase(currentPhase);
      return json(ok({ plan, report, nextPhase }));
    },
  },
];
