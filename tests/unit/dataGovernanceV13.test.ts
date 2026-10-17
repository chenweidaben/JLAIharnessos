/**
 * 健澜科技 jlmedaios - 数据治理成熟度 V13 单测（M323-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessDataQualityMaturityV13,
  assessDataSecurityMaturityV13,
  assessMasterDataMaturityV13,
  assessMetadataMaturityV13,
  type DataGovernanceItemV13,
} from "../../src/bff/aggregators/dataGovernanceV13Aggregator";
import { dataGovernanceV13Routes } from "../../src/bff/routes/dataGovernanceV13";

const items: DataGovernanceItemV13[] = [
  { dimension: "masterData", level: 3 },
  { dimension: "masterData", level: 3 },
  { dimension: "masterData", level: 3 },
  { dimension: "metadata", level: 3 },
  { dimension: "metadata", level: 3 },
  { dimension: "metadata", level: 3 },
  { dimension: "dataQuality", level: 2 },
  { dimension: "dataQuality", level: 2 },
  { dimension: "dataQuality", level: 2 },
  { dimension: "dataSecurity", level: 4 },
  { dimension: "dataSecurity", level: 4 },
  { dimension: "dataSecurity", level: 4 },
];

describe("assessMasterDataMaturityV13", () => {
  // 算式：(3+3+3)/3 = 3
  it("masterData level = 3", () => {
    expect(assessMasterDataMaturityV13(items)).toBe(3);
  });
  it("空态 → 1", () => {
    expect(assessMasterDataMaturityV13([])).toBe(1);
  });
});

describe("assessMetadataMaturityV13", () => {
  // 算式：(3+3+3)/3 = 3
  it("metadata level = 3", () => {
    expect(assessMetadataMaturityV13(items)).toBe(3);
  });
});

describe("assessDataQualityMaturityV13", () => {
  // 算式：(2+2+2)/3 = 2
  it("dataQuality level = 2", () => {
    expect(assessDataQualityMaturityV13(items)).toBe(2);
  });
});

describe("assessDataSecurityMaturityV13", () => {
  // 算式：(4+4+4)/3 = 4
  it("dataSecurity level = 4", () => {
    expect(assessDataSecurityMaturityV13(items)).toBe(4);
  });
});

describe("dataGovernanceV13Routes 读路由", () => {
  it("GET /api/v1/data-governance-maturity 路由存在且 auth:true", () => {
    const route = dataGovernanceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/data-governance-maturity",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
