/**
 * 健澜科技 jlmedaios - 门诊流量预测与分时段建议 V13 路由（M313-B）
 *
 * GET /api/v1/outpatient-flow-forecast?days=
 *
 * 权限：outpatient-flow-forecast:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  forecastDailyOutpatientV13,
  forecastTimeSlotV13,
  suggestSlotAllocationV13,
  type OutpatientHistoryV13,
  type SlotWeightV13,
} from "../aggregators/outpatientFlowForecastV13Aggregator.js";

// 周一(1) 历史 3 次：700, 800, 900 → avg=800
const history: OutpatientHistoryV13[] = [
  { dayOfWeek: 1, volume: 700 },
  { dayOfWeek: 1, volume: 800 },
  { dayOfWeek: 1, volume: 900 },
];

const slotWeights: SlotWeightV13[] = [
  { slot: "上午", weight: 0.5 },
  { slot: "下午", weight: 0.3 },
  { slot: "晚间", weight: 0.2 },
];

export const outpatientFlowForecastV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/outpatient-flow-forecast",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "outpatient-flow-forecast:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const days = Number(url.searchParams.get("days") ?? "7");
      const daily = forecastDailyOutpatientV13(history, days);
      const dailyTotal = daily[0]?.volume ?? 800;
      const slots = forecastTimeSlotV13(dailyTotal, slotWeights);
      return json(ok({
        daily,
        slots,
        allocation: suggestSlotAllocationV13(slots),
      }));
    },
  },
];
