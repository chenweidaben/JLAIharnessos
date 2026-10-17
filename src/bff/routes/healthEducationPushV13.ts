/**
 * 健澜科技 jlmedaios - 健教材料推送统计 V13 路由（M316-C）
 *
 * GET /api/v1/health-education-push?disease=
 *
 * 权限：health-education-push:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeFeedbackRateV13,
  computeReadRateV13,
  countMaterialsByDiseaseV13,
  type EducationMaterialV13,
  type EducationRecordV13,
} from "../aggregators/healthEducationPushV13Aggregator.js";

const materials: EducationMaterialV13[] = [
  { materialId: "m1", disease: "hypertension" },
  { materialId: "m2", disease: "hypertension" },
  { materialId: "m3", disease: "diabetes" },
  { materialId: "m4", disease: "diabetes" },
  { materialId: "m5", disease: "diabetes" },
];

const records: EducationRecordV13[] = [
  { recordId: "r1", materialId: "m1", disease: "hypertension", isRead: true, hasFeedback: true },
  { recordId: "r2", materialId: "m1", disease: "hypertension", isRead: true, hasFeedback: true },
  { recordId: "r3", materialId: "m1", disease: "hypertension", isRead: true, hasFeedback: true },
  { recordId: "r4", materialId: "m2", disease: "hypertension", isRead: true, hasFeedback: false },
  { recordId: "r5", materialId: "m2", disease: "hypertension", isRead: true, hasFeedback: false },
  { recordId: "r6", materialId: "m2", disease: "hypertension", isRead: true, hasFeedback: false },
  { recordId: "r7", materialId: "m3", disease: "diabetes", isRead: true, hasFeedback: false },
  { recordId: "r8", materialId: "m3", disease: "diabetes", isRead: false, hasFeedback: false },
  { recordId: "r9", materialId: "m4", disease: "diabetes", isRead: false, hasFeedback: false },
  { recordId: "r10", materialId: "m5", disease: "diabetes", isRead: false, hasFeedback: false },
];

export const healthEducationPushV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/health-education-push",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "health-education-push:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const disease = url.searchParams.get("disease") ?? "all";
      const filtered = disease === "all" ? records : records.filter((r) => r.disease === disease);
      return json(ok({
        disease,
        materialCounts: countMaterialsByDiseaseV13(materials),
        readRate: computeReadRateV13(filtered),
        feedbackRate: computeFeedbackRateV13(filtered),
      }));
    },
  },
];
