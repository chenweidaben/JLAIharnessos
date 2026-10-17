/**
 * 健澜科技 jlmedaios - 继续教育学分 V13 路由（M327-C）
 *
 * GET /api/v1/continuing-education
 *
 * 权限：continuing-education:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeDoctorCreditRateV13,
  countNationalProjectsV13,
  type EducationCreditV13,
} from "../aggregators/continuingEducationV13Aggregator.js";

const records: EducationCreditV13[] = [
  { doctorName: "张医生", isQualified: true, isNationalProject: true },
  { doctorName: "李医生", isQualified: true, isNationalProject: true },
  { doctorName: "王医生", isQualified: true, isNationalProject: true },
  { doctorName: "赵医生", isQualified: true, isNationalProject: false },
  { doctorName: "钱医生", isQualified: true, isNationalProject: false },
  { doctorName: "孙医生", isQualified: true, isNationalProject: false },
  { doctorName: "周医生", isQualified: true, isNationalProject: false },
  { doctorName: "吴医生", isQualified: true, isNationalProject: false },
  { doctorName: "郑医生", isQualified: false, isNationalProject: false },
  { doctorName: "王医生", isQualified: false, isNationalProject: false },
];

export const continuingEducationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/continuing-education",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "continuing-education:read");
      if (denied) return denied;
      return json(ok({
        creditRate: computeDoctorCreditRateV13(records),
        nationalProjects: countNationalProjectsV13(records),
      }));
    },
  },
];
