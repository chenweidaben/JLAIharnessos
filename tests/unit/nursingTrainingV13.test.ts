/**
 * 健澜科技 jlmedaios - 护理培训 V13 单测（M369-D，M369 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNursingTrainingCountV13,
  computeNursingTrainingParticipantCountV13,
  computeNursingTrainingPassRateV13,
  type NursingTrainingRecordV13,
} from "../../src/bff/aggregators/nursingTrainingV13Aggregator";
import { nursingTrainingV13Routes } from "../../src/bff/routes/nursingTrainingV13";

const records: NursingTrainingRecordV13[] = [
  { trainingCount: 5, participantCount: 200, examTake: 200, examPass: 180 },
  { trainingCount: 5, participantCount: 200, examTake: 200, examPass: 180 },
];

describe("computeNursingTrainingCountV13", () => {
  // 算式：5+5 = 10
  it("培训次数 = 10", () => {
    expect(computeNursingTrainingCountV13(records)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(computeNursingTrainingCountV13([])).toBe(0);
  });
});

describe("computeNursingTrainingParticipantCountV13", () => {
  // 算式：200+200 = 400
  it("培训人次 = 400", () => {
    expect(computeNursingTrainingParticipantCountV13(records)).toBe(400);
  });
});

describe("computeNursingTrainingPassRateV13", () => {
  // 算式：(180+180)/(200+200) = 360/400×100 = 90.00
  it("考核合格率 = 90.00%", () => {
    expect(computeNursingTrainingPassRateV13(records)).toBe(90.00);
  });
});

describe("nursingTrainingV13Routes 读路由", () => {
  it("GET /api/v1/nursing-training 路由存在且 auth:true", () => {
    const route = nursingTrainingV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-training",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
