/**
 * 健澜科技 jlmedaios - 护理人员配置 V13 单测（M369-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBedNurseRatioV13,
  computeCollegeAboveNurseRatioV13,
  computeNurseTotalCountV13,
  type NursingStaffRecordV13,
} from "../../src/bff/aggregators/nursingStaffV13Aggregator";
import { nursingStaffV13Routes } from "../../src/bff/routes/nursingStaffV13";

const records: NursingStaffRecordV13[] = [
  { bedCount: 500, nurseCount: 200, collegeAboveCount: 160 },
  { bedCount: 500, nurseCount: 200, collegeAboveCount: 160 },
];

describe("computeBedNurseRatioV13", () => {
  // 算式：(200+200)/(500+500) = 400/1000 = 0.40
  it("床护比 = 0.40", () => {
    expect(computeBedNurseRatioV13(records)).toBe(0.40);
  });
  it("空态 → 0", () => {
    expect(computeBedNurseRatioV13([])).toBe(0);
  });
});

describe("computeNurseTotalCountV13", () => {
  // 算式：200+200 = 400
  it("护士总数 = 400", () => {
    expect(computeNurseTotalCountV13(records)).toBe(400);
  });
});

describe("computeCollegeAboveNurseRatioV13", () => {
  // 算式：(160+160)/(200+200) = 320/400×100 = 80.00
  it("大专以上护士占比 = 80.00%", () => {
    expect(computeCollegeAboveNurseRatioV13(records)).toBe(80.00);
  });
});

describe("nursingStaffV13Routes 读路由", () => {
  it("GET /api/v1/nursing-staff 路由存在且 auth:true", () => {
    const route = nursingStaffV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-staff",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
