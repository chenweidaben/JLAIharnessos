/**
 * 健澜科技 jlmedaios - 处方点评与药师反馈 V7 路由（M289-B）
 *
 * GET  /api/v1/review/prescriptions 点评列表
 * GET  /api/v1/review/prescriptions/:id 详情
 * POST /api/v1/review/submit 提交点评
 * GET  /api/v1/review/ranking 科室排名
 *
 * 权限：review:read / review:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeRationalRateV7,
  rankDeptV7,
  reviewPrescriptionV7,
  type DrugUsage,
  type PrescriptionReview,
} from "../aggregators/prescriptionReviewV7Aggregator.js";

const reviewStore: PrescriptionReview[] = [
  { prescriptionId: "rx-1", reviewer: "张药师", result: "合理", comment: "符合规范" },
];

const usageStore: DrugUsage[] = [
  { drugCode: "AMOXICILLIN", dept: "心内科", rational: 95, sampleCnt: 100 },
  { drugCode: "CEFTRIAXONE", dept: "心内科", rational: 88, sampleCnt: 100 },
  { drugCode: "AMOXICILLIN", dept: "儿科", rational: 70, sampleCnt: 100 },
  { drugCode: "METRONIDAZOLE", dept: "消化内科", rational: 80, sampleCnt: 100 },
];

export const prescriptionReviewV7Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/review/prescriptions",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "review:read");
      if (denied) return denied;

      return json(ok(reviewStore));
    },
  },
  {
    method: "GET",
    path: "/api/v1/review/prescriptions/:id",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "review:read");
      if (denied) return denied;

      const id = c.params.id;
      const r = reviewStore.find((x) => x.prescriptionId === id);
      if (!r) {
        return json(ok({ found: false }));
      }
      return json(ok(r));
    },
  },
  {
    method: "POST",
    path: "/api/v1/review/submit",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "review:write");
      if (denied) return denied;

      const body = await c.req.json() as {
        cdsPass: boolean;
        criticalCount: number;
        warningCount: number;
        reviewer: string;
        comment: string;
      };
      const review = reviewPrescriptionV7(
        { pass: body.cdsPass, criticalCount: body.criticalCount, warningCount: body.warningCount },
        body.reviewer,
        body.comment,
      );
      reviewStore.push(review);
      return json(ok(review));
    },
  },
  {
    method: "GET",
    path: "/api/v1/review/ranking",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "review:read");
      if (denied) return denied;

      return json(ok({
        overallRate: computeRationalRateV7(usageStore),
        deptRanking: rankDeptV7(usageStore),
      }));
    },
  },
];
