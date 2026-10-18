/**
 * 健澜科技 jlmedaios - 会议室管理 V13 路由（M437-D，M437 收官，后勤保障与环境管理深化组）
 *
 * GET /api/v1/meeting-room-mgmt
 *
 * 权限：meeting-room-mgmt:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeMeetingRoomBookingTimelinessRateV13,
  computeMeetingRoomEquipmentCompletenessRateV13,
  computeMeetingRoomUtilizationRateV13,
  type MeetingRoomMgmtRecordV13,
} from "../aggregators/meetingRoomMgmtV13Aggregator.js";

const records: MeetingRoomMgmtRecordV13[] = [
  { usedHours: 750, availableHours: 1000, timelyBooking: 950, shouldBooking: 1000, intactEquipment: 980, totalEquipment: 1000 },
  { usedHours: 750, availableHours: 1000, timelyBooking: 950, shouldBooking: 1000, intactEquipment: 980, totalEquipment: 1000 },
];

export const meetingRoomMgmtV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/meeting-room-mgmt",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "meeting-room-mgmt:read");
      if (denied) return denied;
      return json(ok({
        meetingRoomUtilizationRate: computeMeetingRoomUtilizationRateV13(records),
        meetingRoomBookingTimelinessRate: computeMeetingRoomBookingTimelinessRateV13(records),
        meetingRoomEquipmentCompletenessRate: computeMeetingRoomEquipmentCompletenessRateV13(records),
      }));
    },
  },
];
