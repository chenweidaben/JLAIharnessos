/**
 * 健澜科技 jlmedaios - 质控管理 V13 单测（M419-D，M419 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeQualityControlGroupActivityRateV13,
  computeQualityIndicatorAchieveRateV13,
  computeQualityIssueRectificationRateV13,
  type QualityControlMgmtRecordV13,
} from "../../src/bff/aggregators/qualityControlMgmtV13Aggregator";
import { qualityControlMgmtV13Routes } from "../../src/bff/routes/qualityControlMgmtV13";

const records: QualityControlMgmtRecordV13[] = [
  { groupActivityDone: 95, groupActivityShould: 100, issueRectified: 98, issueTotal: 100, indicatorAchieved: 90, indicatorTotal: 100 },
  { groupActivityDone: 95, groupActivityShould: 100, issueRectified: 98, issueTotal: 100, indicatorAchieved: 90, indicatorTotal: 100 },
];

describe("computeQualityControlGroupActivityRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("质控小组活动完成率 = 95.00%", () => {
    expect(computeQualityControlGroupActivityRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeQualityControlGroupActivityRateV13([])).toBe(0);
  });
});

describe("computeQualityIssueRectificationRateV13", () => {
  // 算式：(98+98)/(100+100)×100 = 196/200×100 = 98.00
  it("质控问题整改率 = 98.00%", () => {
    expect(computeQualityIssueRectificationRateV13(records)).toBe(98.00);
  });
});

describe("computeQualityIndicatorAchieveRateV13", () => {
  // 算式：(90+90)/(100+100)×100 = 180/200×100 = 90.00
  it("质控指标达标率 = 90.00%", () => {
    expect(computeQualityIndicatorAchieveRateV13(records)).toBe(90.00);
  });
});

describe("qualityControlMgmtV13Routes 读路由", () => {
  it("GET /api/v1/quality-control-mgmt 路由存在且 auth:true", () => {
    const route = qualityControlMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/quality-control-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
