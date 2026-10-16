/**
 * 健澜科技 jlmedaios - 网络安全 V3 纯函数单测（M244-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessSecurityPostureV3,
  buildCybersecurityV3Report,
  handleSecurityIncidentV3,
} from "../../src/bff/aggregators/cybersecurityV3ReportAggregator";

describe("assessSecurityPostureV3", () => {
  it("四项均90 → 高级", () => {
    expect(assessSecurityPostureV3({ firewall: 90, edr: 90, patch: 90, audit: 90 }).level).toBe("高");
  });
});

describe("handleSecurityIncidentV3", () => {
  it("响应20分钟 → 已解决", () => {
    expect(handleSecurityIncidentV3({ type: "DDoS", severity: "高", responseTime: 20 }).resolved).toBe(true);
  });
});

describe("buildCybersecurityV3Report", () => {
  it("生成边界数据", () => {
    const r = buildCybersecurityV3Report("30d");
    expect(r.perimeter.firewall).toBeGreaterThan(0);
  });

  it("生成终端数据", () => {
    const r = buildCybersecurityV3Report("30d");
    expect(r.endpoint.edr).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildCybersecurityV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
