/**
 * 健澜科技 jlmedaios - 出生缺陷监测 V13 路由（M442-C，妇幼健康与计划生育管理组）
 *
 * GET /api/v1/birth-defect-monitoring
 *
 * 权限：birth-defect-monitoring:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeBirthDefectInterventionRateV13,
  computeBirthDefectPrenatalScreeningRateV13,
  computeBirthDefectRateV13,
  type BirthDefectMonitoringRecordV13,
} from "../aggregators/birthDefectMonitoringV13Aggregator.js";

const records: BirthDefectMonitoringRecordV13[] = [
  { birthDefectCount: 20, perinatalTotal: 10000, prenatalScreened: 950, totalMaternal: 1000, intervenedDefect: 850, totalDefect: 1000 },
  { birthDefectCount: 20, perinatalTotal: 10000, prenatalScreened: 950, totalMaternal: 1000, intervenedDefect: 850, totalDefect: 1000 },
];

export const birthDefectMonitoringV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/birth-defect-monitoring",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "birth-defect-monitoring:read");
      if (denied) return denied;
      return json(ok({
        birthDefectRate: computeBirthDefectRateV13(records),
        birthDefectPrenatalScreeningRate: computeBirthDefectPrenatalScreeningRateV13(records),
        birthDefectInterventionRate: computeBirthDefectInterventionRateV13(records),
      }));
    },
  },
];
