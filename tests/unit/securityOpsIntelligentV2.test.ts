/**
 * 健澜科技 jlmedaios - 安全运营智能化 V2 纯函数单测（M235-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessZeroTrust,
  buildSecurityOpsIntelligentV2,
  detectSecurityThreat,
} from "../../src/bff/aggregators/securityOpsIntelligentV2Aggregator";

describe("detectSecurityThreat", () => {
  it("暴力破解日志 → 高危威胁", () => {
    expect(detectSecurityThreat("暴力破解", "正常").threat).toBe(true);
  });
});

describe("assessZeroTrust", () => {
  it("正常身份+安全设备 → 通过", () => {
    expect(assessZeroTrust("合法", "安全", "机密").pass).toBe(true);
  });
});

describe("buildSecurityOpsIntelligentV2", () => {
  it("生成SIEM数据", () => {
    const r = buildSecurityOpsIntelligentV2("30d");
    expect(r.siem.logs).toBeGreaterThan(0);
  });

  it("生成SOC数据", () => {
    const r = buildSecurityOpsIntelligentV2("30d");
    expect(r.soc.incidents).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildSecurityOpsIntelligentV2("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
