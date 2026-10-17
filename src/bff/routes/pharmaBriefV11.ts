/**
 * 健澜科技 jlmedaios - PHARMA_MUSE 主动式晨会简报 V11 路由（M293-C）
 *
 * GET /api/v1/pharma-brief 晨会简报（query: pharmacistId）
 *
 * 权限：pharma-brief:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildPharmaBriefV11,
  formatPharmaBriefV11,
  prioritizePharmaBriefV11,
  type InteractionAlertV11,
  type InterceptV11,
  type LowStockV11,
  type PharmaWeightDeltaV11,
  type ReviewItemV11,
} from "../aggregators/pharmaBriefV11Aggregator.js";

const reviewQueue: ReviewItemV11[] = [
  { reviewId: "rv-1", prescriptionId: "rx-1" },
  { reviewId: "rv-2", prescriptionId: "rx-2" },
];

const lowStock: LowStockV11[] = [
  { drugCode: "WARFARIN", onHand: 20, threshold: 100 },
];

const interactionAlerts: InteractionAlertV11[] = [
  { alertId: "ia-1", drugA: "WARFARIN", drugB: "ASPIRIN" },
];

const intercepts: InterceptV11[] = [
  { ruleId: "r-1", count: 5 },
  { ruleId: "r-2", count: 3 },
];

const weightDeltas: PharmaWeightDeltaV11[] = [
  { ruleId: "r-1", delta: 0.05 },
];

export const pharmaBriefV11Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/pharma-brief",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "pharma-brief:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const pharmacistId = url.searchParams.get("pharmacistId") ?? "ph-001";
      const brief = buildPharmaBriefV11(pharmacistId, reviewQueue, lowStock, interactionAlerts, intercepts, weightDeltas);
      return json(ok({
        ...brief,
        items: prioritizePharmaBriefV11(brief.items),
        text: formatPharmaBriefV11(brief),
      }));
    },
  },
];
