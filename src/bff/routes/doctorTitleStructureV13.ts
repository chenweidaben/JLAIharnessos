/**
 * 健澜科技 jlmedaios - 医师职称结构 V13 路由（M346-B）
 *
 * GET /api/v1/doctor-title-structure
 *
 * 权限：doctor-title-structure:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAssociateProfessorCountV13,
  computeAttendingCountV13,
  computeProfessorCountV13,
  computeResidentDoctorCountV13,
  type DoctorTitleRecordV13,
} from "../aggregators/doctorTitleStructureV13Aggregator.js";

const records: DoctorTitleRecordV13[] = [
  { professorCount: 2, associateProfessorCount: 5, attendingCount: 10, residentDoctorCount: 20 },
  { professorCount: 3, associateProfessorCount: 5, attendingCount: 10, residentDoctorCount: 20 },
];

export const doctorTitleStructureV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/doctor-title-structure",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "doctor-title-structure:read");
      if (denied) return denied;
      return json(ok({
        professorCount: computeProfessorCountV13(records),
        associateProfessorCount: computeAssociateProfessorCountV13(records),
        attendingCount: computeAttendingCountV13(records),
        residentDoctorCount: computeResidentDoctorCountV13(records),
      }));
    },
  },
];
