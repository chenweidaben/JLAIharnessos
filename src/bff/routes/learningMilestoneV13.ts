/**
 * 健澜科技 jlmedaios - 个人学习曲线里程碑 V13 路由（M309-D）
 *
 * GET /api/v1/learning-milestone?doctorId=
 *
 * 权限：learning-milestone:read。
 * query 一律 new URL(c.req.url).searchParams.get(...)。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  awardBadgeV13,
  buildDoctorBadgeBoardV13,
  evaluateLearningMilestoneV13,
  type DoctorMilestoneV13,
} from "../aggregators/learningMilestoneV13Aggregator.js";

const doctors: DoctorMilestoneV13[] = [
  { doctorId: "d1", name: "张医生", score: 85, badges: ["入门达成", "熟练达成", "精通达成"] },
  { doctorId: "d2", name: "李医生", score: 45, badges: ["入门达成", "熟练达成"] },
  { doctorId: "d3", name: "王医生", score: 20, badges: ["入门达成"] },
];

export const learningMilestoneV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/learning-milestone",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "learning-milestone:read");
      if (denied) return denied;
      const url = new URL(c.req.url);
      const doctorId = url.searchParams.get("doctorId");
      const scoped = doctorId ? doctors.filter((d) => d.doctorId === doctorId) : doctors;
      return json(ok({
        board: buildDoctorBadgeBoardV13(doctors).map((d) => ({
          ...d,
          milestone: evaluateLearningMilestoneV13(d.score),
        })),
        awarded: scoped.map((d) => ({
          doctorId: d.doctorId,
          badge: awardBadgeV13(d, evaluateLearningMilestoneV13(d.score)),
        })),
      }));
    },
  },
];
