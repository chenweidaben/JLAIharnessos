/**
 * 健澜科技 jlmedaios - 档案管理 V13 单测（M450-C，宣传与党建管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeArchiveDigitizationRateV13,
  computeArchiveIntegrityRateV13,
  computeArchiveTimelyFilingRateV13,
  type ArchiveMgmtRecordV13,
} from "../../src/bff/aggregators/archiveMgmtV13Aggregator";
import { archiveMgmtV13Routes } from "../../src/bff/routes/archiveMgmtV13";

const records: ArchiveMgmtRecordV13[] = [
  { timely: 950, shouldFiling: 1000, complete: 900, totalArchive: 1000, digitized: 980 },
  { timely: 950, shouldFiling: 1000, complete: 900, totalArchive: 1000, digitized: 980 },
];

describe("computeArchiveTimelyFilingRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("档案归档及时率 = 95.00%", () => {
    expect(computeArchiveTimelyFilingRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeArchiveTimelyFilingRateV13([])).toBe(0);
  });
});

describe("computeArchiveIntegrityRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("档案完整率 = 90.00%", () => {
    expect(computeArchiveIntegrityRateV13(records)).toBe(90.00);
  });
});

describe("computeArchiveDigitizationRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("档案数字化率 = 98.00%", () => {
    expect(computeArchiveDigitizationRateV13(records)).toBe(98.00);
  });
});

describe("archiveMgmtV13Routes 读路由", () => {
  it("GET /api/v1/archive-mgmt 路由存在且 auth:true", () => {
    const route = archiveMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/archive-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
