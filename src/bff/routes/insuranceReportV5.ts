/**
 * 健澜科技 jlmedaios - 医保智能监管与 DRG/DIP 上报 V5 路由（M278-B）
 *
 * GET /api/v1/insurance-report（医保上报看板）
 * POST /api/v1/insurance-report/risk-check（疑点核查）
 * PUT /api/v1/insurance-report/appeal（申诉）
 *
 * 权限：insurance-report:read / insurance-report:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDRGReportV5,
  buildInsuranceReportV5Report,
  detectInsuranceRiskV5,
  type InsuranceClaim,
} from "../aggregators/insuranceReportV5Aggregator.js";

const claimStore: InsuranceClaim[] = [
  { settlementId: "s1", diagnosis: "急性心梗", procedures: ["造影", "支架"], totalCost: 28000, insurancePay: 22000, patientPay: 6000, lengthOfStay: 8 },
  { settlementId: "s2", diagnosis: "肺炎", procedures: ["抗感染"], totalCost: 5000, insurancePay: 4000, patientPay: 1000, lengthOfStay: 5 },
];

export const insuranceReportV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/insurance-report",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "insurance-report:read");
      if (denied) return denied;

      return json(ok(buildInsuranceReportV5Report(claimStore)));
    },
  },
  {
    method: "POST",
    path: "/api/v1/insurance-report/risk-check",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "insurance-report:write");
      if (denied) return denied;

      const body = await c.req.json() as InsuranceClaim & { expectedCost?: number };
      const expectedCost = body.expectedCost ?? buildDRGReportV5(body).expectedCost;
      const risk = detectInsuranceRiskV5({ ...body, expectedCost });
      const drg = buildDRGReportV5(body);
      return json(ok({ drg, risk }));
    },
  },
  {
    method: "PUT",
    path: "/api/v1/insurance-report/appeal",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "insurance-report:write");
      if (denied) return denied;

      const body = await c.req.json() as { settlementId: string; appealReason: string };
      return json(ok({ appealed: true, settlementId: body.settlementId, reason: body.appealReason }));
    },
  },
];
