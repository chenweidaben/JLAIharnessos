/**
 * 健澜科技 jlmedaios - NURSE_MUSE 主动式交接班简报 V11 路由（M293-B）
 *
 * GET /api/v1/shift-brief 交接班简报（query: nurseId）
 *
 * 权限：shift-brief:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildShiftBriefV11,
  formatShiftBriefV11,
  prioritizeShiftV11,
  type HandoverItemV11,
  type IvTaskV11,
  type NightEventV11,
  type PressureRiskV11,
  type ShiftBedV11,
} from "../aggregators/shiftBriefV11Aggregator.js";

const beds: ShiftBedV11[] = [
  { bedId: "01-101-1", patientId: "p-001" },
  { bedId: "01-101-2", patientId: "p-002" },
];

const ivTasks: IvTaskV11[] = [
  { taskId: "iv-1", bedId: "01-101-1", drug: "头孢呋辛" },
];

const pressureRisks: PressureRiskV11[] = [
  { riskId: "rp-1", bedId: "01-101-2", level: "high" },
];

const nightEvents: NightEventV11[] = [
  { eventId: "ne-1", title: "p-001 凌晨血压波动" },
];

const handoverItems: HandoverItemV11[] = [
  { itemId: "ho-1", title: "上午10点出院结算" },
];

export const shiftBriefV11Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/shift-brief",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "shift-brief:read");
      if (denied) return denied;

      const url = new URL(c.req.url);
      const nurseId = url.searchParams.get("nurseId") ?? "n-001";
      const brief = buildShiftBriefV11(nurseId, beds, ivTasks, pressureRisks, nightEvents, handoverItems);
      return json(ok({
        ...brief,
        items: prioritizeShiftV11(brief.items),
        text: formatShiftBriefV11(brief),
      }));
    },
  },
];
