/**
 * 健澜科技 jlmedaios - 多渠道服务整合 V5 纯函数单测（M270-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOmnichannelV5Report,
  resolveByAIV5,
  routeServiceV5,
} from "../../src/bff/aggregators/omnichannelV5ReportAggregator";

describe("routeServiceV5", () => {
  it("意图预约挂号 → 路由到预约系统SLA60秒", () => {
    expect(routeServiceV5("小程序", "预约挂号").target).toBe("预约系统");
  });
});

describe("resolveByAIV5", () => {
  it("知识库匹配+置信度0.9 → AI已解决无需转人工", () => {
    expect(resolveByAIV5("如何挂号", { matched: true, confidence: 0.9 }).resolved).toBe(true);
  });
});

describe("buildOmnichannelV5Report", () => {
  it("生成线上渠道数据", () => {
    const r = buildOmnichannelV5Report("30d");
    expect(r.online.miniProgram).toBeGreaterThan(0);
  });

  it("生成线下渠道数据", () => {
    const r = buildOmnichannelV5Report("30d");
    expect(r.offline.window).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildOmnichannelV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
