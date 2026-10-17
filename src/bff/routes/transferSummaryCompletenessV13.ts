/**
 * 健澜科技 jlmedaios - 转科交接单完整度评分 V13 路由（M315-C）
 *
 * GET /api/v1/transfer-summary-completeness?patientId=
 *
 * 权限：transfer-summary-completeness:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeTransferCompletenessScoreV13,
  gradeTransferSummaryV13,
  identifyMissingTransferFieldsV13,
  type TransferSummaryV13,
} from "../aggregators/transferSummaryCompletenessV13Aggregator.js";

const summary: TransferSummaryV13 = {
  patientId: "p1",
  diagnosis: "急性心肌梗死",
  medications: "阿司匹林 100mg qd",
  nursingNotes: "心电监护",
  allergyHistory: "无",
  riskAssessment: "",
};

export const transferSummaryCompletenessV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/transfer-summary-completeness",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "transfer-summary-completeness:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const patientId = url.searchParams.get("patientId") ?? summary.patientId;
      const score = computeTransferCompletenessScoreV13(summary);
      return json(ok({
        patientId,
        score,
        grade: gradeTransferSummaryV13(score),
        missing: identifyMissingTransferFieldsV13(summary),
      }));
    },
  },
];
