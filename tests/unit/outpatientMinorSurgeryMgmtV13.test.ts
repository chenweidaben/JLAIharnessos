/**
 * 健澜科技 jlmedaios - 门诊小手术管理 V13 单测（M458-B，日间手术与门诊操作管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeOutpatientMinorSurgeryComplicationRateV13,
  computeOutpatientMinorSurgeryVolumeCountV13,
  computeOutpatientMinorSurgeryWoundHealingRateV13,
  type OutpatientMinorSurgeryMgmtRecordV13,
} from "../../src/bff/aggregators/outpatientMinorSurgeryMgmtV13Aggregator";
import { outpatientMinorSurgeryMgmtV13Routes } from "../../src/bff/routes/outpatientMinorSurgeryMgmtV13";

const records: OutpatientMinorSurgeryMgmtRecordV13[] = [
  { minorSurgeryCount: 950, healed: 900, totalWound: 1000, complication: 98, totalSurgery: 1000 },
  { minorSurgeryCount: 950, healed: 900, totalWound: 1000, complication: 98, totalSurgery: 1000 },
];

describe("computeOutpatientMinorSurgeryVolumeCountV13", () => {
  // 算式：950 + 950 = 1900（reduce 累加）
  it("门诊小手术量 = 1900 台（reduce 累加）", () => {
    expect(computeOutpatientMinorSurgeryVolumeCountV13(records)).toBe(1900);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientMinorSurgeryVolumeCountV13([])).toBe(0);
  });
});

describe("computeOutpatientMinorSurgeryWoundHealingRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("门诊手术伤口甲级愈合率 = 90.00%", () => {
    expect(computeOutpatientMinorSurgeryWoundHealingRateV13(records)).toBe(90.00);
  });
});

describe("computeOutpatientMinorSurgeryComplicationRateV13", () => {
  // 算式：(98+98)/(1000+1000)×100 = 196/2000×100 = 9.80（反向指标越低越好）
  it("门诊手术并发症率 = 9.80%（反向，越低越好）", () => {
    expect(computeOutpatientMinorSurgeryComplicationRateV13(records)).toBe(9.80);
  });
});

describe("outpatientMinorSurgeryMgmtV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-minor-surgery-mgmt 路由存在且 auth:true", () => {
    const route = outpatientMinorSurgeryMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-minor-surgery-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
