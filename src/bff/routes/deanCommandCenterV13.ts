/**
 * 健澜科技 jlmedaios - 院长指挥中心一屏总览 V13 路由（M311-D）
 *
 * GET /api/v1/dean-command-center
 *
 * 权限：dean-command-center:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDeanCommandCenterV13,
  identifyUrgentAlertV13,
} from "../aggregators/deanCommandCenterV13Aggregator.js";

const input = {
  flywheelScore: 68,
  closureRate: 65,
  satisfactionRate: 60,
  workloadHealth: 75,
  eventSafety: 80,
};

export const deanCommandCenterV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/dean-command-center",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "dean-command-center:read");
      if (denied) return denied;
      const card = buildDeanCommandCenterV13(input);
      return json(ok({
        card,
        alert: identifyUrgentAlertV13(card),
      }));
    },
  },
];
