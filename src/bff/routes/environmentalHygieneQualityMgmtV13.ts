/**
 * 健澜科技 jlmedaios - 环境卫生质量管理 V13 路由（M437-C，后勤保障与环境管理深化组）
 *
 * GET /api/v1/environmental-hygiene-quality-mgmt
 *
 * 权限：environmental-hygiene-quality-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeEnvironmentalHygieneCleaningQualifiedRateV13,
  computeEnvironmentalHygieneMonitoringQualifiedRateV13,
  computeEnvironmentalHygieneSatisfactionRateV13,
  type EnvironmentalHygieneQualityMgmtRecordV13,
} from "../aggregators/environmentalHygieneQualityMgmtV13Aggregator.js";

const records: EnvironmentalHygieneQualityMgmtRecordV13[] = [
  { qualifiedMonitoring: 980, totalMonitoring: 1000, qualifiedCleaning: 960, totalCleaning: 1000, satisfiedPatients: 920, surveyedPatients: 1000 },
  { qualifiedMonitoring: 980, totalMonitoring: 1000, qualifiedCleaning: 960, totalCleaning: 1000, satisfiedPatients: 920, surveyedPatients: 1000 },
];

export const environmentalHygieneQualityMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/environmental-hygiene-quality-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "environmental-hygiene-quality-mgmt:read");
      if (denied) return denied;
      return json(ok({
        environmentalHygieneMonitoringQualifiedRate: computeEnvironmentalHygieneMonitoringQualifiedRateV13(records),
        environmentalHygieneCleaningQualifiedRate: computeEnvironmentalHygieneCleaningQualifiedRateV13(records),
        environmentalHygieneSatisfactionRate: computeEnvironmentalHygieneSatisfactionRateV13(records),
      }));
    },
  },
];
