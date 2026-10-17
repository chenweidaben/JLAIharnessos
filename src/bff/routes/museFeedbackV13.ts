/**
 * 健澜科技 jlmedaios - MUSE 建议采纳反馈 V13 路由（M319-B）
 *
 * GET /api/v1/muse-feedback?dept=
 *
 * 权限：muse-feedback:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  classifyFeedbackTypesV13,
  computeDoctorHitRateV13,
  flagLowHitRateDoctorsV13,
  type MuseFeedbackV13,
} from "../aggregators/museFeedbackV13Aggregator.js";

const feedbacks: MuseFeedbackV13[] = [
  { feedbackId: "f1", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f2", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f3", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f4", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f5", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f6", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f7", doctorId: "D01", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f8", doctorId: "D01", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f9", doctorId: "D01", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f10", doctorId: "D01", dept: "cardio", feedbackType: "error" },
  { feedbackId: "f11", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f12", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f13", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f14", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f15", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f16", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f17", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f18", doctorId: "D02", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f19", doctorId: "D02", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f20", doctorId: "D02", dept: "cardio", feedbackType: "error" },
  { feedbackId: "f21", doctorId: "D03", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f22", doctorId: "D03", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f23", doctorId: "D03", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f24", doctorId: "D03", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f25", doctorId: "D03", dept: "cardio", feedbackType: "adopt" },
  { feedbackId: "f26", doctorId: "D03", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f27", doctorId: "D03", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f28", doctorId: "D03", dept: "cardio", feedbackType: "ignore" },
  { feedbackId: "f29", doctorId: "D03", dept: "cardio", feedbackType: "error" },
  { feedbackId: "f30", doctorId: "D03", dept: "cardio", feedbackType: "error" },
];

export const museFeedbackV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-feedback",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-feedback:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const dept = url.searchParams.get("dept") ?? "cardio";
      const threshold = 60;
      const doctorRates = [
        { doctorId: "D01", hitRate: computeDoctorHitRateV13(feedbacks, "D01") },
        { doctorId: "D02", hitRate: computeDoctorHitRateV13(feedbacks, "D02") },
        { doctorId: "D03", hitRate: computeDoctorHitRateV13(feedbacks, "D03") },
      ];
      return json(ok({
        dept,
        threshold,
        doctorRates,
        feedbackClassification: classifyFeedbackTypesV13(feedbacks),
        lowHitRateDoctors: flagLowHitRateDoctorsV13(doctorRates, threshold),
      }));
    },
  },
];
