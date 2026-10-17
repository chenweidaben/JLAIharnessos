/**
 * 健澜科技 jlmedaios - 人才团队管理 V13 路由（M403-B）
 *
 * GET /api/v1/talent-team-mgmt
 *
 * 权限：talent-team-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAcademicianAndMasterCountV13,
  computeDoctoralMasterSupervisorCountV13,
  computeHighLevelTalentIntroducedCountV13,
  type TalentTeamMgmtRecordV13,
} from "../aggregators/talentTeamMgmtV13Aggregator.js";

const records: TalentTeamMgmtRecordV13[] = [
  { academicianCount: 1, supervisorCount: 10, highLevelCount: 5 },
  { academicianCount: 1, supervisorCount: 10, highLevelCount: 5 },
];

export const talentTeamMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/talent-team-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "talent-team-mgmt:read");
      if (denied) return denied;
      return json(ok({
        academicianAndMasterCount: computeAcademicianAndMasterCountV13(records),
        doctoralMasterSupervisorCount: computeDoctoralMasterSupervisorCountV13(records),
        highLevelTalentIntroducedCount: computeHighLevelTalentIntroducedCountV13(records),
      }));
    },
  },
];
