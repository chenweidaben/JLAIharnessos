/**
 * 健澜科技 jlmedaios - ICD 编码辅助推荐 V13 路由（M315-A）
 *
 * GET /api/v1/icd-coding-assist?diagnosis=
 *
 * 权限：icd-coding-assist:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCodingAccuracyV13,
  computeCodingHitRateV13,
  recommendIcdCodeV13,
  type CodingRecordV13,
  type IcdLibraryItemV13,
} from "../aggregators/icdCodingAssistV13Aggregator.js";

const library: IcdLibraryItemV13[] = [
  { code: "I21.9", keyword: "急性心肌梗死" },
  { code: "I10", keyword: "高血压" },
  { code: "E11.9", keyword: "2型糖尿病" },
];

const records: CodingRecordV13[] = [
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I21.9", correctMainCode: "I21.9", isRecommendationCorrect: true },
  { recommendedMainCode: "I10", correctMainCode: "I21.9", isRecommendationCorrect: false },
  { recommendedMainCode: "I10", correctMainCode: "I10", isRecommendationCorrect: true },
];

export const icdCodingAssistV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/icd-coding-assist",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "icd-coding-assist:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const diagnosis = url.searchParams.get("diagnosis") ?? "急性心肌梗死合并高血压";
      return json(ok({
        diagnosis,
        recommendation: recommendIcdCodeV13(diagnosis, library),
        hitRate: computeCodingHitRateV13(records),
        accuracy: computeCodingAccuracyV13(records),
      }));
    },
  },
];
