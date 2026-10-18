/**
 * 健澜科技 jlmedaios - 员工培训发展管理 V13 路由（M444-D，M444 收官，绩效薪酬与人力资源管理组）
 *
 * GET /api/v1/staff-training-development-mgmt
 *
 * 权限：staff-training-development-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeStaffTrainingDevelopmentExamPassRateV13,
  computeStaffTrainingDevelopmentPlanCompletionRateV13,
  computeStaffTrainingDevelopmentPromotionRateV13,
  type StaffTrainingDevelopmentMgmtRecordV13,
} from "../aggregators/staffTrainingDevelopmentMgmtV13Aggregator.js";

const records: StaffTrainingDevelopmentMgmtRecordV13[] = [
  { completedTraining: 950, plannedTraining: 1000, examPassed: 900, examReferenced: 1000, promoted: 980, eligible: 1000 },
  { completedTraining: 950, plannedTraining: 1000, examPassed: 900, examReferenced: 1000, promoted: 980, eligible: 1000 },
];

export const staffTrainingDevelopmentMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/staff-training-development-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "staff-training-development-mgmt:read");
      if (denied) return denied;
      return json(ok({
        staffTrainingDevelopmentPlanCompletionRate: computeStaffTrainingDevelopmentPlanCompletionRateV13(records),
        staffTrainingDevelopmentExamPassRate: computeStaffTrainingDevelopmentExamPassRateV13(records),
        staffTrainingDevelopmentPromotionRate: computeStaffTrainingDevelopmentPromotionRateV13(records),
      }));
    },
  },
];
