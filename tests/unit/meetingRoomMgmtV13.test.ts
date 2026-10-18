/**
 * 健澜科技 jlmedaios - 会议室管理 V13 单测（M437-D，M437 收官，后勤保障与环境管理深化组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMeetingRoomBookingTimelinessRateV13,
  computeMeetingRoomEquipmentCompletenessRateV13,
  computeMeetingRoomUtilizationRateV13,
  type MeetingRoomMgmtRecordV13,
} from "../../src/bff/aggregators/meetingRoomMgmtV13Aggregator";
import { meetingRoomMgmtV13Routes } from "../../src/bff/routes/meetingRoomMgmtV13";

const records: MeetingRoomMgmtRecordV13[] = [
  { usedHours: 750, availableHours: 1000, timelyBooking: 950, shouldBooking: 1000, intactEquipment: 980, totalEquipment: 1000 },
  { usedHours: 750, availableHours: 1000, timelyBooking: 950, shouldBooking: 1000, intactEquipment: 980, totalEquipment: 1000 },
];

describe("computeMeetingRoomUtilizationRateV13", () => {
  // 算式：(750+750)/(1000+1000)×100 = 1500/2000×100 = 75.00
  it("会议室使用率 = 75.00%", () => {
    expect(computeMeetingRoomUtilizationRateV13(records)).toBe(75.00);
  });
  it("空态 → 0", () => {
    expect(computeMeetingRoomUtilizationRateV13([])).toBe(0);
  });
});

describe("computeMeetingRoomBookingTimelinessRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("预订及时率 = 95.00%", () => {
    expect(computeMeetingRoomBookingTimelinessRateV13(records)).toBe(95.00);
  });
});

describe("computeMeetingRoomEquipmentCompletenessRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("设备完好率 = 98.00%", () => {
    expect(computeMeetingRoomEquipmentCompletenessRateV13(records)).toBe(98.00);
  });
});

describe("meetingRoomMgmtV13Routes 读路由", () => {
  it("GET /api/v1/meeting-room-mgmt 路由存在且 auth:true", () => {
    const route = meetingRoomMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/meeting-room-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
