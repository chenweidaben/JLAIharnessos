/**
 * 健澜科技 jlmedaios - 跨角色经验互鉴 V13 路由（M321-B）
 *
 * GET /api/v1/muse-cross-role-learning
 *
 * 权限：muse-cross-role-learning:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeCrossRoleClosureRateV13,
  countDoctorToNurseReferencesV13,
  countNurseToDoctorReferencesV13,
  type CrossRoleRecordV13,
} from "../aggregators/museCrossRoleLearningV13Aggregator.js";

const records: CrossRoleRecordV13[] = [
  { recordId: "r1", fromRole: "doctor", toRole: "nurse", isBidirectional: true },
  { recordId: "r2", fromRole: "doctor", toRole: "nurse", isBidirectional: true },
  { recordId: "r3", fromRole: "doctor", toRole: "nurse", isBidirectional: true },
  { recordId: "r4", fromRole: "doctor", toRole: "nurse", isBidirectional: true },
  { recordId: "r5", fromRole: "nurse", toRole: "doctor", isBidirectional: true },
  { recordId: "r6", fromRole: "nurse", toRole: "doctor", isBidirectional: true },
  { recordId: "r7", fromRole: "nurse", toRole: "doctor", isBidirectional: false },
  { recordId: "r8", fromRole: "doctor", toRole: "nurse", isBidirectional: false },
  { recordId: "r9", fromRole: "nurse", toRole: "doctor", isBidirectional: false },
  { recordId: "r10", fromRole: "doctor", toRole: "nurse", isBidirectional: false },
];

export const museCrossRoleLearningV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/muse-cross-role-learning",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "muse-cross-role-learning:read");
      if (denied) return denied;
      return json(ok({
        doctorToNurseRefs: countDoctorToNurseReferencesV13(records),
        nurseToDoctorRefs: countNurseToDoctorReferencesV13(records),
        closureRate: computeCrossRoleClosureRateV13(records),
      }));
    },
  },
];
