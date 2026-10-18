/**
 * 健澜科技 jlmedaios - 门诊换药管理 V13 单测（M458-D，M458 收官，日间手术与门诊操作管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOutpatientDressingAverageMinutesV13,
  computeOutpatientDressingQualifiedRateV13,
  computeOutpatientDressingVisitCountV13,
  type OutpatientDressingMgmtRecordV13,
} from "../../src/bff/aggregators/outpatientDressingMgmtV13Aggregator";
import { outpatientDressingMgmtV13Routes } from "../../src/bff/routes/outpatientDressingMgmtV13";

const records: OutpatientDressingMgmtRecordV13[] = [
  { visitCount: 950, minutes: 15, qualified: 900, total: 1000 },
  { visitCount: 950, minutes: 15, qualified: 900, total: 1000 },
];

describe("computeOutpatientDressingVisitCountV13", () => {
  // 算式：950 + 950 = 1900（reduce 累加）
  it("换药人次 = 1900 人次（reduce 累加）", () => {
    expect(computeOutpatientDressingVisitCountV13(records)).toBe(1900);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientDressingVisitCountV13([])).toBe(0);
  });
});

describe("computeOutpatientDressingQualifiedRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("换药合格率 = 90.00%", () => {
    expect(computeOutpatientDressingQualifiedRateV13(records)).toBe(90.00);
  });
});

describe("computeOutpatientDressingAverageMinutesV13", () => {
  // 算式：(15+15)/2 = 15，Math.ceil(15) = 15（整分钟，不用 Math.ceil(avg*100)/100）
  it("换药平均时长 = 15 分钟（Math.ceil(avg) 整分钟）", () => {
    expect(computeOutpatientDressingAverageMinutesV13(records)).toBe(15);
  });
});

describe("outpatientDressingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-dressing-mgmt 路由存在且 auth:true", () => {
    const route = outpatientDressingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-dressing-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
