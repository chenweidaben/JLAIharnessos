/**
 * 健澜科技 jlmedaios - 相似医生协同推荐 V13 路由（M303-B）
 *
 * GET /api/v1/look-alike?doctorId=
 *
 * 权限：look-alike:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  borrowPreferenceV13,
  findLookAlikeDoctorsV13,
  type DoctorVectorV13,
} from "../aggregators/lookAlikeV13Aggregator.js";

const doctors: DoctorVectorV13[] = [
  { doctorId: "dr-new", vector: [0, 0, 0, 0] },
  { doctorId: "dr-zhang", vector: [4, 4, 4, 4] },
  { doctorId: "dr-li", vector: [-2, -2, -2, -2] },
  { doctorId: "dr-wang", vector: [3, 3, 2, 3] },
];

export const lookAlikeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/look-alike",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "look-alike:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const doctorId = url.searchParams.get("doctorId") ?? "dr-wang";
      const target = doctors.find((d) => d.doctorId === doctorId) ?? doctors[0];
      const lookAlikes = findLookAlikeDoctorsV13(target, doctors, 2);
      const borrowed = borrowPreferenceV13(
        target,
        doctors.filter((d) => lookAlikes.some((la) => la.doctorId === d.doctorId)),
      );
      return json(ok({ targetDoctorId: target.doctorId, lookAlikes, borrowedVector: borrowed }));
    },
  },
];
