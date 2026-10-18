/**
 * 健澜科技 jlmedaios - 住院医师规范化培训 V13 路由（M443-A，教学科研与继续教育管理组）
 *
 * GET /api/v1/residency-training-mgmt
 *
 * 权限：residency-training-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeResidencyTrainingCoverageRateV13,
  computeResidencyTrainingFacultyQualifiedRateV13,
  computeResidencyTrainingGraduationPassRateV13,
  type ResidencyTrainingMgmtRecordV13,
} from "../aggregators/residencyTrainingMgmtV13Aggregator.js";

const records: ResidencyTrainingMgmtRecordV13[] = [
  { residencyTrained: 950, shouldTrained: 1000, graduationPassed: 900, graduationExam: 1000, facultyQualified: 980, totalFaculty: 1000 },
  { residencyTrained: 950, shouldTrained: 1000, graduationPassed: 900, graduationExam: 1000, facultyQualified: 980, totalFaculty: 1000 },
];

export const residencyTrainingMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/residency-training-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "residency-training-mgmt:read");
      if (denied) return denied;
      return json(ok({
        residencyTrainingCoverageRate: computeResidencyTrainingCoverageRateV13(records),
        residencyTrainingGraduationPassRate: computeResidencyTrainingGraduationPassRateV13(records),
        residencyTrainingFacultyQualifiedRate: computeResidencyTrainingFacultyQualifiedRateV13(records),
      }));
    },
  },
];
