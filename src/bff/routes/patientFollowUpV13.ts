/**
 * 健澜科技 jlmedaios - 随访完成率 V13 路由（M326-C）
 *
 * GET /api/v1/patient-follow-up
 *
 * 权限：patient-follow-up:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  compute7DayFollowUpRateV13,
  compute30DayFollowUpRateV13,
  listIncompleteFollowUpsV13,
  type FollowUpRecordV13,
} from "../aggregators/patientFollowUpV13Aggregator.js";

const followUps: FollowUpRecordV13[] = [
  { patientName: "张三", completed7Day: true, completed30Day: true },
  { patientName: "李四", completed7Day: true, completed30Day: true },
  { patientName: "王五", completed7Day: true, completed30Day: true },
  { patientName: "赵六", completed7Day: true, completed30Day: true },
  { patientName: "钱七", completed7Day: true, completed30Day: true },
  { patientName: "孙八", completed7Day: true, completed30Day: true },
  { patientName: "周九", completed7Day: true, completed30Day: true },
  { patientName: "吴十", completed7Day: true, completed30Day: true },
  { patientName: "郑十一", completed7Day: false, completed30Day: true },
  { patientName: "王十二", completed7Day: false, completed30Day: false },
];

export const patientFollowUpV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/patient-follow-up",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "patient-follow-up:read");
      if (denied) return denied;
      return json(ok({
        rate7Day: compute7DayFollowUpRateV13(followUps),
        rate30Day: compute30DayFollowUpRateV13(followUps),
        incompleteList: listIncompleteFollowUpsV13(followUps),
      }));
    },
  },
];
