/**
 * 健澜科技 jlmedaios - 基层医疗协同 V13 路由（M324-B）
 *
 * GET /api/v1/grassroots-medical
 *
 * 权限：grassroots-medical:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  countDownwardReferralsV13,
  countUpwardReferralsV13,
  computeGrassrootsRatioV13,
  type ReferralRecordV13,
} from "../aggregators/grassrootsMedicalV13Aggregator.js";

const referrals: ReferralRecordV13[] = [
  { referralType: "upward" },
  { referralType: "upward" },
  { referralType: "upward" },
  { referralType: "downward" },
  { referralType: "downward" },
];

const totalVisits = 10000;
const grassrootsVisits = 2000;

export const grassrootsMedicalV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/grassroots-medical",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "grassroots-medical:read");
      if (denied) return denied;
      return json(ok({
        upwardReferrals: countUpwardReferralsV13(referrals),
        downwardReferrals: countDownwardReferralsV13(referrals),
        grassrootsRatio: computeGrassrootsRatioV13(totalVisits, grassrootsVisits),
      }));
    },
  },
];
