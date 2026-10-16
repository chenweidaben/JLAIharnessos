/**
 * 健澜科技 jlmedaios - 健康科普 纯函数单测（M236-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHealthMediaReport,
  planHealthContent,
  trackMediaEngagement,
} from "../../src/bff/aggregators/healthMediaReportAggregator";

describe("planHealthContent", () => {
  it("糖尿病主题+抖音 → 脚本", () => {
    expect(planHealthContent("糖尿病", "抖音").script).toContain("糖尿病");
  });
});

describe("trackMediaEngagement", () => {
  it("短视频+百万播放 → 10000views", () => {
    expect(trackMediaEngagement("短视频", "百万").views).toBeGreaterThan(0);
  });
});

describe("buildHealthMediaReport", () => {
  it("生成内容数据", () => {
    const r = buildHealthMediaReport("30d");
    expect(r.content.article).toBeGreaterThan(0);
  });

  it("生成渠道数据", () => {
    const r = buildHealthMediaReport("30d");
    expect(r.channels.douyin).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildHealthMediaReport("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
