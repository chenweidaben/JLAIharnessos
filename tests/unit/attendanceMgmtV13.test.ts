/**
 * 健澜科技 jlmedaios - 考勤管理 V13 单测（M402-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAttendanceRateV13,
  computeLateEarlyRateV13,
  computeOvertimeHoursV13,
  type AttendanceMgmtRecordV13,
} from "../../src/bff/aggregators/attendanceMgmtV13Aggregator";
import { attendanceMgmtV13Routes } from "../../src/bff/routes/attendanceMgmtV13";

const records: AttendanceMgmtRecordV13[] = [
  { attended: 980, total: 1000, lateEarly: 20, totalAttendance: 1000, overtime: 10 },
  { attended: 980, total: 1000, lateEarly: 20, totalAttendance: 1000, overtime: 10 },
];

describe("computeAttendanceRateV13", () => {
  // 算式：(980+980)/(1000+1000) = 1960/2000×100 = 98.00
  it("出勤率 = 98.00%", () => {
    expect(computeAttendanceRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeAttendanceRateV13([])).toBe(0);
  });
});

describe("computeLateEarlyRateV13", () => {
  // 算式：(20+20)/(1000+1000) = 40/2000×100 = 2.00
  it("迟到早退率 = 2.00%", () => {
    expect(computeLateEarlyRateV13(records)).toBe(2.00);
  });
});

describe("computeOvertimeHoursV13", () => {
  // 算式：10+10 = 20
  it("加班时长 = 20 小时", () => {
    expect(computeOvertimeHoursV13(records)).toBe(20);
  });
});

describe("attendanceMgmtV13Routes 读路由", () => {
  it("GET /api/v1/attendance-mgmt 路由存在且 auth:true", () => {
    const route = attendanceMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/attendance-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
