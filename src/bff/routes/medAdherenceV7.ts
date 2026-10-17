/**
 * 健澜科技 jlmedaios - 患者用药教育与依从性随访 V7 路由（M289-D）
 *
 * GET  /api/v1/med-adherence 依从率列表
 * GET  /api/v1/med-adherence/:patientId 患者详情
 * POST /api/v1/med-adherence/record 记录一次依从性
 * GET  /api/v1/med-edu/:drugCode 用药教育材料
 *
 * 权限：med-adherence:read / med-adherence:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildMedEduV7,
  classifyAdherenceV7,
  computeAdherenceRateV7,
  type MedEduMaterial,
} from "../aggregators/medAdherenceV7Aggregator.js";

interface AdherenceRow {
  patientId: string;
  drugCode: string;
  dosesPrescribed: number;
  dosesTaken: number;
}

const adherenceStore: AdherenceRow[] = [
  { patientId: "p-001", drugCode: "METFORMIN", dosesPrescribed: 30, dosesTaken: 27 },
  { patientId: "p-002", drugCode: "METFORMIN", dosesPrescribed: 30, dosesTaken: 18 },
  { patientId: "p-003", drugCode: "AMOXICILLIN", dosesPrescribed: 10, dosesTaken: 3 },
];

const eduStore: MedEduMaterial[] = [
  { drugCode: "METFORMIN", title: "二甲双胍基本介绍", level: "basic", body: "用于2型糖尿病" },
  { drugCode: "METFORMIN", title: "二甲双胍简版（老人适用）", level: "simple", body: "随餐服用，饭后恶心及时告知医生" },
  { drugCode: "METFORMIN", title: "二甲双胍深度解析", level: "deep", body: "药代动力学与乳酸酸中毒" },
];

export const medAdherenceV7Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/med-adherence",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "med-adherence:read");
      if (denied) return denied;

      return json(ok(adherenceStore.map((r) => {
        const rate = computeAdherenceRateV7(r.dosesPrescribed, r.dosesTaken);
        return { ...r, adherenceRate: rate, grade: classifyAdherenceV7(rate) };
      })));
    },
  },
  {
    method: "GET",
    path: "/api/v1/med-adherence/:patientId",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "med-adherence:read");
      if (denied) return denied;

      const patientId = c.params.patientId;
      const rows = adherenceStore.filter((r) => r.patientId === patientId);
      if (rows.length === 0) {
        return json(ok({ found: false }));
      }
      return json(ok(rows.map((r) => {
        const rate = computeAdherenceRateV7(r.dosesPrescribed, r.dosesTaken);
        return { ...r, adherenceRate: rate, grade: classifyAdherenceV7(rate) };
      })));
    },
  },
  {
    method: "POST",
    path: "/api/v1/med-adherence/record",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "med-adherence:write");
      if (denied) return denied;

      const body = await c.req.json() as AdherenceRow;
      adherenceStore.push(body);
      const rate = computeAdherenceRateV7(body.dosesPrescribed, body.dosesTaken);
      return json(ok({
        recorded: true,
        adherenceRate: rate,
        grade: classifyAdherenceV7(rate),
      }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/med-edu/:drugCode",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "med-adherence:read");
      if (denied) return denied;

      const drugCode = c.params.drugCode;
      const tags = new URL(c.req.url).searchParams.get("tags")?.split(",").filter(Boolean) ?? [];
      return json(ok(buildMedEduV7(eduStore, drugCode, tags)));
    },
  },
];
