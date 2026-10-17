/**
 * 健澜科技 jlmedaios - 就医体验（等候时间）V13 路由（M365-D，M365 收官）
 *
 * GET /api/v1/experience-wait-time
 *
 * 权限：experience-wait-time:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeConsultationWaitTimeV13,
  computeExaminationWaitTimeV13,
  computeRegistrationWaitTimeV13,
  type ExperienceWaitTimeRecordV13,
} from "../aggregators/experienceWaitTimeV13Aggregator.js";

const records: ExperienceWaitTimeRecordV13[] = [
  { registrationWaitTime: 10, consultationWaitTime: 15, examinationWaitTime: 30 },
  { registrationWaitTime: 20, consultationWaitTime: 25, examinationWaitTime: 40 },
];

export const experienceWaitTimeV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/experience-wait-time",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "experience-wait-time:read");
      if (denied) return denied;
      return json(ok({
        registrationWaitTime: computeRegistrationWaitTimeV13(records),
        consultationWaitTime: computeConsultationWaitTimeV13(records),
        examinationWaitTime: computeExaminationWaitTimeV13(records),
      }));
    },
  },
];
