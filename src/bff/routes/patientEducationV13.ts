/**
 * 健澜科技 jlmedaios - 健教材料推送 V13 路由（M326-D）
 *
 * GET /api/v1/patient-education-stats
 *
 * 权限：patient-education-stats:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeForwardRateV13,
  computeReadRateV13,
  countEducationByDiseaseV13,
  type EducationMaterialV13,
} from "../aggregators/patientEducationV13Aggregator.js";

const materials: EducationMaterialV13[] = [
  { disease: "高血压", isRead: true, isForwarded: true },
  { disease: "高血压", isRead: true, isForwarded: false },
  { disease: "高血压", isRead: true, isForwarded: false },
  { disease: "高血压", isRead: false, isForwarded: false },
  { disease: "糖尿病", isRead: true, isForwarded: true },
  { disease: "糖尿病", isRead: true, isForwarded: false },
  { disease: "糖尿病", isRead: false, isForwarded: false },
  { disease: "冠心病", isRead: true, isForwarded: false },
  { disease: "冠心病", isRead: true, isForwarded: false },
  { disease: "冠心病", isRead: false, isForwarded: false },
];

export const patientEducationV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-education-stats",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-education-stats:read");
      if (denied) return denied;
      return json(ok({
        diseaseDistribution: countEducationByDiseaseV13(materials),
        readRate: computeReadRateV13(materials),
        forwardRate: computeForwardRateV13(materials),
      }));
    },
  },
];
