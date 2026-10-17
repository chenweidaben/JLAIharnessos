/**
 * 健澜科技 jlmedaios - 抗菌药物管理（细节）V13 路由（M414-C，detail 避让旧版 antibioticUseDensityV13）
 *
 * GET /api/v1/antibiotic-mgmt-detail
 *
 * 权限：antibiotic-mgmt-detail:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeAntibioticTherapeuticUseSubmissionRateV13,
  computeClassIIncisionProphylacticAntibioticPassRateV13,
  computeSpecialLevelAntibioticConsultationRateV13,
  type AntibioticMgmtDetailRecordV13,
} from "../aggregators/antibioticMgmtDetailV13Aggregator.js";

const records: AntibioticMgmtDetailRecordV13[] = [
  { consulted: 95, specialUseTotal: 100, submitted: 800, therapeuticTotal: 1000, qualified: 900, prophylacticTotal: 1000 },
  { consulted: 95, specialUseTotal: 100, submitted: 800, therapeuticTotal: 1000, qualified: 900, prophylacticTotal: 1000 },
];

export const antibioticMgmtDetailV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/antibiotic-mgmt-detail",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "antibiotic-mgmt-detail:read");
      if (denied) return denied;
      return json(ok({
        specialLevelAntibioticConsultationRate: computeSpecialLevelAntibioticConsultationRateV13(records),
        antibioticTherapeuticUseSubmissionRate: computeAntibioticTherapeuticUseSubmissionRateV13(records),
        classIIncisionProphylacticAntibioticPassRate: computeClassIIncisionProphylacticAntibioticPassRateV13(records),
      }));
    },
  },
];
