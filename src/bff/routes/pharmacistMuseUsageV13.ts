/**
 * 健澜科技 jlmedaios - 药师个人智能体使用统计 V13 路由（M320-B）
 *
 * GET /api/v1/pharmacist-muse-usage?pharmacistId=
 *
 * 权限：pharmacist-muse-usage:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyPharmacistScenariosV13,
  computeAdoptionRateV13,
  computePharmacistCallCountV13,
  type PharmacistMuseFeedbackV13,
  type PharmacistMuseUsageV13,
} from "../aggregators/pharmacistMuseUsageV13Aggregator.js";

const usages: PharmacistMuseUsageV13[] = [
  { usageId: "u1", pharmacistId: "p1", scenario: "prescriptionReview" },
  { usageId: "u2", pharmacistId: "p1", scenario: "prescriptionReview" },
  { usageId: "u3", pharmacistId: "p1", scenario: "prescriptionReview" },
  { usageId: "u4", pharmacistId: "p1", scenario: "interaction" },
  { usageId: "u5", pharmacistId: "p2", scenario: "interaction" },
  { usageId: "u6", pharmacistId: "p2", scenario: "interaction" },
  { usageId: "u7", pharmacistId: "p2", scenario: "contraindication" },
  { usageId: "u8", pharmacistId: "p3", scenario: "contraindication" },
  { usageId: "u9", pharmacistId: "p3", scenario: "contraindication" },
  { usageId: "u10", pharmacistId: "p3", scenario: "prescriptionReview" },
];

const feedbacks: PharmacistMuseFeedbackV13[] = [
  { feedbackId: "f1", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f2", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f3", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f4", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f5", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f6", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f7", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f8", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f9", pharmacistId: "p1", isAdopted: true },
  { feedbackId: "f10", pharmacistId: "p1", isAdopted: false },
];

export const pharmacistMuseUsageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharmacist-muse-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharmacist-muse-usage:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const pharmacistId = url.searchParams.get("pharmacistId") ?? "p1";
      return json(ok({
        pharmacistId,
        callCount: computePharmacistCallCountV13(usages, pharmacistId),
        scenarioDistribution: classifyPharmacistScenariosV13(usages),
        adoptionRate: computeAdoptionRateV13(feedbacks, pharmacistId),
      }));
    },
  },
];
