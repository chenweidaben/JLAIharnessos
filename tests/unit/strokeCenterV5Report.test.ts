/**
 * 健澜科技 jlmedaios - 卒中中心智能化 V5 纯函数单测（M263-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStrokeCenterV5Report,
  scoreNIHSSV5,
  trackDNTV5,
} from "../../src/bff/aggregators/strokeCenterV5ReportAggregator";

describe("scoreNIHSSV5", () => {
  it("总分25 → 重度卒中监护", () => {
    expect(scoreNIHSSV5({ consciousness: 3, gaze: 2, visual: 3, motor: 10, language: 7 }).level).toBe("卒中监护");
  });
});

describe("trackDNTV5", () => {
  it("到门0分穿刺45分 → DNT 45分钟达标", () => {
    expect(trackDNTV5({ id: "p1" }, { door: 0, needle: 45, ct: 20 }).compliant).toBe(true);
  });
});

describe("buildStrokeCenterV5Report", () => {
  it("生成分诊数据", () => {
    const r = buildStrokeCenterV5Report("30d");
    expect(r.triage.fast).toBeGreaterThan(0);
  });

  it("生成溶栓数据", () => {
    const r = buildStrokeCenterV5Report("30d");
    expect(r.thrombolysis.dnt).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildStrokeCenterV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
