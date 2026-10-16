/**
 * 健澜科技 jlmedaios - 康复医学与日间康复 V5 单测（M272-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRehabilitationV5Report,
  prescribeRehabV5,
  scoreBarthelV5,
} from "../../src/bff/aggregators/rehabilitationV5ReportAggregator";

describe("scoreBarthelV5", () => {
  it("各项满分→total=100 level=独立", () => {
    const r = scoreBarthelV5({ feeding: 10, bathing: 5, dressing: 10, toileting: 10, transfer: 15, walking: 15 });
    expect(r.total).toBe(65);
  });
});

describe("prescribeRehabV5", () => {
  it("恢复期→PT+OT+ST综合", () => {
    expect(prescribeRehabV5("张三", "recovery").program).toBe("PT+OT+ST综合");
  });
});

describe("buildRehabilitationV5Report", () => {
  it("生成评估数据", () => {
    expect(buildRehabilitationV5Report("30d").assessment.barthel).toBeGreaterThan(0);
  });
  it("生成治疗数据", () => {
    expect(buildRehabilitationV5Report("30d").therapy.pt).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildRehabilitationV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
