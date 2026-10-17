/**
 * 健澜科技 jlmedaios - 医生显式反馈闭环 V13 路由（M301-A）
 *
 * POST /api/v1/feedback（auth 写）
 * GET  /api/v1/feedback-signal?experienceId=（auth 读）
 *
 * 权限：feedback:write / feedback-signal:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  collectDoctorFeedbackV13,
  computeFeedbackSignalV13,
  type DoctorFeedbackV13,
} from "../aggregators/doctorFeedbackV13Aggregator.js";

const store: DoctorFeedbackV13[] = [
  collectDoctorFeedbackV13("s-1", "d-1", "accepted", ""),
  collectDoctorFeedbackV13("s-2", "d-2", "accepted", ""),
  collectDoctorFeedbackV13("s-3", "d-3", "modified", "剂量调整"),
  collectDoctorFeedbackV13("s-4", "d-4", "modified", "时机推后"),
  collectDoctorFeedbackV13("s-5", "d-5", "rejected", "不符合本院"),
];

export const doctorFeedbackV13Routes: RouteDef[] = [
  {
    method: "POST",
    path: "/api/v1/feedback",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "feedback:write");
      if (denied) return denied;
      return json(ok({ recorded: true }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/feedback-signal",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "feedback-signal:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      void url.searchParams.get("experienceId");
      return json(ok(computeFeedbackSignalV13(store)));
    },
  },
];
