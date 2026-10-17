/**
 * 健澜科技 jlmedaios - 推送个人化学习 V13 路由（M303-A）
 *
 * GET /api/v1/doctor-preference?doctorId=
 *
 * 权限：doctor-preference:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildDoctorPreferenceV13,
  forgetStalePreferenceV13,
  personalizeRankV13,
  type DoctorEventV13,
  type ExperienceVectorV13,
} from "../aggregators/doctorPreferenceV13Aggregator.js";

const events: DoctorEventV13[] = [
  { dept: "cardio", disease: "afib", evidenceLevel: "strong", author: "dr-zhang", action: "adopted" },
  { dept: "cardio", disease: "afib", evidenceLevel: "strong", author: "dr-zhang", action: "clicked" },
  { dept: "surgery", disease: "postop", evidenceLevel: "weak", author: "dr-li", action: "dismissed" },
];

const expVector: ExperienceVectorV13 = {
  dept: "cardio",
  disease: "afib",
  evidenceLevel: "strong",
  author: "dr-zhang",
};

export const doctorPreferenceV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/doctor-preference",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "doctor-preference:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const doctorId = url.searchParams.get("doctorId") ?? "dr-001";
      void doctorId;
      const pref = buildDoctorPreferenceV13(events);
      const aged = forgetStalePreferenceV13(pref, 30);
      return json(ok({
        preference: pref,
        agedPreference: aged,
        personalizedScore: personalizeRankV13(18.79, pref, expVector),
      }));
    },
  },
];
