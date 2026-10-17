/**
 * 健澜科技 jlmedaios - 行政个人智能体使用统计 V13 路由（M320-C）
 *
 * GET /api/v1/admin-muse-usage?adminId=
 *
 * 权限：admin-muse-usage:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyAdminScenariosV13,
  computeAdminCallCountV13,
  computeAdminSatisfactionV13,
  type AdminMuseFeedbackV13,
  type AdminMuseUsageV13,
} from "../aggregators/adminMuseUsageV13Aggregator.js";

const usages: AdminMuseUsageV13[] = [
  { usageId: "u1", adminId: "a1", scenario: "document" },
  { usageId: "u2", adminId: "a1", scenario: "document" },
  { usageId: "u3", adminId: "a1", scenario: "document" },
  { usageId: "u4", adminId: "a1", scenario: "meetingMinutes" },
  { usageId: "u5", adminId: "a2", scenario: "meetingMinutes" },
  { usageId: "u6", adminId: "a2", scenario: "meetingMinutes" },
  { usageId: "u7", adminId: "a2", scenario: "dataReport" },
  { usageId: "u8", adminId: "a3", scenario: "dataReport" },
  { usageId: "u9", adminId: "a3", scenario: "dataReport" },
  { usageId: "u10", adminId: "a3", scenario: "document" },
];

const feedbacks: AdminMuseFeedbackV13[] = [
  { feedbackId: "f1", adminId: "a1", isSatisfied: true },
  { feedbackId: "f2", adminId: "a1", isSatisfied: true },
  { feedbackId: "f3", adminId: "a1", isSatisfied: true },
  { feedbackId: "f4", adminId: "a1", isSatisfied: true },
  { feedbackId: "f5", adminId: "a1", isSatisfied: true },
  { feedbackId: "f6", adminId: "a1", isSatisfied: true },
  { feedbackId: "f7", adminId: "a1", isSatisfied: true },
  { feedbackId: "f8", adminId: "a1", isSatisfied: true },
  { feedbackId: "f9", adminId: "a1", isSatisfied: false },
  { feedbackId: "f10", adminId: "a1", isSatisfied: false },
];

export const adminMuseUsageV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/admin-muse-usage",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "admin-muse-usage:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const adminId = url.searchParams.get("adminId") ?? "a1";
      return json(ok({
        adminId,
        callCount: computeAdminCallCountV13(usages, adminId),
        scenarioDistribution: classifyAdminScenariosV13(usages),
        satisfaction: computeAdminSatisfactionV13(feedbacks, adminId),
      }));
    },
  },
];
