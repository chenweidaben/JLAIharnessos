/**
 * 健澜科技 jlmedaios - 患者满意度闭环 V13 路由（M311-A）
 *
 * GET /api/v1/patient-satisfaction
 *
 * 权限：patient-satisfaction:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeSatisfactionClosureRateV13,
  dispatchComplaintV13,
  type ComplaintV13,
} from "../aggregators/patientSatisfactionLoopV13Aggregator.js";

const complaints: ComplaintV13[] = [
  { id: "c1", patientName: "张三", score: 2, resolved: true },
  { id: "c2", patientName: "李四", score: 3, resolved: true },
  { id: "c3", patientName: "王五", score: 2, resolved: true },
  { id: "c4", patientName: "赵六", score: 4, resolved: false },
  { id: "c5", patientName: "孙七", score: 5, resolved: false },
];

export const patientSatisfactionLoopV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-satisfaction",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-satisfaction:read");
      if (denied) return denied;
      return json(ok({
        closureRate: computeSatisfactionClosureRateV13(complaints),
        dispatches: complaints
          .map((cmp) => dispatchComplaintV13(cmp))
          .filter((d): d is NonNullable<typeof d> => d !== null),
        totalComplaints: complaints.length,
      }));
    },
  },
];
