/**
 * 健澜科技 jlmedaios - 多学科诊疗MDT管理 V13 路由（M459-D，M459 收官，医院运营与健康管理组）
 *
 * GET /api/v1/mdt-consultation-mgmt
 *
 * 权限：mdt-consultation-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMdtConsultationApplicationTimelyRateV13,
  computeMdtConsultationConductRateV13,
  computeMdtConsultationPlanExecutionRateV13,
  type MdtConsultationMgmtRecordV13,
} from "../aggregators/mdtConsultationMgmtV13Aggregator.js";

const records: MdtConsultationMgmtRecordV13[] = [
  { timely: 950, totalApply: 1000, conducted: 900, totalConduct: 1000, executed: 980, totalPlan: 1000 },
  { timely: 950, totalApply: 1000, conducted: 900, totalConduct: 1000, executed: 980, totalPlan: 1000 },
];

export const mdtConsultationMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/mdt-consultation-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "mdt-consultation-mgmt:read");
      if (denied) return denied;
      return json(ok({
        mdtConsultationApplicationTimelyRate: computeMdtConsultationApplicationTimelyRateV13(records),
        mdtConsultationConductRate: computeMdtConsultationConductRateV13(records),
        mdtConsultationPlanExecutionRate: computeMdtConsultationPlanExecutionRateV13(records),
      }));
    },
  },
];
