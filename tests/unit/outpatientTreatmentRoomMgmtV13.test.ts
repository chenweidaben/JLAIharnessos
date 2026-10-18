/**
 * 健澜科技 jlmedaios - 门诊治疗室管理 V13 单测（M458-C，日间手术与门诊操作管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOutpatientTreatmentRoomDisinfectionQualifiedRateV13,
  computeOutpatientTreatmentRoomOperationQualifiedRateV13,
  computeOutpatientTreatmentRoomVisitCountV13,
  type OutpatientTreatmentRoomMgmtRecordV13,
} from "../../src/bff/aggregators/outpatientTreatmentRoomMgmtV13Aggregator";
import { outpatientTreatmentRoomMgmtV13Routes } from "../../src/bff/routes/outpatientTreatmentRoomMgmtV13";

const records: OutpatientTreatmentRoomMgmtRecordV13[] = [
  { visitCount: 950, qualified: 900, totalOp: 1000, disinfected: 980, totalDisinfection: 1000 },
  { visitCount: 950, qualified: 900, totalOp: 1000, disinfected: 980, totalDisinfection: 1000 },
];

describe("computeOutpatientTreatmentRoomVisitCountV13", () => {
  // 算式：950 + 950 = 1900（reduce 累加）
  it("治疗室人次 = 1900 人次（reduce 累加）", () => {
    expect(computeOutpatientTreatmentRoomVisitCountV13(records)).toBe(1900);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientTreatmentRoomVisitCountV13([])).toBe(0);
  });
});

describe("computeOutpatientTreatmentRoomOperationQualifiedRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("治疗操作合格率 = 90.00%", () => {
    expect(computeOutpatientTreatmentRoomOperationQualifiedRateV13(records)).toBe(90.00);
  });
});

describe("computeOutpatientTreatmentRoomDisinfectionQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("治疗室消毒合格率 = 98.00%", () => {
    expect(computeOutpatientTreatmentRoomDisinfectionQualifiedRateV13(records)).toBe(98.00);
  });
});

describe("outpatientTreatmentRoomMgmtV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-treatment-room-mgmt 路由存在且 auth:true", () => {
    const route = outpatientTreatmentRoomMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-treatment-room-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
