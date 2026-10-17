/**
 * 健澜科技 jlmedaios - 区域健康数据汇总 V13 路由（M324-A）
 *
 * GET /api/v1/regional-health-data
 *
 * 权限：regional-health-data:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  compareExamVolumeV13,
  compareInpatientVolumeV13,
  compareOutpatientVolumeV13,
  type RegionalHospitalV13,
} from "../aggregators/regionalHealthDataV13Aggregator.js";

const hospitals: RegionalHospitalV13[] = [
  { hospitalId: "h1", hospitalName: "浙大一院", outpatientVolume: 10000, inpatientVolume: 5000, examVolume: 8000 },
  { hospitalId: "h2", hospitalName: "浙大二院", outpatientVolume: 8000, inpatientVolume: 4000, examVolume: 6000 },
  { hospitalId: "h3", hospitalName: "省人民医院", outpatientVolume: 6000, inpatientVolume: 3000, examVolume: 4000 },
  { hospitalId: "h4", hospitalName: "市一医院", outpatientVolume: 4000, inpatientVolume: 2000, examVolume: 2000 },
  { hospitalId: "h5", hospitalName: "区中心医院", outpatientVolume: 2000, inpatientVolume: 1000, examVolume: 1000 },
];

export const regionalHealthDataV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/regional-health-data",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "regional-health-data:read");
      if (denied) return denied;
      return json(ok({
        outpatientComparison: compareOutpatientVolumeV13(hospitals),
        inpatientComparison: compareInpatientVolumeV13(hospitals),
        examComparison: compareExamVolumeV13(hospitals),
      }));
    },
  },
];
