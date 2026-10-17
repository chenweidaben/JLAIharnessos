/**
 * 健澜科技 jlmedaios - 护理管理 V13 单测（M376-D，M376 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBedNurseRatioV13,
  computeNursingTrainingCompletionRateV13,
  computeNursingUnitCountV13,
  type NursingManagementRecordV13,
} from "../../src/bff/aggregators/nursingManagementV13Aggregator";
import { nursingManagementV13Routes } from "../../src/bff/routes/nursingManagementV13";

const records: NursingManagementRecordV13[] = [
  { nursingUnitCount: 10, bedCount: 500, nurseCount: 200, shouldTrainCount: 100, trainCompleteCount: 95 },
  { nursingUnitCount: 10, bedCount: 500, nurseCount: 200, shouldTrainCount: 100, trainCompleteCount: 95 },
];

describe("computeNursingUnitCountV13", () => {
  // 算式：10+10 = 20
  it("护理单元数 = 20 个", () => {
    expect(computeNursingUnitCountV13(records)).toBe(20);
  });
  it("空态 → 0", () => {
    expect(computeNursingUnitCountV13([])).toBe(0);
  });
});

describe("computeBedNurseRatioV13", () => {
  // 算式：(200+200)/(500+500) = 400/1000 = 0.40
  it("床护比 = 0.40", () => {
    expect(computeBedNurseRatioV13(records)).toBe(0.40);
  });
});

describe("computeNursingTrainingCompletionRateV13", () => {
  // 算式：(95+95)/(100+100) = 190/200×100 = 95.00
  it("护理培训完成率 = 95.00%", () => {
    expect(computeNursingTrainingCompletionRateV13(records)).toBe(95.00);
  });
});

describe("nursingManagementV13Routes 读路由", () => {
  it("GET /api/v1/nursing-management 路由存在且 auth:true", () => {
    const route = nursingManagementV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-management",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
