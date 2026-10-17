/**
 * 健澜科技 jlmedaios - 教学医院指标 V13 路由（M327-B）
 *
 * GET /api/v1/teaching-hospital
 *
 * 权限：teaching-hospital:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  countInternMentorsV13,
  countTeachingHoursV13,
  countTeachingRoundsV13,
  type TeachingRecordV13,
} from "../aggregators/teachingHospitalV13Aggregator.js";

const records: TeachingRecordV13[] = [
  { teacherName: "张教授", mentorCount: 2, teachingHours: 20, teachingRounds: 2 },
  { teacherName: "李教授", mentorCount: 3, teachingHours: 30, teachingRounds: 2 },
  { teacherName: "王教授", mentorCount: 1, teachingHours: 40, teachingRounds: 1 },
];

export const teachingHospitalV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/teaching-hospital",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "teaching-hospital:read");
      if (denied) return denied;
      return json(ok({
        internMentors: countInternMentorsV13(records),
        teachingHours: countTeachingHoursV13(records),
        teachingRounds: countTeachingRoundsV13(records),
      }));
    },
  },
];
