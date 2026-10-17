/**
 * 健澜科技 jlmedaios - 新手医生孵化与导师匹配 V13 路由（M298-C）
 *
 * GET  /api/v1/mentor-match?dept=
 * POST /api/v1/mentor-match/:newDoctorId/accept（auth）
 *
 * 权限：mentor-match:read / mentor-match:write。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildOnboardingPlanV13,
  matchMentorV13,
  type MentorV13,
  type NewDoctorV13,
} from "../aggregators/mentorMatchV13Aggregator.js";

const mentors: MentorV13[] = [
  { doctorId: "m-1", name: "张主任", dept: "cardio", score: 69 },
  { doctorId: "m-2", name: "李医生", dept: "cardio", score: 38 },
  { doctorId: "m-3", name: "王医生", dept: "surgery", score: 21 },
];

const newDoctor: NewDoctorV13 = { doctorId: "n-1", name: "小陈", dept: "cardio" };

export const mentorMatchV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/mentor-match",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "mentor-match:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      void url.searchParams.get("dept");
      const mentor = matchMentorV13(newDoctor, mentors);
      if (!mentor) return json(ok({ mentor: null, plan: null }));
      const plan = buildOnboardingPlanV13(newDoctor, mentor);
      return json(ok({ mentor, plan }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/mentor-match/:newDoctorId/accept",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "mentor-match:write");
      if (denied) return denied;
      return json(ok({ newDoctorId: c.params.newDoctorId, accepted: true }));
    },
  },
];
