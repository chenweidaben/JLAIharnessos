/**
 * 健澜科技 jlmedaios - 科研平台管理 V13 单测（M456-D，M456 收官，学科建设与科研管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeResearchPlatformAcceptanceQualifiedRateV13,
  computeResearchPlatformEquipmentSharingRateV13,
  computeResearchPlatformLabOpenRateV13,
  type ResearchPlatformMgmtRecordV13,
} from "../../src/bff/aggregators/researchPlatformMgmtV13Aggregator";
import { researchPlatformMgmtV13Routes } from "../../src/bff/routes/researchPlatformMgmtV13";

const records: ResearchPlatformMgmtRecordV13[] = [
  { opened: 950, totalLab: 1000, shared: 900, totalEquipment: 1000, qualified: 980, totalAcceptance: 1000 },
  { opened: 950, totalLab: 1000, shared: 900, totalEquipment: 1000, qualified: 980, totalAcceptance: 1000 },
];

describe("computeResearchPlatformLabOpenRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("重点实验室开放率 = 95.00%", () => {
    expect(computeResearchPlatformLabOpenRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeResearchPlatformLabOpenRateV13([])).toBe(0);
  });
});

describe("computeResearchPlatformEquipmentSharingRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("科研设备共享率 = 90.00%", () => {
    expect(computeResearchPlatformEquipmentSharingRateV13(records)).toBe(90.00);
  });
});

describe("computeResearchPlatformAcceptanceQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("平台验收合格率 = 98.00%", () => {
    expect(computeResearchPlatformAcceptanceQualifiedRateV13(records)).toBe(98.00);
  });
});

describe("researchPlatformMgmtV13Routes 读路由", () => {
  it("GET /api/v1/research-platform-mgmt 路由存在且 auth:true", () => {
    const route = researchPlatformMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/research-platform-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
