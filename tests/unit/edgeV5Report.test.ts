/**
 * 健澜科技 jlmedaios - 5G与边缘计算 V5 纯函数单测（M268-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assess5GQualityV5,
  build5GEdgeV5Report,
  scheduleRemoteSurgeryV5,
} from "../../src/bff/aggregators/edgeV5ReportAggregator";

describe("assess5GQualityV5", () => {
  it("时延20ms+带宽200Mbps+丢包0.1% → 100分A级适合远程手术", () => {
    expect(assess5GQualityV5(20, 200, 0.1).suitable).toBe(true);
  });
});

describe("scheduleRemoteSurgeryV5", () => {
  it("专家可用+手术室可用+设备5K → 已排程", () => {
    expect(scheduleRemoteSurgeryV5({ available: true, specialty: "微创" }, { available: true, equipment: "5K" }).scheduled).toBe(true);
  });
});

describe("build5GEdgeV5Report", () => {
  it("生成5G网络数据", () => {
    const r = build5GEdgeV5Report("30d");
    expect(r.g5Network.coverage).toBeGreaterThan(0);
  });

  it("生成远程手术数据", () => {
    const r = build5GEdgeV5Report("30d");
    expect(r.remoteSurgery.cases).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = build5GEdgeV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
