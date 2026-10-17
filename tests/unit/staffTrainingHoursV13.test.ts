/**
 * 健澜科技 jlmedaios - 员工培训学时 V13 单测（M346-D，M346 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAvgAnnualHoursV13,
  computeExamPassRateV13,
  type StaffTrainingRecordV13,
} from "../../src/bff/aggregators/staffTrainingHoursV13Aggregator";
import { staffTrainingHoursV13Routes } from "../../src/bff/routes/staffTrainingHoursV13";

const records: StaffTrainingRecordV13[] = [
  { annualHours: 20, passedCount: 80, examinedCount: 100 },
  { annualHours: 30, passedCount: 90, examinedCount: 100 },
  { annualHours: 40, passedCount: 0, examinedCount: 0 },
];

describe("computeAvgAnnualHoursV13", () => {
  // 算式：(20+30+40)/3 = 90/3 = 30.0
  it("年度人均学时 = 30.0 小时", () => {
    expect(computeAvgAnnualHoursV13(records)).toBe(30.0);
  });
  it("空态 → 0", () => {
    expect(computeAvgAnnualHoursV13([])).toBe(0);
  });
});

describe("computeExamPassRateV13", () => {
  // 算式：(80+90)/(100+100) = 170/200×100 = 85.00
  it("考核合格率 = 85.00%", () => {
    expect(computeExamPassRateV13(records)).toBe(85.00);
  });
  // 边界：参考人数=0（第3条记录 examinedCount=0）
  // 算式：(0+0+0)/(0+0+0) = 0/0 → 0
  it("参考人数为 0 的边界 → 0", () => {
    const boundary: StaffTrainingRecordV13[] = [
      { annualHours: 10, passedCount: 0, examinedCount: 0 },
    ];
    expect(computeExamPassRateV13(boundary)).toBe(0);
  });
});

describe("staffTrainingHoursV13Routes 读路由", () => {
  it("GET /api/v1/staff-training-hours 路由存在且 auth:true", () => {
    const route = staffTrainingHoursV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/staff-training-hours",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
