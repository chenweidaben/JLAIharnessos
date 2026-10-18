/**
 * 健澜科技 jlmedaios - 健康宣教管理（统计视角）V13 路由（M457-C，医院文化与公益管理组）
 *
 * GET /api/v1/health-education-stats-mgmt
 *
 * 避让说明：基础名 healthEducationMgmtV13 已被早期切片占用，本切片改用 -stats 维度后缀避让。
 *
 * 权限：health-education-stats-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeHealthEducationStatsConsultationCountV13,
  computeHealthEducationStatsLectureCountV13,
  computeHealthEducationStatsMaterialDistributionCountV13,
  type HealthEducationStatsMgmtRecordV13,
} from "../aggregators/healthEducationStatsMgmtV13Aggregator.js";

const records: HealthEducationStatsMgmtRecordV13[] = [
  { lectureCount: 950, materialCount: 900, consultationCount: 980 },
  { lectureCount: 950, materialCount: 900, consultationCount: 980 },
];

export const healthEducationStatsMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/health-education-stats-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "health-education-stats-mgmt:read");
      if (denied) return denied;
      return json(ok({
        healthEducationStatsLectureCount: computeHealthEducationStatsLectureCountV13(records),
        healthEducationStatsMaterialDistributionCount: computeHealthEducationStatsMaterialDistributionCountV13(records),
        healthEducationStatsConsultationCount: computeHealthEducationStatsConsultationCountV13(records),
      }));
    },
  },
];
