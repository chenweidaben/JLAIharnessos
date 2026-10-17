/**
 * 健澜科技 jlmedaios - 培训管理（细节）V13 路由（M419-C，detail 避让旧版 talentTeamMgmtV13/academicLevelV13）
 *
 * GET /api/v1/training-mgmt-detail
 *
 * 权限：training-mgmt-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeContinuingEducationCreditComplianceRateV13,
  computeEmergencySkillTrainingPassRateV13,
  computeThreeBasicExamPassRateV13,
  type TrainingMgmtDetailRecordV13,
} from "../aggregators/trainingMgmtDetailV13Aggregator.js";

const records: TrainingMgmtDetailRecordV13[] = [
  { threeBasicPassed: 950, threeBasicTook: 1000, ceCreditMet: 980, ceCreditShould: 1000, emergencyPassed: 990, emergencyTrained: 1000 },
  { threeBasicPassed: 950, threeBasicTook: 1000, ceCreditMet: 980, ceCreditShould: 1000, emergencyPassed: 990, emergencyTrained: 1000 },
];

export const trainingMgmtDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/training-mgmt-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "training-mgmt-detail:read");
      if (denied) return denied;
      return json(ok({
        threeBasicExamPassRate: computeThreeBasicExamPassRateV13(records),
        continuingEducationCreditComplianceRate: computeContinuingEducationCreditComplianceRateV13(records),
        emergencySkillTrainingPassRate: computeEmergencySkillTrainingPassRateV13(records),
      }));
    },
  },
];
