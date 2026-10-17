/**
 * 健澜科技 jlmedaios - 手术排程冲突检测 V13 路由（M312-C）
 *
 * GET /api/v1/ot-scheduling-conflict?date=
 *
 * 权限：ot-scheduling-conflict:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  detectBackToBackGapV13,
  detectRoomConflictV13,
  detectSurgeonConflictV13,
  type SurgerySlotV13,
} from "../aggregators/otSchedulingConflictV13Aggregator.js";

// 分钟换算：09:00=540, 10:00=600, 09:30=570, 10:30=630, 11:00=660, 11:20=680, 12:00=720
const surgeries: SurgerySlotV13[] = [
  { surgeryId: "s1", surgeonId: "D001", roomId: "R1", startMin: 540, endMin: 600 },
  { surgeryId: "s2", surgeonId: "D001", roomId: "R2", startMin: 570, endMin: 630 },
  { surgeryId: "s3", surgeonId: "D002", roomId: "R1", startMin: 600, endMin: 660 },
  { surgeryId: "s4", surgeonId: "D003", roomId: "R3", startMin: 680, endMin: 720 },
];

export const otSchedulingConflictV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/ot-scheduling-conflict",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "ot-scheduling-conflict:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const date = url.searchParams.get("date") ?? "2026-10-17";
      return json(ok({
        date,
        surgeonConflicts: detectSurgeonConflictV13(surgeries),
        roomConflicts: detectRoomConflictV13(surgeries),
        gapAlerts: detectBackToBackGapV13(surgeries, 30),
      }));
    },
  },
];
