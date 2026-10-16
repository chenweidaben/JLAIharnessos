/**
 * 健澜科技 jlmedaios - 生物样本库与科研数据 V5 纯函数单测（M269-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildBiobankV5Report,
  registerSampleV5,
  traceSampleV5,
} from "../../src/bff/aggregators/biobankV5ReportAggregator";

describe("registerSampleV5", () => {
  it("血液样本+知情同意+液氮 → 已登记位置液氮罐A区", () => {
    expect(registerSampleV5({ type: "血液", volume: 5, temp: "液氮" }, { id: "D123456", consent: true }).registered).toBe(true);
  });
});

describe("traceSampleV5", () => {
  it("有效样本ID → 找到溯源记录", () => {
    expect(traceSampleV5("BLOOD-1234-000001").found).toBe(true);
  });
});

describe("buildBiobankV5Report", () => {
  it("生成采集数据", () => {
    const r = buildBiobankV5Report("30d");
    expect(r.collection.blood).toBeGreaterThan(0);
  });

  it("生成存储数据", () => {
    const r = buildBiobankV5Report("30d");
    expect(r.storage.liquidNitrogen).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildBiobankV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
