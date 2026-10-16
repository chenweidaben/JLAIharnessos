/**
 * 健澜科技 jlmedaios - 应急管理 V3 纯函数单测（M243-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessEmergencyReadinessV3,
  buildEmergencyMgmtV3Report,
  triageMassCasualtyV3,
} from "../../src/bff/aggregators/emergencyMgmtV3ReportAggregator";

describe("triageMassCasualtyV3", () => {
  it("危重20紧急50轻伤30死亡5 → 总105", () => {
    expect(triageMassCasualtyV3({ critical: 20, urgent: 50, minor: 30, deceased: 5 }).total).toBe(105);
  });
});

describe("assessEmergencyReadinessV3", () => {
  it("预案15演练6物资98% → 优秀", () => {
    expect(assessEmergencyReadinessV3(15, 6, { available: 98, total: 100 }).excellent).toBe(true);
  });
});

describe("buildEmergencyMgmtV3Report", () => {
  it("生成预案数据", () => {
    const r = buildEmergencyMgmtV3Report("30d");
    expect(r.plans.special).toBeGreaterThan(0);
  });

  it("生成指挥部数据", () => {
    const r = buildEmergencyMgmtV3Report("30d");
    expect(r.command.team).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildEmergencyMgmtV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
