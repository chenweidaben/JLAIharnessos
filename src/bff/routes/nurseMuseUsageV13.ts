/**
 * 健澜科技 jlmedaios - 护士个人智能体使用统计 V13 路由（M320-A）
 *
 * GET /api/v1/nurse-muse-usage?nurseId=
 *
 * 权限：nurse-muse-usage:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyNurseScenariosV13,
  computeNurseCallCountV13,
  computeNurseHitRateV13,
  type NurseMuseFeedbackV13,
  type NurseMuseUsageV13,
} from "../aggregators/nurseMuseUsageV13Aggregator.js";

const usages: NurseMuseUsageV13[] = [
  { usageId: "u1", nurseId: "n1", scenario: "medicationCheck" },
  { usageId: "u2", nurseId: "n1", scenario: "medicationCheck" },
  { usageId: "u3", nurseId: "n1", scenario: "medicationCheck" },
  { usageId: "u4", nurseId: "n1", scenario: "carePlan" },
  { usageId: "u5", nurseId: "n2", scenario: "carePlan" },
  { usageId: "u6", nurseId: "n2", scenario: "carePlan" },
  { usageId: "u7", nurseId: "n2", scenario: "riskAlert" },
  { usageId: "u8", nurseId: "n3", scenario: "riskAlert" },
  { usageId: "u9", nurseId: "n3", scenario: "riskAlert" },
  { usageId: "u10", nurseId: "n3", scenario: "medicationCheck" },
];

const feedbacks: NurseMuseFeedbackV13[] = [
  { feedbackId: "f1", nurseId: "n1", isAdopted: true },
  { feedbackId: "f2", nurseId: "n1", isAdopted: true },
  { feedbackId: "f3", nurseId: "n1", isAdopted: true },
  { feedbackId: "f4", nurseId: "n1", isAdopted: true },
  { feedbackId: "f5", nurseId: "n1", isAdopted: true },
  { feedbackId: "f6", nurseId: "n1", isAdopted: true },
  { feedbackId: "f7", nurseId: "n1", isAdopted: true },
  { feedbackId: "f8", nurseId: "n1", isAdopted: true },
  { feedbackId: "f9", nurseId: "n1", isAdopted: false },
  { feedbackId: "f10", nurseId: "n1", isAdopted: false },
];

export const nurseMuseUsageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/nurse-muse-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "nurse-muse-usage:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const nurseId = url.searchParams.get("nurseId") ?? "n1";
      return json(ok({
        nurseId,
        callCount: computeNurseCallCountV13(usages, nurseId),
        scenarioDistribution: classifyNurseScenariosV13(usages),
        hitRate: computeNurseHitRateV13(feedbacks, nurseId),
      }));
    },
  },
];
