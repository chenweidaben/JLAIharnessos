/**
 * 健澜科技 jlmedaios - 护理 V4 纯函数单测（M252-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessNursingSensitivityV4,
  buildNursingV4Report,
  planNursingCareV4,
} from "../../src/bff/aggregators/nursingV4ReportAggregator";

describe("assessNursingSensitivityV4", () => {
  it("压疮>5 → 预警", () => {
    expect(assessNursingSensitivityV4({ pressure: 8, fall: 3, tube: 1, pain: 100 }).overall).toBe("预警");
  });
});

describe("planNursingCareV4", () => {
  it("特级+跌倒风险 → 每1小时+跌倒预防", () => {
    const r = planNursingCareV4({ level: "特级", age: 70, fallRisk: true });
    expect(r.frequency).toBe("每1小时");
    expect(r.care).toContain("跌倒预防");
  });
});

describe("buildNursingV4Report", () => {
  it("生成分级数据", () => {
    const r = buildNursingV4Report("30d");
    expect(r.level.special).toBeGreaterThan(0);
  });

  it("生成人力数据", () => {
    const r = buildNursingV4Report("30d");
    expect(r.staffing.bedRatio).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildNursingV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
